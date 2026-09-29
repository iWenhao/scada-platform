import { createHmac } from 'node:crypto'
import { defaultBody } from './common.mjs'

export async function sendDingTalk(channel, event) {
  let url = channel.config?.webhookUrl
  if (!url) return { ok: false, error: '钉钉 webhook 为空' }
  const secret = channel.config?.secret?.trim()
  if (secret) {
    const timestamp = Date.now()
    const stringToSign = `${timestamp}\n${secret}`
    const sign = createHmac('sha256', secret).update(stringToSign).digest('base64')
    url += `${url.includes('?') ? '&' : '?'}timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
  }
  const content = defaultBody(channel, event)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        title: event.title,
        text: content,
      },
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || (body.errcode !== undefined && body.errcode !== 0)) {
    return { ok: false, error: body.errmsg || `HTTP ${res.status}` }
  }
  return { ok: true }
}

/** 企业微信群机器人 */
export async function sendWeCom(channel, event) {
  const url = channel.config?.webhookUrl
  if (!url) return { ok: false, error: '企微 webhook 为空' }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: { content: defaultBody(channel, event) },
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || (body.errcode !== undefined && body.errcode !== 0)) {
    return { ok: false, error: body.errmsg || `HTTP ${res.status}` }
  }
  return { ok: true }
}

/** 极简 SMTP 客户端（AUTH LOGIN，支持 STARTTLS 或隐式 TLS） */
