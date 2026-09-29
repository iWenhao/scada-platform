/**
 * HTTP 响应与鉴权辅助（零依赖）。
 * 路由模块共用：CORS、JSON 响应、Bearer 解析、角色门禁。
 */

/**
 * 构造 CORS 响应头。
 * CORS_ORIGIN=* 时放行任意来源；否则只回显白名单内的 Origin。
 */
export function makeCorsHeaders(corsOrigin) {
  return function corsHeaders(req) {
    const requestOrigin = req.headers.origin
    if (corsOrigin === '*') {
      return {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      }
    }
    const allowed = corsOrigin.split(',').map(s => s.trim()).filter(Boolean)
    const allowOrigin =
      requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : (allowed[0] || '')
    return {
      'access-control-allow-origin': allowOrigin,
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      vary: 'Origin',
    }
  }
}

/** 发送 JSON 响应（自动附带 CORS 头） */
export function sendJson(res, req, status, body, corsHeaders) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    ...corsHeaders(req),
  })
  res.end(JSON.stringify(body))
}

/** 从 Authorization 头取出 Bearer token（无则空串） */
export function bearer(req) {
  const h = req.headers.authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}

/**
 * 读取请求体为字符串；超过 limit 抛 status=413。
 */
export async function readBody(req, limit) {
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

/**
 * 鉴权：服务主密钥 AUTH_TOKEN 或用户会话。
 * @returns {{ user: object|null, master: boolean } | null}
 */
export function authenticateRequest(req, { auth, authToken }) {
  const token = bearer(req)
  if (!token) return null
  if (authToken && token === authToken) {
    return { user: null, master: true }
  }
  const user = auth.resolveToken(token)
  return user ? { user, master: false } : null
}

/**
 * 角色门禁。master（服务主密钥）视为最高权限。
 */
export function requireRole(authn, minRole, roleAtLeast) {
  if (!authn) return false
  if (authn.master) return true
  return roleAtLeast(authn.user.role, minRole)
}
