import { apiData, apiFetch } from '@/api/client'
import type { NotifyChannel, NotifyConfig, NotifyEvent, NotifyLevel, NotifyKind } from '@/types/notify'

/**
 * 通知接口客户端。URL 拼装、鉴权头与响应拆解都在 @/api/client，
 * 这里只保留「哪个端点、返回什么类型」。
 * 失败统一抛 ApiRequestError（含服务端中文 message），调用方直接展示即可。
 */

export function loadNotifyConfig(): Promise<NotifyConfig> {
  return apiData<NotifyConfig>('/notify/channels')
}

export function saveNotifyConfig(config: NotifyConfig): Promise<NotifyConfig> {
  return apiData<NotifyConfig>('/notify/channels', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

/**
 * 连通性测试。通道发不出去时服务端返回 502 + code=channel_send_failed，
 * 这里以抛错表达失败（message 已是「哪个环节没通」的人话），成功只需 resolve。
 */
export async function testNotifyChannel(id: string): Promise<void> {
  await apiFetch('/notify/test', {
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
  const entries = await apiData<NotifyLogEntry[]>(`/notify/log?limit=${limit}`)
  return Array.isArray(entries) ? entries : []
}

export async function clearNotifyLog(): Promise<void> {
  await apiFetch('/notify/log', { method: 'DELETE' })
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
    await apiFetch('/notify/send', {
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
