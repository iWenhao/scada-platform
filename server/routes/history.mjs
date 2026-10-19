/**
 * 时序历史路由：采样写入与查询。
 * 采样点列表进 data，写入条数进 meta（见 lib/http.mjs 的响应体约定）。
 */
import { readBody } from '../lib/http.mjs'
import { ApiError } from '../lib/apiError.mjs'
import { appendSamples, querySamples } from '../lib/history.mjs'
import { assertKey } from '../lib/kv.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleHistory(ctx) {
  const { req, url, send, guard, historyDir, maxBodyBytes } = ctx

  if (url.pathname === '/api/history/write' && req.method === 'POST') {
    guard('operator')
    const payload = JSON.parse(await readBody(req, maxBodyBytes))
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ApiError(400, 'invalid_payload', '期望 { key: [{t,v}, ...] } 形式的采样对象')
    }
    let written = 0
    for (const [key, samples] of Object.entries(payload)) {
      if (!Array.isArray(samples)) continue
      // 历史按 key 落分片文件，超长 key 同样会让 fs 抛 ENAMETOOLONG，先在校验层拦成 400
      assertKey(key)
      written += await appendSamples(historyDir, String(key), samples)
    }
    send(200, null, { written })
    return true
  }

  // 查询：agg/window 为可选窗口聚合（与前端 historian.resolveAgg 对接）。
  // 不传则保持旧行为（均匀抽稀）；非法聚合参数回落为普通查询，不报错，
  // 避免旧版前端/手工调用因多带参数被拒绝。
  if (url.pathname === '/api/history/query' && req.method === 'GET') {
    const key = url.searchParams.get('key')
    assertKey(key)
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
    send(200, await querySamples(historyDir, key, from, to, maxPoints, { agg, windowMs }))
    return true
  }

  return false
}
