import { renderTemplate } from './common.mjs'

export async function sendSms(channel, event) {
  const c = channel.config || {}
  const url = c.url
  if (!url) return { ok: false, error: '短信网关 URL 为空' }
  let headers = { 'content-type': 'application/json' }
  if (c.headers) {
    try {
      headers = { ...headers, ...(typeof c.headers === 'string' ? JSON.parse(c.headers) : c.headers) }
    } catch {
      return { ok: false, error: 'headers 不是合法 JSON' }
    }
  }
  const phones = String(c.phones || '')
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
  const payloadText = renderTemplate(c.bodyTemplate || '{"phones":"{{phones}}","content":"{{message}}"}', {
    phones: phones.join(','),
    title: event.title,
    message: event.message.replace(/\n/g, ' '),
    level: event.level,
    time: event.timeText,
  })
  const method = (c.method || 'POST').toUpperCase()
  const res = await fetch(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : payloadText,
  })
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  return { ok: true }
}

/**
 * 按通道类型分发到具体发送器。
 * @returns {Promise<{ ok: boolean, error?: string }>} ok=false 时带失败原因
 */
