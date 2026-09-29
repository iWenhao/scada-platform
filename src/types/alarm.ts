import type { AlarmSeverity, Condition } from './scada'

/**
 * 独立报警定义。
 *
 * 与元素 statusRules 派生的报警解耦：状态规则负责画面着色，
 * 报警定义负责"哪个变量的什么工况必须被人知道"，直接绑定数据源变量，
 * 不要求画布上存在对应元素（比如无人值守的储罐液位越限）。
 */
export interface AlarmDefinition {
  id: string
  name: string
  /** 绑定的数据源设备 */
  deviceId: string
  /** 绑定的变量名 */
  variable: string
  severity: Exclude<AlarmSeverity, 'normal'>
  /** 触发条件（变量以自身值参与比较，条件里的 variable 应与上面一致） */
  condition: Condition
  /**
   * 死区/回差：恢复时当前值需偏离触发值至少该幅度（数值变量）。
   * 0 = 条件一不满足立即恢复。用于抑制临界值附近的报警抖动。
   */
  deadband: number
  /**
   * 延时触发（毫秒）：条件需持续满足该时长才真正报警，
   * 期间条件不满足则重新计时。用于过滤瞬时毛刺。
   */
  onDelayMs: number
  enabled: boolean
}

/** 从工程 JSON 恢复时的兜底（缺字段时给默认值，兼容手写/旧版本工程文件） */
export function normalizeAlarmDef(raw: any): AlarmDefinition | null {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.id !== 'string' || typeof raw.deviceId !== 'string' || typeof raw.variable !== 'string') {
    return null
  }
  if (!raw.condition || typeof raw.condition !== 'object') return null
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : raw.variable,
    deviceId: raw.deviceId,
    variable: raw.variable,
    severity: raw.severity === 'critical' ? 'critical' : 'warning',
    condition: raw.condition,
    deadband: typeof raw.deadband === 'number' ? raw.deadband : 0,
    onDelayMs: typeof raw.onDelayMs === 'number' ? raw.onDelayMs : 0,
    enabled: raw.enabled !== false,
  }
}
