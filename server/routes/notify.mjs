/**
 * 通知路由：通道配置、连通性测试、报警外发、发送日志。
 * 通道 URL 的 SSRF 校验在 notify/common.mjs 的 sendHttp 内，配置保存时不校验（保存不是发请求）。
 */
import { readBody, requireRole } from '../lib/http.mjs'
import { roleAtLeast } from '../auth.mjs'
import {
  loadNotifyConfig,
  saveNotifyConfig,
  dispatchNotification,
  sendToChannel,
  readNotifyLog,
  clearNotifyLog,
  appendNotifyLog,
} from '../notify.mjs'

const TEST_EVENT_TITLE = '【测试】SCADA 通知通道'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleNotify(ctx) {
  const { req, res, url, ok, authn, dataDir, notifyLastSent } = ctx

  if (url.pathname === '/api/notify/channels') {
    if (!requireRole(authn, 'engineer', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    if (req.method === 'GET') {
      ok(res, req, 200, await loadNotifyConfig(dataDir))
      return true
    }
    if (req.method === 'PUT') {
      const saved = await saveNotifyConfig(dataDir, JSON.parse(await readBody(req, 512 * 1024)))
      ok(res, req, 200, saved)
      return true
    }
  }

  if (url.pathname === '/api/notify/test' && req.method === 'POST') {
    if (!requireRole(authn, 'engineer', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    const payload = JSON.parse(await readBody(req, 64 * 1024))
    const config = await loadNotifyConfig(dataDir)
    const channel = payload?.id
      ? config.channels.find(c => c.id === payload.id)
      : payload?.channel
    if (!channel) {
      ok(res, req, 400, { error: 'channel not found' })
      return true
    }
    const result = await sendToChannel(channel, {
      kind: 'active',
      level: 'warning',
      title: TEST_EVENT_TITLE,
      message: `通道「${channel.name}」连通性测试成功。`,
      time: Date.now(),
      timeText: new Date().toLocaleString('zh-CN'),
    })
    await appendNotifyLog(dataDir, {
      kind: 'active',
      level: 'warning',
      title: TEST_EVENT_TITLE,
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.type,
      ok: result.ok,
      error: result.error,
      note: '连通性测试',
    })
    ok(res, req, result.ok ? 200 : 502, { ...result, id: channel.id, name: channel.name })
    return true
  }

  if (url.pathname === '/api/notify/log') {
    if (!requireRole(authn, 'engineer', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    if (req.method === 'GET') {
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500)
      ok(res, req, 200, { entries: await readNotifyLog(dataDir, limit) })
      return true
    }
    if (req.method === 'DELETE') {
      await clearNotifyLog(dataDir)
      ok(res, req, 200, { ok: true })
      return true
    }
  }

  if (url.pathname === '/api/notify/send' && req.method === 'POST') {
    // 与 /api/notify/test 同级：会向全部已启用通道外发消息，不能只鉴身份不鉴角色
    if (!requireRole(authn, 'engineer', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    const payload = JSON.parse(await readBody(req, 256 * 1024))
    const event = {
      kind: payload?.kind === 'recover' ? 'recover' : 'active',
      level: payload?.level === 'critical' ? 'critical' : 'warning',
      title: String(payload?.title || 'SCADA 报警'),
      message: String(payload?.message || ''),
      time: Number(payload?.time) || Date.now(),
      timeText: String(payload?.timeText || new Date().toLocaleString('zh-CN')),
    }
    const results = await dispatchNotification(dataDir, event, notifyLastSent)
    ok(res, req, 200, { ok: true, results })
    return true
  }

  return false
}
