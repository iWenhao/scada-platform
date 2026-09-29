// SCADA Platform 存储后端
// 键值存储 + 轻量时序历史 + 账号/会话鉴权 + 服务端审计。
// 数据目录 DATA_DIR 下 JSON/JSONL 文件，无第三方依赖。
//
// 隔离约定：KV 与历史按登录用户分命名空间 `u/<userId>/`，
// 同一 key 在不同账号下互不可见（工程/模板/草稿隔离）。
// 用户表/会话/通知配置/审计为全局文件（`_users.json` 等）。
//
// 启动: node server/index.mjs   (或 pnpm server)
// 环境变量(均可选, 见 .env.example):
//   PORT, DATA_DIR, MAX_BODY_BYTES, CORS_ORIGIN,
//   AUTH_TOKEN        可选「服务主密钥」，持有者拥有全部权限（探针/CI）
//   HISTORY_RETENTION_DAYS
//
// 接口(除 health/login 外需 Authorization: Bearer <会话token> 或 AUTH_TOKEN):
//   GET    /api/health
//   POST   /api/auth/login          {username,password} -> {token,user}
//   POST   /api/auth/logout
//   GET    /api/auth/me
//   POST   /api/auth/password       {oldPassword,newPassword}
//   GET    /api/auth/users          (admin)
//   POST   /api/auth/users          (admin) {username,displayName,role,password}
//   PATCH  /api/auth/users          (admin) {id,displayName?,role?,password?}
//   DELETE /api/auth/users?id=      (admin)
//   GET    /api/keys | /api/storage/keys
//   GET    /api/storage/get?key=
//   PUT    /api/storage/set?key=    (engineer+)
//   DELETE /api/storage/remove?key= (engineer+)
//   POST   /api/history/write       (operator+)
//   GET    /api/history/query
//   POST   /api/audit               {deviceId,variable,value,ok,error?} 操作者由会话注入
//   GET    /api/audit?limit=        (engineer+)
import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAuthStore, roleAtLeast } from './auth.mjs'
import {
  loadNotifyConfig,
  saveNotifyConfig,
  dispatchNotification,
  sendToChannel,
  readNotifyLog,
  clearNotifyLog,
  appendNotifyLog,
} from './notify.mjs'

// ---- 路径与环境 ----

/** 当前文件所在目录（ESM 下用 fileURLToPath 还原 __dirname） */
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 数据目录：可用 DATA_DIR 覆盖；默认 <server>/data（容器部署时挂卷） */
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
/** 时序历史分片目录 */
const HISTORY_DIR = path.join(DATA_DIR, 'history')
/** 写值/系统审计日志（JSONL） */
const AUDIT_FILE = path.join(DATA_DIR, '_audit.jsonl')

const PORT = Number(process.env.PORT || 5174)
/** 单次请求体上限（字节），超出返回 413 */
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 20 * 1024 * 1024)
/** 允许的跨域来源，逗号分隔；默认 *（仅建议内网） */
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').trim()
/** 可选服务主密钥：持有者拥有全部权限，用于探针/CI */
const AUTH_TOKEN = (process.env.AUTH_TOKEN || '').trim()
/** 历史数据保留天数，超期分片每日清理 */
const RETENTION_DAYS = Number(process.env.HISTORY_RETENTION_DAYS || 30)
/** 审计内存/接口返回条数上限 */
const AUDIT_MAX = 500

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'content-type, authorization'

/** 账号/会话服务 */
const auth = createAuthStore(DATA_DIR)
/** 通知节流：channelId -> 上次发送时间戳 */
const notifyLastSent = new Map()

// ---- 键值存储辅助（按用户隔离）----

/**
 * 当前请求的存储命名空间。
 * 普通会话：`u/<userId>/`；服务主密钥：`u/service/`。
 * 同一 key 在不同用户下互不可见，实现工程/模板隔离。
 */
function scopeOf(authn) {
  if (!authn) return 'u/anonymous/'
  if (authn.master) return 'u/service/'
  return `u/${encodeURIComponent(authn.user.id)}/`
}

/**
 * 键名 → 安全文件路径（含用户命名空间）。
 * encodeURIComponent 防止 key 里的 `../` 造成路径穿越。
 */
function fileFor(key, scope) {
  return path.join(DATA_DIR, scope, encodeURIComponent(key) + '.json')
}

/** 某用户的 KV 数据子目录 */
function scopeDir(scope) {
  return path.join(DATA_DIR, scope)
}

/** 历史分片目录（按用户隔离） */
function historyDirFor(scope) {
  return path.join(HISTORY_DIR, scope.replace(/\/+$/, ''))
}

// ---- 时序历史（按天分片 JSONL）----
// 每个 key 一天一个文件：`<key>.<YYYYMMDD>.jsonl`，每行 {t,v}。
// 按天分片的好处：「最近几小时」这类查询只触碰少量小文件。

/** 时间戳 → `YYYYMMDD` 分片名 */
function dayString(ms) {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}${mm}${dd}`
}

/** 某 key 某天的分片文件路径（dir 为该用户的历史目录） */
function shardFile(dir, key, day) {
  return path.join(dir, `${encodeURIComponent(key)}.${day}.jsonl`)
}

/** 判断目录项是否属于指定 key 的历史分片 */
function isHistoryShard(fileName, encodedKey) {
  return fileName.startsWith(encodedKey + '.') && fileName.endsWith('.jsonl')
}

/**
 * 按天分组追加采样。非法点（t/v 非有限数）跳过。
 * @returns {Promise<number>} 实际写入的点数
 */
/**
 * 按天分组追加采样到指定用户的历史目录。
 * @returns {Promise<number>} 实际写入的点数
 */
async function appendSamples(historyDir, key, samples) {
  const byDay = new Map()
  let count = 0
  for (const s of samples) {
    if (typeof s?.t !== 'number' || typeof s?.v !== 'number' || !Number.isFinite(s.t) || !Number.isFinite(s.v)) continue
    const day = dayString(s.t)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(`${JSON.stringify({ t: Math.round(s.t), v: s.v })}\n`)
    count++
  }
  if (count === 0) return 0
  await fs.mkdir(historyDir, { recursive: true })
  for (const [day, lines] of byDay) {
    await fs.appendFile(shardFile(historyDir, key, day), lines.join(''), 'utf8')
  }
  return count
}

/**
 * 查询 [from, to] 区间采样（仅该用户命名空间）。
 * @returns {Promise<Array<{t: number, v: number}>>}
 */
async function querySamples(historyDir, key, from, to, maxPoints) {
  const encodedKey = encodeURIComponent(key)
  let files = []
  try {
    files = await fs.readdir(historyDir)
  } catch {
    return []
  }

  const shards = files
    .filter(f => isHistoryShard(f, encodedKey))
    .map(f => {
      const day = f.slice(encodedKey.length + 1, -'.jsonl'.length)
      return { file: path.join(historyDir, f), day }
    })
    .filter(({ day }) => {
      if (!/^\d{8}$/.test(day)) return false
      const dayStart = new Date(
        Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8)),
      ).getTime()
      const dayEnd = dayStart + 24 * 3600 * 1000
      return dayEnd >= from && dayStart <= to
    })
    .sort((a, b) => (a.day < b.day ? -1 : 1))

  const points = []
  for (const { file } of shards) {
    let text
    try {
      text = await fs.readFile(file, 'utf8')
    } catch {
      continue
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        const p = JSON.parse(line)
        if (typeof p.t === 'number' && typeof p.v === 'number' && p.t >= from && p.t <= to) {
          points.push(p)
        }
      } catch {
        // 损坏行跳过
      }
    }
  }

  points.sort((a, b) => a.t - b.t)
  return points
}

/**
 * 按时间窗口聚合采样（min/avg/max），用于长时间跨度的趋势查询：
 * 7 天的 1 秒采样有 60 万点，不聚合的话传输与绘制都不现实。
 * 每个窗口输出一个点，时间戳取窗口起点。
 * @param {Array<{t:number,v:number}>} points 已按时间升序的点集
 * @param {string} agg 'min' | 'avg' | 'max'；空值跳过聚合
 * @param {number} window 窗口宽度（毫秒）
 */
function aggregatePoints(points, agg, window) {
  if (!agg || !window || window <= 0) return points
  if (!['min', 'avg', 'max'].includes(agg)) return points

  const buckets = new Map()
  for (const p of points) {
    const start = Math.floor(p.t / window) * window
    if (!buckets.has(start)) buckets.set(start, [])
    buckets.get(start).push(p.v)
  }

  const round4 = v => Math.round(v * 10000) / 10000
  const result = []
  for (const [start, values] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    const v = agg === 'min'
      ? Math.min(...values)
      : agg === 'max'
        ? Math.max(...values)
        : values.reduce((s, x) => s + x, 0) / values.length
    result.push({ t: start, v: round4(v) })
  }
  return result
}

/** 抽稀到 maxPoints（保留首尾），超过时按间隔取样 */
function downsamplePoints(points, maxPoints) {
  if (maxPoints > 0 && points.length > maxPoints) {
    const step = (points.length - 1) / (maxPoints - 1)
    const sampled = []
    for (let i = 0; i < maxPoints; i++) sampled.push(points[Math.round(i * step)])
    return sampled
  }
  return points
}

/**
 * 清理所有用户目录下超过保留期的分片。
 * @returns {Promise<number>} 删除的文件数
 */
async function cleanupExpiredShards() {
  if (RETENTION_DAYS <= 0) return 0
  let userDirs = []
  try {
    userDirs = await fs.readdir(HISTORY_DIR, { withFileTypes: true })
  } catch {
    return 0
  }
  const expireDay = dayString(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000)
  let removed = 0
  for (const d of userDirs) {
    if (!d.isDirectory()) continue
    const dir = path.join(HISTORY_DIR, d.name)
    let files
    try {
      files = await fs.readdir(dir)
    } catch {
      continue
    }
    for (const f of files) {
      const m = f.match(/\.(\d{8})\.jsonl$/)
      if (m && m[1] < expireDay) {
        await fs.rm(path.join(dir, f), { force: true })
        removed++
      }
    }
  }
  return removed
}

// ---- 审计（服务端留痕，操作者从会话取）----
/**
 * 追加一条审计记录到 _audit.jsonl。
 * 操作者由调用方传入（路由层从会话取，防止前端伪造）。
 */
async function appendAudit(entry) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.appendFile(AUDIT_FILE, JSON.stringify(entry) + '\n', 'utf8')
}

/**
 * 读取最近 limit 条审计（新→旧）。
 * 坏行跳过，文件不存在返回空数组。
 */
async function readAudit(limit = 100) {
  try {
    const text = await fs.readFile(AUDIT_FILE, 'utf8')
    const rows = []
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        rows.push(JSON.parse(line))
      } catch {
        // skip
      }
    }
    return rows.slice(-limit).reverse()
  } catch {
    return []
  }
}

/**
 * 构造 CORS 响应头。
 * CORS_ORIGIN=* 时放行任意来源；否则只回显白名单内的 Origin。
 */
function corsHeaders(req) {
  const requestOrigin = req.headers.origin
  if (CORS_ORIGIN === '*') {
    return {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': ALLOWED_HEADERS,
      'access-control-allow-methods': ALLOWED_METHODS,
    }
  }
  const allowed = CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  const allowOrigin =
    requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : (allowed[0] || '')
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-headers': ALLOWED_HEADERS,
    'access-control-allow-methods': ALLOWED_METHODS,
    vary: 'Origin',
  }
}

/** 发送 JSON 响应（自动附带 CORS 头） */
function sendJson(res, req, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    ...corsHeaders(req),
  })
  res.end(JSON.stringify(body))
}

/** 从 Authorization 头取出 Bearer token（无则空串） */
function bearer(req) {
  const h = req.headers.authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}

/**
 * 鉴权：服务主密钥 AUTH_TOKEN 或用户会话。
 * 返回 { user, master } 或 null。
 */
function authenticate(req) {
  const token = bearer(req)
  if (!token) return null
  if (AUTH_TOKEN && token === AUTH_TOKEN) {
    return { user: null, master: true }
  }
  const user = auth.resolveToken(token)
  return user ? { user, master: false } : null
}

/**
 * 角色门禁。master（服务主密钥）视为最高权限。
 * @param {{ user: object|null, master: boolean } | null} authn authenticate() 的返回值
 * @param {string} minRole 最低角色
 */
function requireRole(authn, minRole) {
  if (!authn) return false
  if (authn.master) return true
  return roleAtLeast(authn.user.role, minRole)
}

/**
 * 读取请求体为字符串；超过 limit 抛 status=413。
 * @param {number} limit 字节上限
 */
async function readBody(req, limit) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) {
      const err = new Error('payload too large')
      err.status = 413
      throw err
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

// ---- HTTP 路由 ----
// 路由约定：health/login 公开；其余需 Bearer 会话或 AUTH_TOKEN。
const server = createServer(async (req, res) => {
  // CORS 预检：不鉴权，直接放行
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req))
    res.end()
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  try {
    // ---------- 公开接口 ----------
    if (url.pathname === '/api/health') {
      sendJson(res, req, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req, 64 * 1024)
      let payload
      try {
        payload = JSON.parse(body)
      } catch {
        return sendJson(res, req, 400, { error: 'invalid json' })
      }
      const result = await auth.login(payload?.username, payload?.password)
      if (!result) {
        return sendJson(res, req, 401, { error: '用户名或口令错误' })
      }
      sendJson(res, req, 200, result)
      return
    }

    // ---------- 以下均需鉴权 ----------
    const authn = authenticate(req)
    if (!authn) {
      sendJson(res, req, 401, { error: 'unauthorized' })
      return
    }

    // 会话：注销 / 当前用户 / 自助改口令

    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      await auth.logout(bearer(req))
      sendJson(res, req, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      if (authn.master) {
        return sendJson(res, req, 200, {
          user: { id: 'master', username: 'service', displayName: '服务密钥', role: 'admin' },
        })
      }
      return sendJson(res, req, 200, { user: authn.user })
    }

    if (url.pathname === '/api/auth/password' && req.method === 'POST') {
      if (authn.master) return sendJson(res, req, 400, { error: 'master token has no password' })
      const body = await readBody(req, 64 * 1024)
      let payload
      try {
        payload = JSON.parse(body)
      } catch {
        return sendJson(res, req, 400, { error: 'invalid json' })
      }
      const result = await auth.changeOwnPassword(
        authn.user.id,
        payload?.oldPassword,
        payload?.newPassword,
      )
      return sendJson(res, req, result.ok ? 200 : 400, result)
    }

    // ---------- 用户管理（admin）----------
    if (url.pathname === '/api/auth/users') {
      if (!requireRole(authn, 'admin')) {
        return sendJson(res, req, 403, { error: 'forbidden' })
      }
      if (req.method === 'GET') {
        return sendJson(res, req, 200, { users: auth.listUsers() })
      }
      if (req.method === 'POST') {
        const body = await readBody(req, 64 * 1024)
        const payload = JSON.parse(body)
        const result = await auth.createUser(payload)
        return sendJson(res, req, result.error ? 400 : 200, result)
      }
      if (req.method === 'PATCH') {
        const body = await readBody(req, 64 * 1024)
        const payload = JSON.parse(body)
        if (!payload?.id) return sendJson(res, req, 400, { error: 'missing id' })
        const result = await auth.updateUser(payload.id, payload)
        return sendJson(res, req, result.error ? 400 : 200, result)
      }
      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id')
        if (!id) return sendJson(res, req, 400, { error: 'missing id' })
        const result = await auth.removeUser(id)
        return sendJson(res, req, result.error ? 400 : 200, result)
      }
    }

    // ---------- 通知通道配置 / 测试 / 发送 ----------
    // 通知通道配置（密钥只存服务端）：读改需 engineer+；测试发送也需 engineer+
    if (url.pathname === '/api/notify/channels') {
      if (!requireRole(authn, 'engineer')) {
        return sendJson(res, req, 403, { error: 'forbidden' })
      }
      if (req.method === 'GET') {
        return sendJson(res, req, 200, await loadNotifyConfig(DATA_DIR))
      }
      if (req.method === 'PUT') {
        const body = await readBody(req, 512 * 1024)
        const payload = JSON.parse(body)
        const saved = await saveNotifyConfig(DATA_DIR, payload)
        return sendJson(res, req, 200, saved)
      }
    }

    if (url.pathname === '/api/notify/test' && req.method === 'POST') {
      if (!requireRole(authn, 'engineer')) {
        return sendJson(res, req, 403, { error: 'forbidden' })
      }
      const body = await readBody(req, 64 * 1024)
      const payload = JSON.parse(body)
      const config = await loadNotifyConfig(DATA_DIR)
      const channel = payload?.id
        ? config.channels.find(c => c.id === payload.id)
        : payload?.channel
      if (!channel) return sendJson(res, req, 400, { error: 'channel not found' })
      const result = await sendToChannel(channel, {
        kind: 'active',
        level: 'warning',
        title: '【测试】SCADA 通知通道',
        message: `通道「${channel.name}」连通性测试成功。`,
        time: Date.now(),
        timeText: new Date().toLocaleString('zh-CN'),
      })
      await appendNotifyLog(DATA_DIR, {
        kind: 'active',
        level: 'warning',
        title: '【测试】SCADA 通知通道',
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        ok: result.ok,
        error: result.error,
        note: '连通性测试',
      })
      return sendJson(res, req, result.ok ? 200 : 502, { ...result, id: channel.id, name: channel.name })
    }

    // 通知发送记录
    if (url.pathname === '/api/notify/log') {
      if (!requireRole(authn, 'engineer')) {
        return sendJson(res, req, 403, { error: 'forbidden' })
      }
      if (req.method === 'GET') {
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500)
        return sendJson(res, req, 200, { entries: await readNotifyLog(DATA_DIR, limit) })
      }
      if (req.method === 'DELETE') {
        await clearNotifyLog(DATA_DIR)
        return sendJson(res, req, 200, { ok: true })
      }
    }

    // 报警事件扇出（前端 alarmStore 触发/恢复时调用）
    if (url.pathname === '/api/notify/send' && req.method === 'POST') {
      const body = await readBody(req, 256 * 1024)
      const payload = JSON.parse(body)
      const event = {
        kind: payload?.kind === 'recover' ? 'recover' : 'active',
        level: payload?.level === 'critical' ? 'critical' : 'warning',
        title: String(payload?.title || 'SCADA 报警'),
        message: String(payload?.message || ''),
        time: Number(payload?.time) || Date.now(),
        timeText: String(payload?.timeText || new Date().toLocaleString('zh-CN')),
      }
      const results = await dispatchNotification(DATA_DIR, event, notifyLastSent)
      return sendJson(res, req, 200, { ok: true, results })
    }

    // ---------- 写值/系统审计 ----------
    // 审计
    if (url.pathname === '/api/audit') {
      if (req.method === 'POST') {
        const body = await readBody(req, 256 * 1024)
        let payload
        try {
          payload = JSON.parse(body)
        } catch {
          return sendJson(res, req, 400, { error: 'invalid json' })
        }
        const operator = authn.master
          ? (payload.operator || 'service')
          : `${authn.user.displayName}(${authn.user.username})`
        await appendAudit({
          t: Date.now(),
          operator,
          deviceId: String(payload?.deviceId ?? ''),
          variable: String(payload?.variable ?? ''),
          value: String(payload?.value ?? ''),
          ok: !!payload?.ok,
          error: payload?.error ? String(payload.error) : undefined,
        })
        return sendJson(res, req, 200, { ok: true })
      }
      if (req.method === 'GET') {
        if (!requireRole(authn, 'engineer')) {
          return sendJson(res, req, 403, { error: 'forbidden' })
        }
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), AUDIT_MAX)
        return sendJson(res, req, 200, { entries: await readAudit(limit) })
      }
    }

    // ---------- 键值存储（读任意登录用户，写 engineer+；按用户命名空间隔离）----------
    const scope = scopeOf(authn)

    if ((url.pathname === '/api/keys' || url.pathname === '/api/storage/keys') && req.method === 'GET') {
      const dir = scopeDir(scope)
      await fs.mkdir(dir, { recursive: true })
      let files = []
      try {
        files = await fs.readdir(dir)
      } catch {
        files = []
      }
      const keys = files
        .filter(f => f.endsWith('.json'))
        .map(f => decodeURIComponent(f.slice(0, -5)))
      sendJson(res, req, 200, { keys })
      return
    }

    if (url.pathname === '/api/storage/get' && req.method === 'GET') {
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, req, 400, { error: 'missing key' })
      try {
        const value = await fs.readFile(fileFor(key, scope), 'utf8')
        sendJson(res, req, 200, { value })
      } catch {
        sendJson(res, req, 200, { value: null })
      }
      return
    }

    if (url.pathname === '/api/storage/set' && req.method === 'PUT') {
      if (!requireRole(authn, 'engineer')) {
        return sendJson(res, req, 403, { error: 'forbidden' })
      }
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, req, 400, { error: 'missing key' })
      const value = await readBody(req, MAX_BODY_BYTES)
      await fs.mkdir(scopeDir(scope), { recursive: true })
      await fs.writeFile(fileFor(key, scope), value, 'utf8')
      sendJson(res, req, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/storage/remove' && req.method === 'DELETE') {
      if (!requireRole(authn, 'engineer')) {
        return sendJson(res, req, 403, { error: 'forbidden' })
      }
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, req, 400, { error: 'missing key' })
      await fs.rm(fileFor(key, scope), { force: true })
      sendJson(res, req, 200, { ok: true })
      return
    }

    // ---------- 时序历史（写 operator+，读任意登录；按用户隔离）----------
    const historyDir = historyDirFor(scope)

    if (url.pathname === '/api/history/write' && req.method === 'POST') {
      if (!requireRole(authn, 'operator')) {
        return sendJson(res, req, 403, { error: 'forbidden' })
      }
      const body = await readBody(req, MAX_BODY_BYTES)
      let payload
      try {
        payload = JSON.parse(body)
      } catch {
        return sendJson(res, req, 400, { error: 'invalid json' })
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return sendJson(res, req, 400, { error: 'expected { key: [{t,v},...], ... }' })
      }
      let written = 0
      for (const [key, samples] of Object.entries(payload)) {
        if (!Array.isArray(samples)) continue
        written += await appendSamples(historyDir, String(key), samples)
      }
      sendJson(res, req, 200, { ok: true, written })
      return
    }

    if (url.pathname === '/api/history/query' && req.method === 'GET') {
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, req, 400, { error: 'missing key' })
      const now = Date.now()
      const from = Number(url.searchParams.get('from')) || now - 24 * 3600 * 1000
      const to = Number(url.searchParams.get('to')) || now
      const maxPoints = Math.min(Math.max(Number(url.searchParams.get('maxPoints')) || 600, 1), 5000)
      const agg = url.searchParams.get('agg') || ''
      const window = Number(url.searchParams.get('window')) || 0
      // 先聚合（大幅降点数）再抽稀兜底，保证返回量可控
      const raw = await querySamples(historyDir, key, from, to, 0)
      const points = downsamplePoints(aggregatePoints(raw, agg, window), maxPoints)
      sendJson(res, req, 200, { points })
      return
    }

    sendJson(res, req, 404, { error: 'not found' })
  } catch (e) {
    if (e instanceof SyntaxError) {
      return sendJson(res, req, 400, { error: 'invalid json' })
    }
    sendJson(res, req, e?.status || 500, { error: e?.message || String(e) })
  }
})

await auth.init()

server.listen(PORT, () => {
  const authMode = AUTH_TOKEN
    ? '会话登录 + 服务主密钥'
    : '会话登录（无主密钥）'
  const cors = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN
  console.log(
    `[scada-server] 已启动: http://localhost:${PORT} (数据目录 ${DATA_DIR}, CORS ${cors}, ${authMode}, 体积上限 ${MAX_BODY_BYTES}B, 历史保留 ${RETENTION_DAYS} 天)`
  )
  cleanupExpiredShards().catch(e => console.warn('[scada-server] 历史清理失败', e))
  setInterval(() => {
    cleanupExpiredShards().catch(e => console.warn('[scada-server] 历史清理失败', e))
  }, 24 * 3600 * 1000).unref()
})
