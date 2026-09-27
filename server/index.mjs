// SCADA Platform 存储后端
// 零依赖的键值存储服务, 数据以 JSON 文件形式保存在 DATA_DIR 目录,
// 为前端 StorageAdapter 抽象提供远程实现(项目/自定义组件/主题等持久化)。
//
// 启动: node server/index.mjs   (或 pnpm server)
// 环境变量(均可选, 见 .env.example):
//   PORT             监听端口, 默认 5174
//   DATA_DIR         数据目录, 默认 <server>/data (容器部署时挂卷)
//   MAX_BODY_BYTES   请求体上限, 默认 20MB
//   CORS_ORIGIN      允许的跨域来源, 逗号分隔; 默认 * (仅建议内网)
//   AUTH_TOKEN       设置后启用 Bearer 鉴权, 生产环境务必设置
//
// 接口:
//   GET    /api/health              -> { ok: true }
//   GET    /api/keys                -> { keys: string[] }
//   GET    /api/storage/get?key=X   -> { value: string | null }
//   PUT    /api/storage/set?key=X   body=文本值
//   DELETE /api/storage/remove?key=X
import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
const PORT = Number(process.env.PORT || 5174)
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 20 * 1024 * 1024)
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').trim()
const AUTH_TOKEN = (process.env.AUTH_TOKEN || '').trim()

const ALLOWED_METHODS = 'GET, PUT, DELETE, OPTIONS'
const ALLOWED_HEADERS = 'content-type, authorization'

// 键名 -> 安全文件名(URL 编码, 防路径穿越)
function fileFor(key) {
  return path.join(DATA_DIR, encodeURIComponent(key) + '.json')
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

    sendJson(res, req, 404, { error: 'not found' })
  } catch (e) {
    sendJson(res, req, e?.status || 500, { error: e?.message || String(e) })
  }
})

server.listen(PORT, () => {
  const auth = AUTH_TOKEN ? 'Bearer 鉴权已开启' : '未开启鉴权(内网/开发)'
  const cors = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN
  console.log(
    `[scada-server] 存储服务已启动: http://localhost:${PORT} (数据目录 ${DATA_DIR}, CORS ${cors}, ${auth}, 体积上限 ${MAX_BODY_BYTES}B)`
  )
})
