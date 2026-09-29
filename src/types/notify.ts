/** 通知通道类型 */
export type NotifyChannelType = 'webhook' | 'wecom' | 'dingtalk' | 'email' | 'sms'

export type NotifyKind = 'active' | 'recover'
export type NotifyLevel = 'warning' | 'critical'

export interface NotifyChannelConfig {
  /** webhook */
  url?: string
  method?: string
  headers?: string
  bodyTemplate?: string
  /** 企微 / 钉钉 */
  webhookUrl?: string
  secret?: string
  /** 邮件 SMTP */
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUser?: string
  smtpPass?: string
  from?: string
  to?: string
  subjectTemplate?: string
  /** 短信 HTTP 网关 */
  phones?: string
  [key: string]: unknown
}

export interface NotifyChannel {
  id: string
  name: string
  type: NotifyChannelType
  enabled: boolean
  levels?: NotifyLevel[]
  notifyOn?: NotifyKind[]
  config: NotifyChannelConfig
}

export interface NotifyConfig {
  channels: NotifyChannel[]
  minIntervalMs: number
}

export const NOTIFY_TYPE_LABELS: Record<NotifyChannelType, string> = {
  webhook: 'Webhook',
  wecom: '企业微信',
  dingtalk: '钉钉',
  email: '邮件 SMTP',
  sms: '短信网关',
}

export interface NotifyEvent {
  kind: NotifyKind
  level: NotifyLevel
  title: string
  message: string
  time: number
  timeText: string
}
