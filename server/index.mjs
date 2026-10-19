// SCADA Platform 存储后端（入口）
// 职责：配置装载、路由分发、进程启动。
// 实现拆在 lib/（http 响应与鉴权、kv 路径隔离、时序历史、审计）与 routes/（按域分组的路由）。
//
// 启动: node server/index.mjs   (或 pnpm server)
// 环境变量见 .env.example：PORT / HOST / DATA_DIR / MAX_BODY_BYTES / CORS_ORIGIN / AUTH_TOKEN / HISTORY_RETENTION_DAYS
//
// 接口(除 health/branding GET/login 外需 Authorization: Bearer <会话token> 或 AUTH_TOKEN):
//   GET    /api/health
//   GET    /api/branding                  PUT /api/branding (admin)
//   POST   /api/auth/login | logout | password
//   GET    /api/auth/me
//   GET/POST/PATCH/DELETE /api/auth/users
//   GET    /api/keys | /api/storage/keys
//   GET    /api/storage/projects        工程列表分页摘要（?limit=&offset=&keyword=，含 total/publishedTotal/matchedTotal）
//   GET    /api/storage/get?key=
//   PUT    /api/storage/set?key=    (engineer+; 带 ?mode=create 时键已存在返回 409，不覆盖)
//   DELETE /api/storage/remove?key= (engineer+)
//   POST   /api/history/write       (operator+)
//   GET    /api/history/query
//   POST/GET/DELETE /api/audit
//   GET/PUT /api/notify/channels    POST /api/notify/test|send   GET/DELETE /api/notify/log
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// 启动横幅：与前端（浏览器控制台 / pnpm dev 终端）共用同一份布局，本文件只提供后端自身的信息。
// 注意：这让 server/ 依赖仓库根的 shared/ 目录，分发时要连 shared 一起带上，不能只拷 server/。
import { buildBannerModel, renderAnsi, renderPlain, supportsColor } from '../shared/consoleBanner.mjs'
import { createAuthStore } from './auth.mjs'
import { scopeOf } from './lib/kv.mjs'
import { historyDirFor, cleanupExpiredShards } from './lib/history.mjs'
import {
  makeCorsHeaders,
  sendJson,
  authenticateRequest,
} from './lib/http.mjs'
import { handlePublic } from './routes/public.mjs'
import { handleAuth } from './routes/auth.mjs'
import { handleNotify } from './routes/notify.mjs'
import { handleAudit } from './routes/audit.mjs'
import { handleStorage } from './routes/storage.mjs'
import { handleProjects } from './routes/projects.mjs'
import { handleHistory } from './routes/history.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 读取 package.json 的名称与版本，仅用于启动横幅展示（相对入口文件定位，与运行目录无关）
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
const HISTORY_DIR = path.join(DATA_DIR, 'history')
const PORT = Number(process.env.PORT || 5174)
// 默认只监听回环：这是个无 TLS 的存储服务，绑全网卡等于把账号表与工程数据开到局域网上。
// 容器部署需要对外暴露时设 HOST=0.0.0.0（见 Dockerfile.server / docker-compose.yml）。
const HOST = (process.env.HOST || '127.0.0.1').trim()
const isLoopback = HOST === '127.0.0.1' || HOST === 'localhost' || HOST === '::1'
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 20 * 1024 * 1024)
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').trim()
const AUTH_TOKEN = (process.env.AUTH_TOKEN || '').trim()
const RETENTION_DAYS = Number(process.env.HISTORY_RETENTION_DAYS || 30)
const AUDIT_MAX = 500

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
    // 各路由模块共用的上下文：请求、响应出口、存储定位与运行时依赖。
    // 公开阶段 authn 为 null（登录/品牌读取/健康检查都发生在鉴权之前）。
    const base = {
      req,
      res,
      url,
      ok,
      auth,
      authn: null,
      dataDir: DATA_DIR,
      maxBodyBytes: MAX_BODY_BYTES,
      auditMax: AUDIT_MAX,
      notifyLastSent,
      clientIp: req.socket?.remoteAddress || '',
    }

    if (await handlePublic(base)) return

    const authn = authenticateRequest(req, { auth, authToken: AUTH_TOKEN })
    if (!authn) {
      return ok(res, req, 401, { error: 'unauthorized' })
    }

    const scope = scopeOf(authn)
    const ctx = {
      ...base,
      authn,
      scope,
      historyDir: historyDirFor(HISTORY_DIR, scope),
    }

    // 顺序与原单体实现一致：账号 → 通知 → 审计 → 存储 → 工程索引 → 历史
    if (await handleAuth(ctx)) return
    if (await handleNotify(ctx)) return
    if (await handleAudit(ctx)) return
    if (await handleStorage(ctx)) return
    if (await handleProjects(ctx)) return
    if (await handleHistory(ctx)) return

    return ok(res, req, 404, { error: 'not found' })
  } catch (e) {
    if (e instanceof SyntaxError) {
      return ok(res, req, 400, { error: 'invalid json' })
    }
    const status = Number(e?.status) || 500
    // 5xx 不回显 e.message：fs 错误的 message 形如
    // "ENOENT ... open 'D:\...\server\data\u\usr_x\k.json'"，会把绝对路径与目录结构吐给客户端。
    // 详情进服务端日志，客户端只拿状态码与泛化文案。
    if (status >= 500) {
      console.error('[scada-server] 请求处理失败', e)
      return ok(res, req, status, { error: 'internal error' })
    }
    return ok(res, req, status, { error: String(e?.message || e) })
  }
})

// 端口被占等情况会以 'error' 事件抛出，不接就是未捕获异常、进程直接退出且没有可读报错
server.on('error', (e) => {
  console.error(`[scada-server] 监听 ${HOST}:${PORT} 失败:`, e?.message || e)
  process.exit(1)
})

// 顶层 await auth.init() 与路由里的异步操作若抛出，默认只打印一行 warning 后继续跑，
// 状态可能已不一致——这里兜住并明确退出，由 restart 策略拉起
process.on('unhandledRejection', (e) => {
  console.error('[scada-server] 未处理的 Promise 拒绝:', e)
  process.exit(1)
})

await auth.init()

/**
 * 打印启动横幅：标明这是「存储后端」，与 `pnpm dev` 的前端横幅区分开——
 * 两者可能同机并行开两个终端，靠副标题「· 后端」与提示符 node@ 就能一眼分辨。
 * 上色规则见 shared/consoleBanner.mjs 的 supportsColor（传统 conhost 会把 ANSI 当正文，故降级无色）。
 */
function printStartupBanner() {
  const authMode = AUTH_TOKEN ? '会话登录 + 服务主密钥' : '会话登录（无主密钥）'
  // 数据目录显示相对 server/ 的路径：绝对路径带用户目录太长会挤爆横幅；
  // 若数据目录在 server/ 之外（自定义 DATA_DIR），就直接显示相对路径，不再补 server/ 前缀
  const relDataDir = path.relative(__dirname, DATA_DIR) || '.'
  const dataDir = relDataDir.startsWith('..') ? relDataDir : `server/${relDataDir}`
  const pad = (label) => label.padEnd(10, ' ')
  const model = buildBannerModel({
    title: pkg.name,
    subtitle: '零依赖键值存储服务 · 后端 Backend',
    version: pkg.version,
    details: [
      `${pad('Role:')}存储 API · 前端界面请另开 pnpm dev`,
      `${pad('Listen:')}http://${isLoopback ? 'localhost' : HOST}:${PORT}`,
      `${pad('Data:')}${dataDir} (JSON)`,
      `${pad('CORS:')}${CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN}`,
      `${pad('Body:')}${(MAX_BODY_BYTES / 1024 / 1024).toFixed(0)} MB`,
      `${pad('History:')}${RETENTION_DAYS} 天`,
      `${pad('Auth:')}${authMode}`,
      `${pad('Health:')}GET /api/health`,
    ],
    prompt: 'node',
  })
  console.log(`\n${supportsColor() ? renderAnsi(model) : renderPlain(model)}\n`)
}

server.listen(PORT, HOST, () => {
  printStartupBanner()
  // 配置细节已进横幅，这里只留一行启动确认，便于 grep 与日志采集
  console.log(`[scada-server] 已启动: http://${HOST}:${PORT}`)
  if (CORS_ORIGIN === '*' && !isLoopback) {
    console.warn('[scada-server] 警告: CORS_ORIGIN=* 且监听非回环地址，任意站点的脚本都能读写本服务')
  }
  cleanupExpiredShards(HISTORY_DIR, RETENTION_DAYS).catch(e => console.warn('[scada-server] 历史清理失败', e))
  setInterval(() => {
    cleanupExpiredShards(HISTORY_DIR, RETENTION_DAYS).catch(e => console.warn('[scada-server] 历史清理失败', e))
  }, 24 * 3600 * 1000).unref()
})
