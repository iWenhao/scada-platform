/**
 * 通知通道共用：正文拼装、配置读写。
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

const NOTIFY_FILE_NAME = '_notify.json'
const NOTIFY_LOG_FILE_NAME = '_notify_log.jsonl'
const NOTIFY_LOG_MAX = 500

export function notifyFilePath(dataDir) {
  return path.join(dataDir, NOTIFY_FILE_NAME)
}

export function notifyLogPath(dataDir) {
  return path.join(dataDir, NOTIFY_LOG_FILE_NAME)
}

/** 简单模板：{{title}} {{message}} {{level}} {{time}} */
export function renderTemplate(tpl, vars) {
  return String(tpl || '').replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''))
}

export function defaultBody(channel, event) {
  return `【${event.level === 'critical' ? '报警' : '预警'}】${event.title}\n${event.message}\n时间: ${event.timeText}`
}

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

export async function saveNotifyConfig(dataDir, config) {
  await fs.mkdir(dataDir, { recursive: true })
  const body = {
    channels: Array.isArray(config?.channels) ? config.channels : [],
    minIntervalMs: Number(config?.minIntervalMs) > 0 ? Number(config.minIntervalMs) : 60000,
  }
  await fs.writeFile(notifyFilePath(dataDir), JSON.stringify(body, null, 2), 'utf8')
  return body
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
  try {
    const text = await fs.readFile(notifyLogPath(dataDir), 'utf8')
    const rows = text.split('\n').filter(Boolean)
    if (rows.length > NOTIFY_LOG_MAX) {
      await fs.writeFile(notifyLogPath(dataDir), rows.slice(-NOTIFY_LOG_MAX).join('\n') + '\n', 'utf8')
    }
  } catch {
    // ignore
  }
}

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

export async function clearNotifyLog(dataDir) {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(notifyLogPath(dataDir), '', 'utf8')
}
