/**
 * server/notify.mjs 的 TypeScript 声明（前端测试引用时用）。
 * 与实现保持字段级对齐；运行时仍是零依赖 ESM。
 */

/** 投递给通道的报警事件 */
export interface NotifyEventLike {
  /** active=触发 / recover=恢复 */
  kind: string
  /** warning / critical */
  level: string
  title: string
  message: string
  /** 毫秒时间戳 */
  time: number
  /** 展示用时间文案 */
  timeText: string
}

/** 通知通道配置项 */
export interface NotifyChannelLike {
  id: string
  name: string
  /** webhook | wecom | dingtalk | email | sms */
  type: string
  enabled?: boolean
  /** 需要外发的级别，默认 ['warning','critical'] */
  levels?: string[]
  /** 触发时机，默认 ['active'] */
  notifyOn?: string[]
  /** 各类型的私有配置（url/secret/smtp 等） */
  config: Record<string, unknown>
}

/** 发送结果 */
export interface NotifySendResult {
  ok: boolean
  error?: string
}

/** 配置文件中的完整通知配置 */
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
): Promise<NotifySendResult>

export function dispatchNotification(
  dataDir: string,
  event: NotifyEventLike,
  lastSentAt?: Map<string, number>,
): Promise<Array<NotifySendResult & { id?: string; name?: string }>>

export function appendNotifyLog(dataDir: string, entry: Record<string, unknown>): Promise<void>
export function readNotifyLog(dataDir: string, limit?: number): Promise<Array<Record<string, unknown>>>
export function clearNotifyLog(dataDir: string): Promise<void>
