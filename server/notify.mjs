/**
 * 报警通知通道：Webhook / 企业微信 / 钉钉 / 邮件(SMTP) / 短信(HTTP)
 * 配置存 DATA_DIR/_notify.json，发送在此进程执行，密钥不进前端。
 *
 * 发送器拆在 notify/：webhook、bots、email、sms；本文件负责配置/日志/扇出。
 */
import { sendWebhook } from './notify/webhook.mjs'
import { sendDingTalk, sendWeCom } from './notify/bots.mjs'
import { sendEmail } from './notify/email.mjs'
import { sendSms } from './notify/sms.mjs'
import {
  loadNotifyConfig,
  saveNotifyConfig,
  appendNotifyLog,
  readNotifyLog,
  clearNotifyLog,
  renderTemplate,
} from './notify/common.mjs'

export {
  loadNotifyConfig,
  saveNotifyConfig,
  appendNotifyLog,
  readNotifyLog,
  clearNotifyLog,
  renderTemplate,
}

/**
 * 按通道类型分发到具体发送器。
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendToChannel(channel, event) {
  try {
    switch (channel.type) {
      case 'webhook':
        return await sendWebhook(channel, event)
      case 'dingtalk':
        return await sendDingTalk(channel, event)
      case 'wecom':
        return await sendWeCom(channel, event)
      case 'email':
        return await sendEmail(channel, event)
      case 'sms':
        return await sendSms(channel, event)
      default:
        return { ok: false, error: `未知通道类型 ${channel.type}` }
    }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

function shouldNotify(channel, event) {
  if (channel.enabled === false) return false
  const levels = channel.levels?.length ? channel.levels : ['warning', 'critical']
  if (!levels.includes(event.level)) return false
  const on = channel.notifyOn?.length ? channel.notifyOn : ['active']
  return on.includes(event.kind || 'active')
}

/**
 * 按配置扇出通知。返回每通道结果，并写入发送记录。
 * lastSentAt: Map<channelId, ts> 用于节流。
 */
export async function dispatchNotification(dataDir, event, lastSentAt = new Map()) {
  const config = await loadNotifyConfig(dataDir)
  const now = Date.now()
  const results = []
  for (const channel of config.channels) {
    if (!shouldNotify(channel, event)) continue
    const last = lastSentAt.get(channel.id) || 0
    if (now - last < config.minIntervalMs) {
      const skipped = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        ok: false,
        error: '节流中',
      }
      results.push(skipped)
      await appendNotifyLog(dataDir, {
        kind: event.kind,
        level: event.level,
        title: event.title,
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        ok: false,
        note: '节流中',
      })
      continue
    }
    const result = await sendToChannel(channel, event)
    // 不论成败都记入节流，避免故障时把告警风暴打进下游
    lastSentAt.set(channel.id, now)
    results.push({ id: channel.id, name: channel.name, type: channel.type, ...result })
    await appendNotifyLog(dataDir, {
      kind: event.kind,
      level: event.level,
      title: event.title,
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.type,
      ok: result.ok,
      error: result.error,
    })
  }
  return results
}
