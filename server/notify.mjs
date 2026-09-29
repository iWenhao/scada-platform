/**
 * 报警通知通道模块（零依赖）
 *
 * 支持五类通道：Webhook / 企业微信机器人 / 钉钉机器人 / 邮件 SMTP / 短信 HTTP 网关。
 * 配置与发送均在服务端：密钥不进前端，浏览器只提交「报警事件」。
 *
 * 数据文件（DATA_DIR 下）：
 *   _notify.json       通道配置与节流间隔
 *   _notify_log.jsonl  发送记录（成功/失败/节流，保留最近 500 条）
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import tls from 'node:tls'
import { createHmac } from 'node:crypto'

const NOTIFY_FILE_NAME = '_notify.json'
const NOTIFY_LOG_FILE_NAME = '_notify_log.jsonl'
/** 发送记录条数上限：超出后裁掉最旧的 */
const NOTIFY_LOG_MAX = 500

/** 通道配置文件完整路径 */
export function notifyFilePath(dataDir) {
  return path.join(dataDir, NOTIFY_FILE_NAME)
}

/** 发送记录文件完整路径（JSONL，每行一条） */
export function notifyLogPath(dataDir) {
  return path.join(dataDir, NOTIFY_LOG_FILE_NAME)
}

/** 追加一条发送记录（成功/失败/节流） */
export async function appendNotifyLog(dataDir, entry) {
  const row = {
    t: Date.now(),
    kind: entry.kind || 'active',
    level: entry.level || 'warning',
    title: entry.title || '',
    channelId: entry.channelId || '',
    channelName: entry.channelName || '',
    channelType: entry.channelType || '',
    ok: !!entry.ok,
    error: entry.error || undefined,
    note: entry.note || undefined,
  }
  await fs.mkdir(dataDir, { recursive: true })
  await fs.appendFile(notifyLogPath(dataDir), JSON.stringify(row) + '\n', 'utf8')
  // 简单截断：读全文保留尾部，避免日志无限涨
  try {
    const text = await fs.readFile(notifyLogPath(dataDir), 'utf8')
    const lines = text.split('\n').filter(Boolean)
    if (lines.length > NOTIFY_LOG_MAX) {
      await fs.writeFile(notifyLogPath(dataDir), lines.slice(-NOTIFY_LOG_MAX).join('\n') + '\n', 'utf8')
    }
  } catch {
    // ignore
  }
}

/** 读最近 limit 条发送记录（新→旧） */
export async function readNotifyLog(dataDir, limit = 100) {
  try {
    const text = await fs.readFile(notifyLogPath(dataDir), 'utf8')
    const rows = []
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        rows.push(JSON.parse(line))
      } catch {
        // skip
      }
    }
    return rows.slice(-Math.max(1, limit)).reverse()
  } catch {
    return []
  }
}

/** 清空发送记录（保留文件本身） */
export async function clearNotifyLog(dataDir) {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(notifyLogPath(dataDir), '', 'utf8')
}

/** 简单模板：{{title}} {{message}} {{level}} {{time}} */
export function renderTemplate(tpl, vars) {
  return String(tpl || '').replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''))
}

/**
 * 读取通知配置。文件不存在或损坏时返回空配置（不抛错，便于首次启动）。
 * @returns {Promise<{ channels: Array, minIntervalMs: number }>}
 */
export async function loadNotifyConfig(dataDir) {
  try {
    const raw = await fs.readFile(notifyFilePath(dataDir), 'utf8')
    const parsed = JSON.parse(raw)
    return {
      channels: Array.isArray(parsed?.channels) ? parsed.channels : [],
      minIntervalMs: Number(parsed?.minIntervalMs) || 60000,
    }
  } catch {
    return { channels: [], minIntervalMs: 60000 }
  }
}

/**
 * 覆盖保存通知配置。minIntervalMs 非法时回落 60 秒。
 * @returns {Promise<{ channels: Array, minIntervalMs: number }>} 落盘后的内容
 */
export async function saveNotifyConfig(dataDir, config) {
  await fs.mkdir(dataDir, { recursive: true })
  const body = {
    channels: Array.isArray(config?.channels) ? config.channels : [],
    minIntervalMs: Number(config?.minIntervalMs) > 0 ? Number(config.minIntervalMs) : 60000,
  }
  await fs.writeFile(notifyFilePath(dataDir), JSON.stringify(body, null, 2), 'utf8')
  return body
}

/** 稳定的通道 id */
export function channelId(name, type) {
  return `nc_${type}_${String(name || 'ch').replace(/\W+/g, '')}_${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 拼装企微/钉钉共用的 Markdown 正文。
 * 级别映射：critical → 报警，其余 → 预警。
 */
function defaultBody(channel, event) {
  const text = `【${event.level === 'critical' ? '报警' : '预警'}】${event.title}\n${event.message}\n时间: ${event.timeText}`
  return text
}

/**
 * Webhook 通道：按配置的 URL/Method/Headers/Body 模板发 HTTP。
 * bodyTemplate 留空时发送默认 JSON（title/message/level/time/source）。
 */
async function sendWebhook(channel, event) {
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
async function sendDingTalk(channel, event) {
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
async function sendWeCom(channel, event) {
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
function smtpSend({ host, port, secure, user, pass, from, to, subject, text }) {
  return new Promise((resolve) => {
    const recipients = String(to || '')
      .split(/[,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
    if (!host || !from || recipients.length === 0) {
      resolve({ ok: false, error: 'SMTP 配置不完整' })
      return
    }

    const useImplicitTls = !!secure || Number(port) === 465
    let socket
    let buffer = ''
    let step = 0
    /** AUTH LOGIN: 0 未开始 / 1 已发用户名 / 2 已发口令 */
    let authStage = 0
    let rcptIndex = 0
    let finished = false

    const done = (result) => {
      if (finished) return
      finished = true
      try { socket?.end() } catch { /* ignore */ }
      resolve(result)
    }

    const reply = (cmd) => socket.write(cmd + '\r\n')

    const onData = (chunk) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split('\r\n')
      buffer = lines.pop() ?? ''
      const last = lines.filter(Boolean).pop() || ''
      const code = Number(last.slice(0, 3))
      if (Number.isNaN(code) || code < 100) return

      if (code >= 400) {
        done({ ok: false, error: last })
        return
      }

      // greeting
      if (step === 0 && code === 220) {
        step = 1
        reply('EHLO scada-platform')
        return
      }
      // EHLO 完成
      if (step === 1 && code === 250) {
        if (!useImplicitTls && /STARTTLS/i.test(last + buffer)) {
          step = 90
          reply('STARTTLS')
          return
        }
        step = 2
        if (user) reply('AUTH LOGIN')
        else reply('MAIL FROM:<' + from + '>')
        return
      }
      // STARTTLS 握手后再次 EHLO
      if (step === 90 && code === 220) {
        const plain = socket
        socket = tls.connect({
          socket: plain,
          servername: host,
          rejectUnauthorized: false,
        }, () => {
          reply('EHLO scada-platform')
        })
        socket.on('data', onData)
        socket.on('error', (e) => done({ ok: false, error: String(e.message || e) }))
        step = 91
        return
      }
      if (step === 91 && code === 250) {
        step = 2
        if (user) reply('AUTH LOGIN')
        else reply('MAIL FROM:<' + from + '>')
        return
      }
      // AUTH LOGIN
      if (step === 2 && code === 334) {
        if (authStage === 0) {
          authStage = 1
          reply(Buffer.from(user || '').toString('base64'))
        } else {
          authStage = 2
          reply(Buffer.from(pass || '').toString('base64'))
        }
        return
      }
      if (step === 2 && code === 235) {
        step = 3
        reply('MAIL FROM:<' + from + '>')
        return
      }
      if (step === 2 && code === 250 && authStage === 0 && !user) {
        step = 3
        reply('MAIL FROM:<' + from + '>')
        return
      }
      if (step === 2 && code === 250) {
        // 兼容：有的服务器 AUTH 成功直接 250
        step = 3
        reply('MAIL FROM:<' + from + '>')
        return
      }
      // MAIL FROM / RCPT TO
      if (step === 3 && code === 250) {
        step = 4
        reply('RCPT TO:<' + recipients[0] + '>')
        rcptIndex = 1
        return
      }
      if (step === 4 && code === 250) {
        if (rcptIndex < recipients.length) {
          reply('RCPT TO:<' + recipients[rcptIndex++] + '>')
          return
        }
        step = 5
        reply('DATA')
        return
      }
      if (step === 5 && code === 354) {
        const payload = [
          `From: ${from}`,
          `To: ${recipients.join(', ')}`,
          `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          Buffer.from(text, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
          '.',
        ].join('\r\n')
        reply(payload)
        step = 6
        return
      }
      if (step === 6 && code === 250) {
        reply('QUIT')
        done({ ok: true })
      }
    }

    const timer = setTimeout(() => done({ ok: false, error: 'SMTP 超时' }), 15000)

    if (useImplicitTls) {
      socket = tls.connect({
        host,
        port: Number(port) || 465,
        servername: host,
        rejectUnauthorized: false,
      })
    } else {
      socket = net.connect({ host, port: Number(port) || 25 })
    }
    socket.on('data', onData)
    socket.on('error', (e) => {
      clearTimeout(timer)
      done({ ok: false, error: String(e.message || e) })
    })
    socket.on('close', () => {
      clearTimeout(timer)
      if (!finished) done({ ok: false, error: 'SMTP 连接关闭' })
    })
  })
}

/**
 * 邮件通道：使用 smtpSend 发信，主题/正文支持 {{title}} 等模板变量。
 */
async function sendEmail(channel, event) {
  const c = channel.config || {}
  return smtpSend({
    host: c.smtpHost,
    port: Number(c.smtpPort) || (c.smtpSecure ? 465 : 25),
    secure: !!c.smtpSecure,
    user: c.smtpUser,
    pass: c.smtpPass,
    from: c.from || c.smtpUser,
    to: c.to,
    subject: renderTemplate(c.subjectTemplate || '【SCADA】{{level}} {{title}}', {
      title: event.title,
      message: event.message,
      level: event.level === 'critical' ? '报警' : '预警',
      time: event.timeText,
    }),
    text: renderTemplate(c.bodyTemplate || '{{message}}\n\n时间: {{time}}', {
      title: event.title,
      message: event.message,
      level: event.level === 'critical' ? '报警' : '预警',
      time: event.timeText,
    }),
  })
}

/** 短信：通用 HTTP 网关（阿里云/腾讯云等一般都有 HTTP API 或适配 URL） */
async function sendSms(channel, event) {
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

/**
 * 判断某通道是否应当为该事件外发。
 * 过滤维度：启用开关、报警级别（levels）、触发时机（notifyOn: active/recover）。
 */
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
