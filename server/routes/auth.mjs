/**
 * 账号相关路由（均在鉴权之后分发）：会话信息、改自己口令、用户管理。
 * 登录在 routes/public.mjs（未鉴权即可访问）。
 *
 * 服务层（auth.mjs）失败一律抛 ApiError，这里不再判断返回值里有没有 error 字段——
 * 改造前本文件同时存在 `result.ok ? 200 : 400` 与 `result.error ? 400 : 200` 两种判据。
 */
import { readBody, bearer } from '../lib/http.mjs'

/** 服务主密钥（AUTH_TOKEN）没有对应的账号，/auth/me 用这个占位身份回给前端 */
const MASTER_USER = {
  id: 'master',
  username: 'service',
  displayName: '服务密钥',
  role: 'admin',
}

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleAuth(ctx) {
  const { req, url, send, fail, guard, authn, auth } = ctx

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    await auth.logout(bearer(req))
    send(200, null)
    return true
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    send(200, authn.master ? MASTER_USER : authn.user)
    return true
  }

  if (url.pathname === '/api/auth/password' && req.method === 'POST') {
    if (authn.master) {
      fail(400, 'master_no_password', '服务主密钥没有口令，无法自助修改')
      return true
    }
    const payload = JSON.parse(await readBody(req, 64 * 1024))
    await auth.changeOwnPassword(authn.user.id, payload?.oldPassword, payload?.newPassword)
    send(200, null)
    return true
  }

  // ---------- 用户管理（admin）----------
  if (url.pathname === '/api/auth/users') {
    guard('admin')
    if (req.method === 'GET') {
      send(200, auth.listUsers())
      return true
    }
    if (req.method === 'POST') {
      send(200, await auth.createUser(JSON.parse(await readBody(req, 64 * 1024))))
      return true
    }
    if (req.method === 'PATCH') {
      const payload = JSON.parse(await readBody(req, 64 * 1024))
      if (!payload?.id) {
        fail(400, 'missing_id', '缺少用户 id')
        return true
      }
      send(200, await auth.updateUser(payload.id, payload))
      return true
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) {
        fail(400, 'missing_id', '缺少用户 id')
        return true
      }
      await auth.removeUser(id)
      send(200, null)
      return true
    }
  }

  return false
}
