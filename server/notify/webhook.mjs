import { renderTemplate, mergeHeaders, sendHttp } from './common.mjs'

/** Webhook：把报警事件 POST 到自定义 HTTP 端点，支持模板 body 与自定义 headers */
export async function sendWebhook(channel, event) {
  const url = channel.config?.url
  if (!url) return { ok: false, error: 'webhook url 为空' }
  const headers = mergeHeaders(channel.config?.headers)
  if (!headers) return { ok: false, error: 'headers 不是合法 JSON' }

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

  return sendHttp(url, { method: channel.config?.method, headers, body })
}
