/**
 * 通知通道共用：正文拼装、HTTP 发送、headers 归一化、配置读写、发送日志。
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import dns from 'node:dns'
import { appendJsonl, readJsonl } from '../lib/jsonl.mjs'
import { writeFileAtomic } from '../lib/atomicWrite.mjs'

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
 * 发送目标白名单校验（防 SSRF）。
 *
 * 通道 URL 是用户在配置页里填的，服务端会照着发请求——不做校验的话，
 * 填 `http://169.254.169.254/latest/meta-data/` 就能借服务器身份读云元数据，
 * 填内网地址则能探测/打到原本不可达的服务（这就是 SSRF）。
 *
 * 内网 webhook 在工业现场是正当用法，故默认拦私有地址、留显式开关：
 * `NOTIFY_ALLOW_PRIVATE=1` 放行内网目标。
 */
const ALLOW_PRIVATE_TARGET = process.env.NOTIFY_ALLOW_PRIVATE === '1'
const REQUEST_TIMEOUT_MS = Number(process.env.NOTIFY_TIMEOUT_MS) > 0
  ? Number(process.env.NOTIFY_TIMEOUT_MS)
  : 10000

/** 需要拦住的 IPv4 段：未指定 / 私有 / 回环 / 链路本地 / 组播 / 保留 */
/** @type {Array<[string, number]>} 基址 + 前缀位数 */
const BLOCKED_V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
]

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0
}

function isBlockedV4(ip) {
  const value = ipv4ToInt(ip)
  for (const [base, bits] of BLOCKED_V4) {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    if ((value & mask) === (ipv4ToInt(base) & mask)) return true
  }
  return false
}

function isBlockedV6(ip) {
  const s = String(ip).toLowerCase()
  if (s === '::' || s === '::1') return true
  if (/^f[cd][0-9a-f]{2}:/.test(s)) return true // fc00::/7 唯一本地地址
  if (/^fe[89ab][0-9a-f]:/.test(s)) return true // fe80::/10 链路本地

  // IPv4 映射地址按 IPv4 判。两种写法都要认：URL 解析会把点分形式规范化成十六进制
  // （`::ffff:127.0.0.1` → `::ffff:7f00:1`），只认前者等于放过整条绕过路径。
  const dotted = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) return isBlockedV4(dotted[1])
  const hex = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hex) {
    const hi = parseInt(hex[1], 16)
    const lo = parseInt(hex[2], 16)
    return isBlockedV4(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`)
  }
  return false
}

/**
 * 校验 URL 是否可以作为发送目标。
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function checkUrlAllowed(rawUrl) {
  let url
  try {
    url = new URL(String(rawUrl || ''))
  } catch {
    return { ok: false, error: 'URL 格式非法' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: `不支持的协议 ${url.protocol}` }
  }
  if (ALLOW_PRIVATE_TARGET) return { ok: true }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  const version = net.isIP(host)
  if (version === 4) {
    return isBlockedV4(host) ? { ok: false, error: '目标为内网/保留地址，已拒绝' } : { ok: true }
  }
  if (version === 6) {
    return isBlockedV6(host) ? { ok: false, error: '目标为内网/保留地址，已拒绝' } : { ok: true }
  }
  // 域名：解析后再判，否则 `localhost` 之类能绕过字面量检查
  let resolved
  try {
    resolved = await dns.promises.lookup(host, { all: true })
  } catch {
    return { ok: false, error: '目标域名无法解析' }
  }
  for (const entry of resolved) {
    const bad = net.isIP(entry.address) === 4 ? isBlockedV4(entry.address) : isBlockedV6(entry.address)
    if (bad) return { ok: false, error: '目标解析到内网/保留地址，已拒绝' }
  }
  return { ok: true }
}

/**
 * 通用 HTTP 发送：GET/HEAD 按约定省略 body，非 2xx 视为发送失败。
 * webhook / 短信网关等 HTTP 型通道共用。
 */
export async function sendHttp(url, { method = 'POST', headers, body }) {
  const guard = await checkUrlAllowed(url)
  if (!guard.ok) return { ok: false, error: guard.error }

  const m = String(method || 'POST').toUpperCase()
  try {
    const res = await fetch(url, {
      method: m,
      headers,
      body: m === 'GET' || m === 'HEAD' ? undefined : body,
      // 超时：无 signal 时目标不响应会把这次发送挂死
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // 不跟随重定向：校验的是初始 URL，跟随会让 302 成为绕过白名单的捷径
      redirect: 'manual',
    })
    if (!res.ok) {
      const why = res.type === 'opaqueredirect' ? '目标返回重定向，已拒绝跟随' : `HTTP ${res.status}`
      return { ok: false, error: why }
    }
    return { ok: true }
  } catch (e) {
    const why = e?.name === 'TimeoutError' ? `请求超时（${REQUEST_TIMEOUT_MS}ms）` : String(e?.message || e)
    return { ok: false, error: why }
  }
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
  await writeFileAtomic(notifyFilePath(dataDir), JSON.stringify(body, null, 2), 'utf8')
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
