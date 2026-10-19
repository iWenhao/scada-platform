/**
 * 无需鉴权的路由：健康检查、站点品牌读取、登录。
 *
 * 这些必须在鉴权之前分发——登录页本身是未鉴权页面，却要展示部署品牌。
 * 路由拆分见 server/index.mjs 的分发表。响应体一律走 ctx.send / ctx.fail（见 lib/http.mjs）。
 */
import { readValue, GLOBAL_SCOPE, SITE_BRANDING_KEY } from '../lib/kv.mjs'
import { readBody } from '../lib/http.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handlePublic(ctx) {
  const { req, url, send, fail, dataDir, auth, clientIp } = ctx

  if (url.pathname === '/api/health') {
    send(200, { status: 'ok' })
    return true
  }

  // 品牌读取必须公开；写入在 storage.mjs 里另行要求 admin 角色。
  // 值是前端写入的原始 JSON 文本，直接放 data（未设置过时为 null）。
  if (url.pathname === '/api/branding' && req.method === 'GET') {
    send(200, await readValue(dataDir, SITE_BRANDING_KEY, GLOBAL_SCOPE))
    return true
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const payload = JSON.parse(await readBody(req, 64 * 1024))
    // 传来源 IP：auth 侧据此做失败限流，挡住同一来源反复试不同账号
    const result = await auth.login(payload?.username, payload?.password, clientIp)
    if (!result) {
      // 口令错与账号被限流都回同一句文案：区分开等于告诉攻击者这个用户名存在
      fail(401, 'login_failed', '用户名或口令错误')
      return true
    }
    send(200, result)
    return true
  }

  return false
}
