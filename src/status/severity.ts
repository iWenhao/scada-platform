import type { AlarmSeverity, StatusRule } from '@/types/scada'

/**
 * 报警级别的兜底推断：旧项目与未标注 severity 的规则没有该字段，
 * 此时沿用历史约定按颜色推断，保证存量数据仍有正确的报警行为。
 */
const LEGACY_COLOR_SEVERITY: Record<string, AlarmSeverity> = {
  '#ff4757': 'critical',
  '#ffa502': 'warning',
}

/** 解析状态规则的报警级别（显式 severity 优先，缺失时按颜色兜底） */
export function resolveSeverity(rule: StatusRule): AlarmSeverity {
  if (rule.severity) return rule.severity
  return LEGACY_COLOR_SEVERITY[rule.color?.toLowerCase()] ?? 'normal'
}

/** 该级别是否需要在报警面板中提示 */
export function isAlarmSeverity(severity: AlarmSeverity): boolean {
  return severity === 'warning' || severity === 'critical'
}
