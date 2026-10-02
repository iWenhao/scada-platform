import { renderTemplate, mergeHeaders, sendHttp } from './common.mjs'

/** 短信：通用 HTTP 网关（阿里云/腾讯云等一般都有 HTTP API 或适配 URL） */
export async function sendSms(channel, event) {
  const c = channel.config || {}
  const url = c.url
  if (!url) return { ok: false, error: '短信网关 URL 为空' }
  const headers = mergeHeaders(c.headers)
  if (!headers) return { ok: false, error: 'headers 不是合法 JSON' }

  const phones = String(c.phones || '')
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
  const body = renderTemplate(c.bodyTemplate || '{"phones":"{{phones}}","content":"{{message}}"}', {
    phones: phones.join(','),
    title: event.title,
    message: event.message.replace(/\n/g, ' '),
    level: event.level,
    time: event.timeText,
  })
  return sendHttp(url, { method: c.method, headers, body })
}
