/**
 * HTTP 响应与鉴权辅助（零依赖）。
 * 路由模块共用：CORS、JSON 响应、Bearer 解析、角色门禁。
 *
 * 响应体只有两种形状（由 index.mjs 注入的 ctx.send / ctx.fail 产出，路由不手拼）：
 *   成功 2xx → { data, meta? }                 data 是负载本体，meta 放 etag/total/written 这类附属信息
 *   失败     → { error: { code, message, meta? } }   code 供客户端分支，message 直接展示
 * 成败一律以 HTTP status 判定，body 内不再重复放 ok 字段。
 */
import { ApiError } from './apiError.mjs'

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

/**
 * 成功响应体。`data` 恒为键（缺省 null），客户端可无条件读；
 * `meta` 为空对象或 undefined 时整个键省略，避免 `{ data, meta: {} }` 这种噪声。
 */
export function successEnvelope(data, meta) {
  const body = { data: data ?? null }
  if (meta && Object.keys(meta).length > 0) body.meta = meta
  return body
}

/** 失败响应体：code 是给客户端比对的稳定标识，message 是给人看的中文 */
export function errorEnvelope(code, message, meta) {
  const error = { code, message }
  if (meta && Object.keys(meta).length > 0) error.meta = meta
  return { error }
}

/** 发送成功响应 */
export function sendData(res, req, status, data, meta, corsHeaders) {
  sendJson(res, req, status, successEnvelope(data, meta), corsHeaders)
}

/** 发送失败响应 */
export function sendFail(res, req, status, code, message, meta, corsHeaders) {
  sendJson(res, req, status, errorEnvelope(code, message, meta), corsHeaders)
}

/** 从 Authorization 头取出 Bearer token（无则空串） */
export function bearer(req) {
  const h = req.headers.authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}

/**
 * 读取请求体为字符串；超过 limit 抛 413 的 ApiError（由顶层 catch 翻译为失败响应）。
 */
export async function readBody(req, limit) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) {
      // 按上限量级选单位：测试用的百字节上限报「0 MB」等于没报
      const text =
        limit >= 1024 * 1024
          ? `${(limit / 1024 / 1024).toFixed(0)} MB`
          : limit >= 1024
            ? `${(limit / 1024).toFixed(0)} KB`
            : `${limit} 字节`
      throw new ApiError(413, 'payload_too_large', `请求体超过上限 ${text}`)
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
