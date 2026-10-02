/**
 * 通知通道共用：正文拼装、HTTP 发送、headers 归一化、配置读写、发送日志。
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { appendJsonl, readJsonl } from '../lib/jsonl.mjs'

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

/**
 * 归一化自定义 headers：默认带 JSON content-type，支持 JSON 字符串或对象配置。
 * 解析失败返回 null，由调用方返回「headers 不是合法 JSON」。
 */
export function mergeHeaders(custom) {
  let headers = { 'content-type': 'application/json' }
  if (custom) {
    try {
      headers = { ...headers, ...(typeof custom === 'string' ? JSON.parse(custom) : custom) }
    } catch {
      return null
    }
  }
  return headers
}

/**
 * 通用 HTTP 发送：GET/HEAD 按约定省略 body，非 2xx 视为发送失败。
 * webhook / 短信网关等 HTTP 型通道共用。
 */
export async function sendHttp(url, { method = 'POST', headers, body }) {
  const m = String(method || 'POST').toUpperCase()
  const res = await fetch(url, {
    method: m,
    headers,
    body: m === 'GET' || m === 'HEAD' ? undefined : body,
  })
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  return { ok: true }
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

/** 追加一条发送记录（成功/失败/节流）；日志文件截断到 NOTIFY_LOG_MAX 条 */
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
  await appendJsonl(notifyLogPath(dataDir), row, { cap: NOTIFY_LOG_MAX })
}

export async function readNotifyLog(dataDir, limit = 100) {
  return readJsonl(notifyLogPath(dataDir), limit)
}

export async function clearNotifyLog(dataDir) {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(notifyLogPath(dataDir), '', 'utf8')
}
