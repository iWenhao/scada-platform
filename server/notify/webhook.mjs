import { renderTemplate, defaultBody } from './common.mjs'

export async function sendWebhook(channel, event) {
  const url = channel.config?.url
  if (!url) return { ok: false, error: 'webhook url 为空' }
  const method = (channel.config?.method || 'POST').toUpperCase()
  let headers = { 'content-type': 'application/json' }
  if (channel.config?.headers) {
    try {
      headers = { ...headers, ...(typeof channel.config.headers === 'string' ? JSON.parse(channel.config.headers) : channel.config.headers) }
    } catch {
      return { ok: false, error: 'headers 不是合法 JSON' }
    }
  }
  const bodyTpl = channel.config?.bodyTemplate
  const body = bodyTpl
    ? renderTemplate(bodyTpl, {
        title: event.title,
        message: event.message,
        level: event.level,
        time: event.timeText,
      })
    : JSON.stringify({
        title: event.title,
        message: event.message,
        level: event.level,
        time: event.time,
        source: 'scada-platform',
      })

  const res = await fetch(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  })
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  return { ok: true }
}

/** 钉钉机器人：markdown 消息；可选加签 */
