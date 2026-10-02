import net from 'node:net'
import tls from 'node:tls'
import { renderTemplate } from './common.mjs'

export function smtpSend({ host, port, secure, user, pass, from, to, subject, text }) {
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
export async function sendEmail(channel, event) {
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

