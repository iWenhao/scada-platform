// SCADA Platform 存储后端
// 零依赖的键值存储服务: 数据以 JSON 文件形式保存在 server/data/ 目录,
// 为前端 StorageAdapter 抽象提供远端实现(项目/自定义组件/主题等持久化)。
//
// 启动: node server/index.mjs   (或 pnpm server)
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
const DATA_DIR = path.join(__dirname, 'data')
const PORT = Number(process.env.PORT || 5174)

// 键名 -> 安全文件名(URL 编码, 防路径穿越)
function fileFor(key) {
  return path.join(DATA_DIR, encodeURIComponent(key) + '.json')
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET, PUT, DELETE, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

async function readBody(req, limit = 20 * 1024 * 1024) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('payload too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

const server = createServer(async (req, res) => {
  // CORS 预检(前端与后端不同端口时)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, PUT, DELETE, OPTIONS',
    })
    res.end()
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  try {
    if (url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true })
      return
    }

    if ((url.pathname === '/api/keys' || url.pathname === '/api/storage/keys') && req.method === 'GET') {
      const files = await fs.readdir(DATA_DIR)
      const keys = files
        .filter(f => f.endsWith('.json'))
        .map(f => decodeURIComponent(f.slice(0, -5)))
      sendJson(res, 200, { keys })
      return
    }

    if (url.pathname === '/api/storage/get' && req.method === 'GET') {
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, 400, { error: 'missing key' })
      try {
        const value = await fs.readFile(fileFor(key), 'utf8')
        sendJson(res, 200, { value })
      } catch {
        sendJson(res, 200, { value: null })
      }
      return
    }

    if (url.pathname === '/api/storage/set' && req.method === 'PUT') {
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, 400, { error: 'missing key' })
      const value = await readBody(req)
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(fileFor(key), value, 'utf8')
      sendJson(res, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/storage/remove' && req.method === 'DELETE') {
      const key = url.searchParams.get('key')
      if (!key) return sendJson(res, 400, { error: 'missing key' })
      await fs.rm(fileFor(key), { force: true })
      sendJson(res, 200, { ok: true })
      return
    }

    sendJson(res, 404, { error: 'not found' })
  } catch (e) {
    sendJson(res, 500, { error: e?.message || String(e) })
  }
})

server.listen(PORT, () => {
  console.log(`[scada-server] 存储服务已启动: http://localhost:${PORT} (数据目录 ${DATA_DIR})`)
})
