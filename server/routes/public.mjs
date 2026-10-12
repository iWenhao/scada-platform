/**
 * 无需鉴权的路由：健康检查、站点品牌读取、登录。
 *
 * 这些必须在鉴权之前分发——登录页本身是未鉴权页面，却要展示部署品牌。
 * 路由拆分见 server/index.mjs 的分发表。
 */
import { readValue, GLOBAL_SCOPE, SITE_BRANDING_KEY } from '../lib/kv.mjs'
import { readBody } from '../lib/http.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handlePublic(ctx) {
  const { req, res, url, ok, dataDir, auth, clientIp } = ctx

  if (url.pathname === '/api/health') {
    ok(res, req, 200, { ok: true })
    return true
  }

  // 品牌读取必须公开；写入在 storage.mjs 里另行要求 admin 角色
  if (url.pathname === '/api/branding' && req.method === 'GET') {
    const value = await readValue(dataDir, SITE_BRANDING_KEY, GLOBAL_SCOPE)
    ok(res, req, 200, { value })
    return true
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const payload = JSON.parse(await readBody(req, 64 * 1024))
    // 传来源 IP：auth 侧据此做失败限流，挡住同一来源反复试不同账号
    const result = await auth.login(payload?.username, payload?.password, clientIp)
    ok(res, req, result ? 200 : 401, result || { error: '用户名或口令错误' })
    return true
  }

  return false
}
