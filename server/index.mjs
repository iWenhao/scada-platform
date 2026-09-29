// SCADA Platform 存储后端
// 零依赖的键值存储服务, 数据以 JSON 文件形式保存在 DATA_DIR 目录,
// 为前端 StorageAdapter 抽象提供远程实现(项目/自定义组件/主题等持久化)。
// 另提供轻量时序历史存储(按天分片 JSONL), 供趋势图/图表查询历史区间。
//
// 启动: node server/index.mjs   (或 pnpm server)
// 环境变量(均可选, 见 .env.example):
//   PORT             监听端口, 默认 5174
//   DATA_DIR         数据目录, 默认 <server>/data (容器部署时挂卷)
//   MAX_BODY_BYTES   请求体上限, 默认 20MB
//   CORS_ORIGIN      允许的跨域来源, 逗号分隔; 默认 * (仅建议内网)
//   AUTH_TOKEN       设置后启用 Bearer 鉴权, 生产环境务必设置
//   HISTORY_RETENTION_DAYS 历史数据保留天数, 默认 30, 超期分片自动清理
//
// 接口:
//   GET    /api/health              -> { ok: true }
//   GET    /api/keys                -> { keys: string[] }
//   GET    /api/storage/get?key=X   -> { value: string | null }
//   PUT    /api/storage/set?key=X   body=文本值
//   DELETE /api/storage/remove?key=X
//   POST   /api/history/write       body={ "key": [{t,v},...], ... }  批量追加采样
//   GET    /api/history/query?key=X&from=ms&to=ms&maxPoints=N -> { points: [{t,v}] }
import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
const HISTORY_DIR = path.join(DATA_DIR, 'history')
const PORT = Number(process.env.PORT || 5174)
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 20 * 1024 * 1024)
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').trim()
const AUTH_TOKEN = (process.env.AUTH_TOKEN || '').trim()
const RETENTION_DAYS = Number(process.env.HISTORY_RETENTION_DAYS || 30)

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'content-type, authorization'

// 键名 -> 安全文件名(URL 编码, 防路径穿越)
function fileFor(key) {
  return path.join(DATA_DIR, encodeURIComponent(key) + '.json')
}

// ---- 时序历史存储: <HISTORY_DIR>/<encodeURIComponent(key)>.<YYYYMMDD>.jsonl ----
// 每行一个采样 {t, v}; 按天分片让"最近几小时"这类高频查询只触碰少量小文件

function dayString(ms) {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}${mm}${dd}`
}

function shardFile(key, day) {
  return path.join(HISTORY_DIR, `${encodeURIComponent(key)}.${day}.jsonl`)
}

function isHistoryShard(fileName, encodedKey) {
  return fileName.startsWith(encodedKey + '.') && fileName.endsWith('.jsonl')
}

/** 把采样按天分组追加写入; 返回写入的总点数 */
async function appendSamples(key, samples) {
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
  await fs.mkdir(HISTORY_DIR, { recursive: true })
  for (const [day, lines] of byDay) {
    await fs.appendFile(shardFile(key, day), lines.join(''), 'utf8')
  }
  return count
}

/** 读取 [from, to] 区间内的采样, 超过 maxPoints 时均匀抽稀(保留首尾) */
async function querySamples(key, from, to, maxPoints) {
  const encodedKey = encodeURIComponent(key)
  let files = []
  try {
    files = await fs.readdir(HISTORY_DIR)
  } catch {
    return [] // 目录不存在 = 还没有任何历史数据
  }

  const shards = files
    .filter(f => isHistoryShard(f, encodedKey))
    .map(f => {
      const day = f.slice(encodedKey.length + 1, -'.jsonl'.length)
      return { file: path.join(HISTORY_DIR, f), day }
    })
    // 只读与区间可能相交的分片, 避免大范围查询扫全目录
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
        // 半行/损坏行跳过: 追加写可能在进程中断时留下不完整行
      }
    }
  }

  points.sort((a, b) => a.t - b.t)
  if (maxPoints > 0 && points.length > maxPoints) {
    const step = (points.length - 1) / (maxPoints - 1)
    const sampled = []
    for (let i = 0; i < maxPoints; i++) sampled.push(points[Math.round(i * step)])
    return sampled
  }
  return points
}

/** 清理超过保留期的分片; 返回删除的文件数 */
async function cleanupExpiredShards() {
  if (RETENTION_DAYS <= 0) return 0
  let files
  try {
    files = await fs.readdir(HISTORY_DIR)
  } catch {
    return 0
  }
  const expireDay = dayString(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000)
  let removed = 0
  for (const f of files) {
    const m = f.match(/\.(\d{8})\.jsonl$/)
    if (m && m[1] < expireDay) {
      await fs.rm(path.join(HISTORY_DIR, f), { force: true })
      removed++
    }
  }
  return removed
}

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

function sendJson(res, req, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    ...corsHeaders(req),
  })
  res.end(JSON.stringify(body))
}

function isAuthorized(req) {
  if (!AUTH_TOKEN) return true
  const header = req.headers.authorization || ''
  return header === `Bearer ${AUTH_TOKEN}`
}

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

const server = createServer(async (req, res) => {
  // CORS 预检(前端与后端不同端口/域名时), 不鉴权
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req))
    res.end()
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  try {
    if (!isAuthorized(req)) {
      sendJson(res, req, 401, { error: 'unauthorized' })
      return
    }

    if (url.pathname === '/api/health') {
      sendJson(res, req, 200, { ok: true })
      return
    }

    if ((url.pathname === '/api/keys' || url.pathname === '/api/storage/keys') && req.method === 'GET') {
      await fs.mkdir(DATA_DIR, { recursive: true })
      const files = await fs.readdir(DATA_DIR)
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
        const value = await fs.readFile(fileFor(key), 'utf8')
        sendJson(res, req, 200, { value })
      } catch {
        sendJson(res, req, 200, { value: null })
      }
      return
    }

    if (url.pathname === '/api/storage/set' && req.method === 'PUT') {
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, req, 400, { error: 'missing key' })
      const value = await readBody(req, MAX_BODY_BYTES)
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(fileFor(key), value, 'utf8')
      sendJson(res, req, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/storage/remove' && req.method === 'DELETE') {
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, req, 400, { error: 'missing key' })
      await fs.rm(fileFor(key), { force: true })
      sendJson(res, req, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/history/write' && req.method === 'POST') {
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
        written += await appendSamples(String(key), samples)
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
      const points = await querySamples(key, from, to, maxPoints)
      sendJson(res, req, 200, { points })
      return
    }

    sendJson(res, req, 404, { error: 'not found' })
  } catch (e) {
    sendJson(res, req, e?.status || 500, { error: e?.message || String(e) })
  }
})

server.listen(PORT, () => {
  const auth = AUTH_TOKEN ? 'Bearer 鉴权已开启' : '未开启鉴权(内网/开发)'
  const cors = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN
  console.log(
    `[scada-server] 存储服务已启动: http://localhost:${PORT} (数据目录 ${DATA_DIR}, CORS ${cors}, ${auth}, 体积上限 ${MAX_BODY_BYTES}B, 历史保留 ${RETENTION_DAYS} 天)`
  )
  // 启动即清理超期历史分片; 之后每天一次即可(分片按天组织, 无需更频繁)
  cleanupExpiredShards().catch(e => console.warn('[scada-server] 历史清理失败', e))
  setInterval(() => {
    cleanupExpiredShards().catch(e => console.warn('[scada-server] 历史清理失败', e))
  }, 24 * 3600 * 1000).unref()
})
