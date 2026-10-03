// SCADA Platform 存储后端（入口）
// 职责：配置装载、路由分发、进程启动。
// 实现拆在 lib/：http 响应与鉴权、kv 路径隔离、时序历史、审计。
//
// 启动: node server/index.mjs   (或 pnpm server)
// 环境变量见 .env.example：PORT / DATA_DIR / MAX_BODY_BYTES / CORS_ORIGIN / AUTH_TOKEN / HISTORY_RETENTION_DAYS
//
// 接口(除 health/login 外需 Authorization: Bearer <会话token> 或 AUTH_TOKEN):
//   GET    /api/health
//   POST   /api/auth/login | logout | password
//   GET    /api/auth/me
//   GET/POST/PATCH/DELETE /api/auth/users
//   GET    /api/keys | /api/storage/keys
//   GET    /api/storage/get?key=
//   PUT    /api/storage/set?key=    (engineer+)
//   DELETE /api/storage/remove?key= (engineer+)
//   POST   /api/history/write       (operator+)
//   GET    /api/history/query
//   POST/GET/DELETE /api/audit
//   GET/PUT /api/notify/channels    POST /api/notify/test|send   GET/DELETE /api/notify/log
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
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
import {
  makeCorsHeaders,
  sendJson,
  bearer,
  readBody,
  authenticateRequest,
  requireRole,
} from './lib/http.mjs'
import {
  scopeOf,
  listKeys,
  readValue,
  writeValue,
  removeValue,
  GLOBAL_SCOPE,
} from './lib/kv.mjs'
import {
  historyDirFor,
  appendSamples,
  querySamples,
  cleanupExpiredShards,
} from './lib/history.mjs'
import { appendAudit, readAudit } from './lib/audit.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 读取 package.json 的名称与版本，仅用于启动横幅展示（相对入口文件定位，与运行目录无关）
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
const HISTORY_DIR = path.join(DATA_DIR, 'history')
const PORT = Number(process.env.PORT || 5174)
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 20 * 1024 * 1024)
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').trim()
const AUTH_TOKEN = (process.env.AUTH_TOKEN || '').trim()
const RETENTION_DAYS = Number(process.env.HISTORY_RETENTION_DAYS || 30)
const AUDIT_MAX = 500

/** 站点品牌存储键（部署级全局设置），与前端 src/stores/brandingStore.ts 保持一致 */
const BRANDING_KEY = 'site:branding'

const corsHeaders = makeCorsHeaders(CORS_ORIGIN)
const auth = createAuthStore(DATA_DIR)
/** 通知节流：channelId -> 上次发送时间戳 */
const notifyLastSent = new Map()

function ok(res, req, status, body) {
  sendJson(res, req, status, body, corsHeaders)
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req))
    res.end()
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  try {
    // ---------- 公开 ----------
    if (url.pathname === '/api/health') {
      return ok(res, req, 200, { ok: true })
    }

    // ---------- 站点品牌（部署级全局设置）----------
    // GET 必须公开（放在鉴权之前）：登录页等未鉴权页面也要展示部署品牌。
    // 数据落 u/global/ 全局命名空间（见 lib/kv.mjs GLOBAL_SCOPE），不随用户隔离；
    // 值为前端 brandingStore 写入的 JSON 字符串，此处只做透明存取不解析。
    if (url.pathname === '/api/branding' && req.method === 'GET') {
      return ok(res, req, 200, { value: await readValue(DATA_DIR, BRANDING_KEY, GLOBAL_SCOPE) })
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const payload = JSON.parse(await readBody(req, 64 * 1024))
      const result = await auth.login(payload?.username, payload?.password)
      if (!result) return ok(res, req, 401, { error: '用户名或口令错误' })
      return ok(res, req, 200, result)
    }

    // ---------- 鉴权 ----------
    const authn = authenticateRequest(req, { auth, authToken: AUTH_TOKEN })
    if (!authn) {
      return ok(res, req, 401, { error: 'unauthorized' })
    }

    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      await auth.logout(bearer(req))
      return ok(res, req, 200, { ok: true })
    }

    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      if (authn.master) {
        return ok(res, req, 200, {
          user: { id: 'master', username: 'service', displayName: '服务密钥', role: 'admin' },
        })
      }
      return ok(res, req, 200, { user: authn.user })
    }

    if (url.pathname === '/api/auth/password' && req.method === 'POST') {
      if (authn.master) return ok(res, req, 400, { error: 'master token has no password' })
      const payload = JSON.parse(await readBody(req, 64 * 1024))
      const result = await auth.changeOwnPassword(
        authn.user.id,
        payload?.oldPassword,
        payload?.newPassword,
      )
      return ok(res, req, result.ok ? 200 : 400, result)
    }

    // ---------- 用户管理（admin）----------
    if (url.pathname === '/api/auth/users') {
      if (!requireRole(authn, 'admin', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      if (req.method === 'GET') {
        return ok(res, req, 200, { users: auth.listUsers() })
      }
      if (req.method === 'POST') {
        const result = await auth.createUser(JSON.parse(await readBody(req, 64 * 1024)))
        return ok(res, req, result.error ? 400 : 200, result)
      }
      if (req.method === 'PATCH') {
        const payload = JSON.parse(await readBody(req, 64 * 1024))
        if (!payload?.id) return ok(res, req, 400, { error: 'missing id' })
        const result = await auth.updateUser(payload.id, payload)
        return ok(res, req, result.error ? 400 : 200, result)
      }
      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id')
        if (!id) return ok(res, req, 400, { error: 'missing id' })
        const result = await auth.removeUser(id)
        return ok(res, req, result.error ? 400 : 200, result)
      }
    }

    // ---------- 通知 ----------
    if (url.pathname === '/api/notify/channels') {
      if (!requireRole(authn, 'engineer', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      if (req.method === 'GET') {
        return ok(res, req, 200, await loadNotifyConfig(DATA_DIR))
      }
      if (req.method === 'PUT') {
        const saved = await saveNotifyConfig(DATA_DIR, JSON.parse(await readBody(req, 512 * 1024)))
        return ok(res, req, 200, saved)
      }
    }

    if (url.pathname === '/api/notify/test' && req.method === 'POST') {
      if (!requireRole(authn, 'engineer', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      const payload = JSON.parse(await readBody(req, 64 * 1024))
      const config = await loadNotifyConfig(DATA_DIR)
      const channel = payload?.id
        ? config.channels.find(c => c.id === payload.id)
        : payload?.channel
      if (!channel) return ok(res, req, 400, { error: 'channel not found' })
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
      return ok(res, req, result.ok ? 200 : 502, { ...result, id: channel.id, name: channel.name })
    }

    if (url.pathname === '/api/notify/log') {
      if (!requireRole(authn, 'engineer', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      if (req.method === 'GET') {
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500)
        return ok(res, req, 200, { entries: await readNotifyLog(DATA_DIR, limit) })
      }
      if (req.method === 'DELETE') {
        await clearNotifyLog(DATA_DIR)
        return ok(res, req, 200, { ok: true })
      }
    }

    if (url.pathname === '/api/notify/send' && req.method === 'POST') {
      const payload = JSON.parse(await readBody(req, 256 * 1024))
      const event = {
        kind: payload?.kind === 'recover' ? 'recover' : 'active',
        level: payload?.level === 'critical' ? 'critical' : 'warning',
        title: String(payload?.title || 'SCADA 报警'),
        message: String(payload?.message || ''),
        time: Number(payload?.time) || Date.now(),
        timeText: String(payload?.timeText || new Date().toLocaleString('zh-CN')),
      }
      const results = await dispatchNotification(DATA_DIR, event, notifyLastSent)
      return ok(res, req, 200, { ok: true, results })
    }

    // ---------- 审计 ----------
    if (url.pathname === '/api/audit' && req.method === 'POST') {
      const payload = JSON.parse(await readBody(req, 256 * 1024))
      const operator = authn.master
        ? (payload.operator || 'service')
        : `${authn.user.displayName}(${authn.user.username})`
      await appendAudit(DATA_DIR, {
        t: Date.now(),
        operator,
        deviceId: String(payload?.deviceId ?? ''),
        variable: String(payload?.variable ?? ''),
        value: String(payload?.value ?? ''),
        ok: !!payload?.ok,
        error: payload?.error ? String(payload.error) : undefined,
      })
      return ok(res, req, 200, { ok: true })
    }

    if (url.pathname === '/api/audit' && req.method === 'GET') {
      if (!requireRole(authn, 'engineer', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), AUDIT_MAX)
      return ok(res, req, 200, { entries: await readAudit(DATA_DIR, limit) })
    }

    // ---------- KV 存储（按用户隔离）----------
    const scope = scopeOf(authn)

    if ((url.pathname === '/api/keys' || url.pathname === '/api/storage/keys') && req.method === 'GET') {
      return ok(res, req, 200, { keys: await listKeys(DATA_DIR, scope) })
    }

    if (url.pathname === '/api/storage/get' && req.method === 'GET') {
      const key = url.searchParams.get('key')
      if (!key) return ok(res, req, 400, { error: 'missing key' })
      return ok(res, req, 200, { value: await readValue(DATA_DIR, key, scope) })
    }

    if (url.pathname === '/api/storage/set' && req.method === 'PUT') {
      if (!requireRole(authn, 'engineer', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      const key = url.searchParams.get('key')
      if (!key) return ok(res, req, 400, { error: 'missing key' })
      await writeValue(DATA_DIR, key, scope, await readBody(req, MAX_BODY_BYTES))
      return ok(res, req, 200, { ok: true })
    }

    if (url.pathname === '/api/storage/remove' && req.method === 'DELETE') {
      if (!requireRole(authn, 'engineer', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      const key = url.searchParams.get('key')
      if (!key) return ok(res, req, 400, { error: 'missing key' })
      await removeValue(DATA_DIR, key, scope)
      return ok(res, req, 200, { ok: true })
    }

    // 站点品牌写入：影响整个部署，权限提高到 admin（普通 KV 键 engineer 即可写）。
    // 品牌负载含图标 data URL（前端已缩放为 256×256 PNG），512KB 上限足够。
    if (url.pathname === '/api/branding' && req.method === 'PUT') {
      if (!requireRole(authn, 'admin', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      await writeValue(DATA_DIR, BRANDING_KEY, GLOBAL_SCOPE, await readBody(req, 512 * 1024))
      return ok(res, req, 200, { ok: true })
    }

    // ---------- 历史 ----------
    const historyDir = historyDirFor(HISTORY_DIR, scope)

    if (url.pathname === '/api/history/write' && req.method === 'POST') {
      if (!requireRole(authn, 'operator', roleAtLeast)) {
        return ok(res, req, 403, { error: 'forbidden' })
      }
      const payload = JSON.parse(await readBody(req, MAX_BODY_BYTES))
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return ok(res, req, 400, { error: 'expected { key: [{t,v},...], ... }' })
      }
      let written = 0
      for (const [key, samples] of Object.entries(payload)) {
        if (!Array.isArray(samples)) continue
        written += await appendSamples(historyDir, String(key), samples)
      }
      return ok(res, req, 200, { ok: true, written })
    }

    // 历史查询：agg/window 为可选窗口聚合（与前端 historian.resolveAgg 对接）。
    // 不传则保持旧行为（均匀抽稀）；非法聚合参数回落为普通查询，不报错，
    // 避免旧版前端/手工调用因多带参数被拒绝。
    if (url.pathname === '/api/history/query' && req.method === 'GET') {
      const key = url.searchParams.get('key')
      if (!key) return ok(res, req, 400, { error: 'missing key' })
      const now = Date.now()
      const from = Number(url.searchParams.get('from')) || now - 24 * 3600 * 1000
      const to = Number(url.searchParams.get('to')) || now
      const maxPoints = Math.min(Math.max(Number(url.searchParams.get('maxPoints')) || 600, 1), 5000)
      const aggRaw = url.searchParams.get('agg')
      const windowRaw = Number(url.searchParams.get('window'))
      const agg = aggRaw === 'min' || aggRaw === 'avg' || aggRaw === 'max' ? aggRaw : undefined
      const windowMs = Number.isFinite(windowRaw) && windowRaw >= 1000 && windowRaw <= 24 * 3600 * 1000
        ? Math.round(windowRaw)
        : undefined
      const points = await querySamples(historyDir, key, from, to, maxPoints, { agg, windowMs })
      return ok(res, req, 200, { points })
    }

    return ok(res, req, 404, { error: 'not found' })
  } catch (e) {
    if (e instanceof SyntaxError) {
      return ok(res, req, 400, { error: 'invalid json' })
    }
    return ok(res, req, e?.status || 500, { error: e?.message || String(e) })
  }
})

await auth.init()

server.listen(PORT, () => {
  const authMode = AUTH_TOKEN ? '会话登录 + 服务主密钥' : '会话登录（无主密钥）'
  // 启动横幅：与 Vite dev server 的终端横幅同款样式，便于区分两个进程的输出
  const line = '─'.repeat(56)
  console.log(`\n${line}\n  ${pkg.name} v${pkg.version} · 存储后端\n${line}`)
  console.log(
    `[scada-server] 已启动: http://localhost:${PORT} (数据目录 ${DATA_DIR}, CORS ${CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN}, ${authMode}, 体积上限 ${MAX_BODY_BYTES}B, 历史保留 ${RETENTION_DAYS} 天)`
  )
  cleanupExpiredShards(HISTORY_DIR, RETENTION_DAYS).catch(e => console.warn('[scada-server] 历史清理失败', e))
  setInterval(() => {
    cleanupExpiredShards(HISTORY_DIR, RETENTION_DAYS).catch(e => console.warn('[scada-server] 历史清理失败', e))
  }, 24 * 3600 * 1000).unref()
})
