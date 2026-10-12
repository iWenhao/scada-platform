/**
 * 时序历史路由：采样写入与查询。
 */
import { readBody, requireRole } from '../lib/http.mjs'
import { roleAtLeast } from '../auth.mjs'
import { appendSamples, querySamples } from '../lib/history.mjs'
import { keyError } from '../lib/kv.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleHistory(ctx) {
  const { req, res, url, ok, authn, historyDir, maxBodyBytes } = ctx

  if (url.pathname === '/api/history/write' && req.method === 'POST') {
    if (!requireRole(authn, 'operator', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    const payload = JSON.parse(await readBody(req, maxBodyBytes))
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      ok(res, req, 400, { error: 'expected { key: [{t,v},...], ... }' })
      return true
    }
    let written = 0
    for (const [key, samples] of Object.entries(payload)) {
      if (!Array.isArray(samples)) continue
      // 历史按 key 落分片文件，超长 key 同样会让 fs 抛 ENAMETOOLONG
      const bad = keyError(key)
      if (bad) {
        ok(res, req, 400, { error: `invalid history key: ${bad}` })
        return true
      }
      written += await appendSamples(historyDir, String(key), samples)
    }
    ok(res, req, 200, { ok: true, written })
    return true
  }

  // 查询：agg/window 为可选窗口聚合（与前端 historian.resolveAgg 对接）。
  // 不传则保持旧行为（均匀抽稀）；非法聚合参数回落为普通查询，不报错，
  // 避免旧版前端/手工调用因多带参数被拒绝。
  if (url.pathname === '/api/history/query' && req.method === 'GET') {
    const key = url.searchParams.get('key')
    const bad = keyError(key)
    if (bad) {
      ok(res, req, 400, { error: bad })
      return true
    }
    const now = Date.now()
    const from = Number(url.searchParams.get('from')) || now - 24 * 3600 * 1000
    const to = Number(url.searchParams.get('to')) || now
    const maxPoints = Math.min(Math.max(Number(url.searchParams.get('maxPoints')) || 600, 1), 5000)
    const aggRaw = url.searchParams.get('agg')
    const windowRaw = Number(url.searchParams.get('window'))
    const agg = aggRaw === 'min' || aggRaw === 'avg' || aggRaw === 'max' ? aggRaw : undefined
    const windowMs = Number.isFinite(windowRaw) && windowRaw >= 1000 && windowRaw <= 24 * 3600 * 1000
      ? Math.round(windowRaw)
      : undefined
    const points = await querySamples(historyDir, key, from, to, maxPoints, { agg, windowMs })
    ok(res, req, 200, { points })
    return true
  }

  return false
}
