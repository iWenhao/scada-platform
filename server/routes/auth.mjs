/**
 * 账号相关路由（均在鉴权之后分发）：会话信息、改自己口令、用户管理。
 * 登录在 routes/public.mjs（未鉴权即可访问）。
 */
import { readBody, bearer, requireRole } from '../lib/http.mjs'
import { roleAtLeast } from '../auth.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleAuth(ctx) {
  const { req, res, url, ok, authn, auth } = ctx

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    await auth.logout(bearer(req))
    ok(res, req, 200, { ok: true })
    return true
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    if (authn.master) {
      ok(res, req, 200, {
        user: { id: 'master', username: 'service', displayName: '服务密钥', role: 'admin' },
      })
      return true
    }
    ok(res, req, 200, { user: authn.user })
    return true
  }

  if (url.pathname === '/api/auth/password' && req.method === 'POST') {
    if (authn.master) {
      ok(res, req, 400, { error: 'master token has no password' })
      return true
    }
    const payload = JSON.parse(await readBody(req, 64 * 1024))
    const result = await auth.changeOwnPassword(
      authn.user.id,
      payload?.oldPassword,
      payload?.newPassword,
    )
    ok(res, req, result.ok ? 200 : 400, result)
    return true
  }

  // ---------- 用户管理（admin）----------
  if (url.pathname === '/api/auth/users') {
    if (!requireRole(authn, 'admin', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    if (req.method === 'GET') {
      ok(res, req, 200, { users: auth.listUsers() })
      return true
    }
    if (req.method === 'POST') {
      const result = await auth.createUser(JSON.parse(await readBody(req, 64 * 1024)))
      ok(res, req, result.error ? 400 : 200, result)
      return true
    }
    if (req.method === 'PATCH') {
      const payload = JSON.parse(await readBody(req, 64 * 1024))
      if (!payload?.id) {
        ok(res, req, 400, { error: 'missing id' })
        return true
      }
      const result = await auth.updateUser(payload.id, payload)
      ok(res, req, result.error ? 400 : 200, result)
      return true
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) {
        ok(res, req, 400, { error: 'missing id' })
        return true
      }
      const result = await auth.removeUser(id)
      ok(res, req, result.error ? 400 : 200, result)
      return true
    }
  }

  return false
}
