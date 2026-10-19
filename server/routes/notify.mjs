/**
 * 通知路由：通道配置、连通性测试、报警外发、发送日志。
 * 通道 URL 的 SSRF 校验在 notify/common.mjs 的 sendHttp 内，配置保存时不校验（保存不是发请求）。
 *
 * 通道本身的发送结果属于业务数据：成功时结果进 data，失败时以 502 + code=channel_send_failed
 * 返回，并把是哪个通道放进 error.meta（配置了多个通道时，前端要能指出失败的那一个）。
 */
import { readBody } from '../lib/http.mjs'
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
  const { req, url, send, fail, guard, dataDir, notifyLastSent } = ctx

  if (url.pathname === '/api/notify/channels') {
    guard('engineer')
    if (req.method === 'GET') {
      send(200, await loadNotifyConfig(dataDir))
      return true
    }
    if (req.method === 'PUT') {
      send(200, await saveNotifyConfig(dataDir, JSON.parse(await readBody(req, 512 * 1024))))
      return true
    }
  }

  if (url.pathname === '/api/notify/test' && req.method === 'POST') {
    guard('engineer')
    const payload = JSON.parse(await readBody(req, 64 * 1024))
    const config = await loadNotifyConfig(dataDir)
    const channel = payload?.id
      ? config.channels.find(c => c.id === payload.id)
      : payload?.channel
    if (!channel) {
      fail(400, 'channel_not_found', '通道不存在，请先保存配置')
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
    if (result.ok) {
      send(200, { id: channel.id, name: channel.name, type: channel.type })
      return true
    }
    fail(502, 'channel_send_failed', result.error || '通道发送失败', {
      id: channel.id,
      name: channel.name,
    })
    return true
  }

  if (url.pathname === '/api/notify/log') {
    guard('engineer')
    if (req.method === 'GET') {
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500)
      send(200, await readNotifyLog(dataDir, limit))
      return true
    }
    if (req.method === 'DELETE') {
      await clearNotifyLog(dataDir)
      send(200, null)
      return true
    }
  }

  if (url.pathname === '/api/notify/send' && req.method === 'POST') {
    // 与 /api/notify/test 同级：会向全部已启用通道外发消息，不能只鉴身份不鉴角色
    guard('engineer')
    const payload = JSON.parse(await readBody(req, 256 * 1024))
    const event = {
      kind: payload?.kind === 'recover' ? 'recover' : 'active',
      level: payload?.level === 'critical' ? 'critical' : 'warning',
      title: String(payload?.title || 'SCADA 报警'),
      message: String(payload?.message || ''),
      time: Number(payload?.time) || Date.now(),
      timeText: String(payload?.timeText || new Date().toLocaleString('zh-CN')),
    }
    // 逐通道结果是业务数据（含每条自己的 ok/error/节流），整体请求成功即 200 返回数组
    send(200, await dispatchNotification(dataDir, event, notifyLastSent))
    return true
  }

  return false
}
