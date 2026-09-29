import { statusEngine } from '@/status/StatusEngine'
import type { Condition } from '@/types/scada'

/**
 * 报警判定状态机（纯函数，无副作用、无定时器）。
 *
 * 延时用时间戳比较实现而不是 setTimeout：报警判定在每次数据推送时增量执行，
 * 数据推送本身就是天然的时钟；用定时器反而要处理组件销毁、重连补偿等一堆生命周期问题。
 *
 * 死区（回差）语义：触发后，即使条件已不满足，也要等值偏离触发值足够远才恢复，
 * 抑制临界值附近反复进出报警的抖动。
 */

/** 单个报警定义的运行态（跨数据推送保持） */
export interface AlarmRuntime {
  /** 条件开始持续满足的时刻；undefined = 不在延时等待中 */
  pendingSince?: number
  /** 触发那一刻的变量值，死区恢复的基准 */
  triggerValue?: number
}

export type AlarmAction = 'none' | 'trigger' | 'clear'

export interface AlarmEvaluation {
  action: AlarmAction
  runtime: AlarmRuntime
}

export interface AlarmEvaluateInput {
  condition: Condition
  /** 条件里的变量名（单变量报警） */
  variable: string
  deadband: number
  onDelayMs: number
  /** 绑定变量当前值；undefined 表示数据尚未到达 */
  value: number | undefined
  /** 当前是否处于报警激活状态 */
  wasActive: boolean
  runtime: AlarmRuntime
  now: number
}

function conditionMet(condition: Condition, variable: string, value: number): boolean {
  return statusEngine.evaluateCondition(condition, { [variable]: value })
}

export function evaluateAlarmDef(input: AlarmEvaluateInput): AlarmEvaluation {
  const { condition, variable, deadband, onDelayMs, value, wasActive, runtime, now } = input

  // 数据未到达时维持现状：断数期间既不触发也不恢复，
  // 恢复需要真实数据支撑，否则通信一断所有报警"假恢复"
  if (value === undefined || Number.isNaN(value)) {
    return { action: 'none', runtime }
  }

  const met = conditionMet(condition, variable, value)

  if (!met) {
    // 条件不满足：等待中的延时作废，重新计时
    const runtimeNext: AlarmRuntime = { triggerValue: runtime.triggerValue }

    if (!wasActive) {
      return { action: 'none', runtime: runtimeNext }
    }

    // 已激活：判断是否走出死区
    const departed = deadband <= 0 || Math.abs(value - (runtime.triggerValue ?? value)) >= deadband
    if (departed) {
      return { action: 'clear', runtime: {} }
    }
    return { action: 'none', runtime: runtimeNext }
  }

  // 条件满足
  if (wasActive) {
    // 持续报警中，刷新死区基准外的状态即可
    return { action: 'none', runtime }
  }

  if (onDelayMs <= 0) {
    return { action: 'trigger', runtime: { triggerValue: value } }
  }

  const pendingSince = runtime.pendingSince ?? now
  if (now - pendingSince >= onDelayMs) {
    // 延时到达，真正触发
    return { action: 'trigger', runtime: { triggerValue: value } }
  }
  // 仍在延时等待中
  return { action: 'none', runtime: { pendingSince } }
}
