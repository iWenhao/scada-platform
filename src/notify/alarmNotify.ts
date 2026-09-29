import { pushNotifyEvent } from './notifyClient'
import type { AlarmRecord } from '@/stores/alarmStore'

/** 报警记录 → 通知事件文案 */
export function alarmEventFromRecord(
  record: AlarmRecord,
  kind: 'active' | 'recover',
): {
  kind: 'active' | 'recover'
  level: 'warning' | 'critical'
  title: string
  message: string
} {
  const level = record.severity === 'critical' ? 'critical' : 'warning'
  const title =
    kind === 'active'
      ? `【${level === 'critical' ? '报警' : '预警'}】${record.elementName}`
      : `【恢复】${record.elementName}`
  const message = [
    `规则: ${record.ruleName}`,
    `设备/点: ${record.ruleId === record.elementId ? record.elementName : record.ruleId}`,
    `当前值: ${record.lastValue ?? record.value}`,
    kind === 'recover' ? `持续: ${formatDuration(record.clearedAt! - record.since)}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { kind, level, title, message }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${s % 60}s`
  return `${Math.floor(m / 60)}h${m % 60}m`
}

/** 异步发送，失败不影响报警 UI */
export function notifyAlarm(record: AlarmRecord, kind: 'active' | 'recover'): void {
  void pushNotifyEvent(alarmEventFromRecord(record, kind))
}
