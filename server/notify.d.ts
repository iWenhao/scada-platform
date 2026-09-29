export interface NotifyEventLike {
  kind: string
  level: string
  title: string
  message: string
  time: number
  timeText: string
}

export interface NotifyChannelLike {
  id: string
  name: string
  type: string
  enabled?: boolean
  levels?: string[]
  notifyOn?: string[]
  config: Record<string, unknown>
}

export function renderTemplate(tpl: string, vars: Record<string, unknown>): string
export function loadNotifyConfig(dataDir: string): Promise<{
  channels: NotifyChannelLike[]
  minIntervalMs: number
}>
export function saveNotifyConfig(
  dataDir: string,
  config: { channels: NotifyChannelLike[]; minIntervalMs?: number },
): Promise<{ channels: NotifyChannelLike[]; minIntervalMs: number }>
export function sendToChannel(
  channel: NotifyChannelLike,
  event: NotifyEventLike,
): Promise<{ ok: boolean; error?: string }>
export function dispatchNotification(
  dataDir: string,
  event: NotifyEventLike,
  lastSentAt?: Map<string, number>,
): Promise<Array<{ ok: boolean; error?: string; id?: string; name?: string }>>
