import { resolveApiBase } from '@/storage/config'
import { authHeaders } from '@/auth/session'
import type { NotifyChannel, NotifyConfig, NotifyEvent, NotifyLevel, NotifyKind } from '@/types/notify'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body as T
}

export function loadNotifyConfig(): Promise<NotifyConfig> {
  return api<NotifyConfig>('/notify/channels')
}

export function saveNotifyConfig(config: NotifyConfig): Promise<NotifyConfig> {
  return api<NotifyConfig>('/notify/channels', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

export function testNotifyChannel(id: string): Promise<{ ok: boolean; error?: string }> {
  return api('/notify/test', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export interface NotifyLogEntry {
  t: number
  kind: string
  level: string
  title: string
  channelId: string
  channelName: string
  channelType: string
  ok: boolean
  error?: string
  note?: string
}

export async function loadNotifyLog(limit = 100): Promise<NotifyLogEntry[]> {
  const body = await api<{ entries: NotifyLogEntry[] }>(`/notify/log?limit=${limit}`)
  return body.entries || []
}

export function clearNotifyLog(): Promise<{ ok: boolean }> {
  return api('/notify/log', { method: 'DELETE' })
}

/** 报警事件扇出（触发/恢复）；失败不抛出，避免打断画面 */
export async function pushNotifyEvent(event: {
  kind: NotifyKind
  level: NotifyLevel
  title: string
  message: string
}): Promise<void> {
  const payload: NotifyEvent = {
    ...event,
    time: Date.now(),
    timeText: new Date().toLocaleString('zh-CN'),
  }
  try {
    await api('/notify/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    // 通知失败不影响报警展示
  }
}

export function emptyChannel(type: NotifyChannel['type']): Omit<NotifyChannel, 'id'> {
  return {
    name: type === 'webhook' ? 'Webhook' : type,
    type,
    enabled: true,
    levels: ['critical', 'warning'],
    notifyOn: ['active', 'recover'],
    config: {},
  }
}
