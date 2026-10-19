/**
 * 审计路由：写值/操作留痕（任意登录用户可写），读取需 engineer 以上。
 * 审计不截断，保留完整追溯链。
 */
import { readBody } from '../lib/http.mjs'
import { appendAudit, readAudit } from '../lib/audit.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleAudit(ctx) {
  const { req, url, send, guard, authn, dataDir, auditMax } = ctx

  if (url.pathname === '/api/audit' && req.method === 'POST') {
    const payload = JSON.parse(await readBody(req, 256 * 1024))
    const operator = authn.master
      ? (payload.operator || 'service')
      : `${authn.user.displayName}(${authn.user.username})`
    await appendAudit(dataDir, {
      t: Date.now(),
      operator,
      deviceId: String(payload?.deviceId ?? ''),
      variable: String(payload?.variable ?? ''),
      value: String(payload?.value ?? ''),
      ok: !!payload?.ok,
      error: payload?.error ? String(payload.error) : undefined,
    })
    send(200, null)
    return true
  }

  if (url.pathname === '/api/audit' && req.method === 'GET') {
    guard('engineer')
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), auditMax)
    send(200, await readAudit(dataDir, limit))
    return true
  }

  return false
}
