import { describe, it, expect } from 'vitest'
import { evaluateAlarmDef } from './alarmEngine'
import type { Condition } from '@/types/scada'

const COND_HIGH: Condition = { type: 'compare', variable: 'temp', operator: '>', value: 80 }

function run(overrides: Partial<Parameters<typeof evaluateAlarmDef>[0]> = {}) {
  return evaluateAlarmDef({
    condition: COND_HIGH,
    variable: 'temp',
    deadband: 0,
    onDelayMs: 0,
    value: 20,
    wasActive: false,
    runtime: {},
    now: 1000,
    ...overrides,
  })
}

describe('evaluateAlarmDef', () => {
  it('无延时死区：条件满足立即触发，不满足立即恢复', () => {
    expect(run({ value: 90 }).action).toBe('trigger')
    expect(run({ value: 90, wasActive: true, runtime: { triggerValue: 90 } }).action).toBe('none')
    expect(run({ value: 20, wasActive: true, runtime: { triggerValue: 90 } }).action).toBe('clear')
    expect(run({ value: 20 }).action).toBe('none')
  })

  it('数据未到达时维持现状：不触发也不恢复', () => {
    expect(run({ value: undefined, wasActive: true, runtime: { triggerValue: 90 } }).action).toBe('none')
    expect(run({ value: undefined }).action).toBe('none')
  })

  describe('延时触发', () => {
    const base = { onDelayMs: 5000 }

    it('首次满足进入等待，不立即触发', () => {
      const r = run({ ...base, value: 90, now: 1000 })
      expect(r.action).toBe('none')
      expect(r.runtime.pendingSince).toBe(1000)
    })

    it('持续满足到达时长后触发', () => {
      const r = run({ ...base, value: 90, now: 6000, runtime: { pendingSince: 1000 } })
      expect(r.action).toBe('trigger')
      expect(r.runtime.triggerValue).toBe(90)
      expect(r.runtime.pendingSince).toBeUndefined()
    })

    it('等待期间条件不满足则取消计时', () => {
      const r = run({ ...base, value: 20, now: 3000, runtime: { pendingSince: 1000 } })
      expect(r.action).toBe('none')
      expect(r.runtime.pendingSince).toBeUndefined()
    })

    it('条件中断后重新计时（陈旧的 pendingSince 不应被继承）', () => {
      // 等待被打断后又满足：pendingSince 应取当前时刻，而不是沿用旧的
      const r = run({ ...base, value: 90, now: 2000 })
      expect(r.runtime.pendingSince).toBe(2000)
    })
  })

  describe('死区（回差）', () => {
    const base = { deadband: 5, wasActive: true }

    it('条件不满足但仍在死区内：保持报警', () => {
      const r = run({ ...base, value: 78, runtime: { triggerValue: 82 } })
      expect(r.action).toBe('none')
    })

    it('值偏离触发值达到死区幅度：恢复', () => {
      const r = run({ ...base, value: 75, runtime: { triggerValue: 82 } })
      expect(r.action).toBe('clear')
    })

    it('恢复后运行态被完全清空', () => {
      const r = run({ ...base, value: 70, runtime: { triggerValue: 82, pendingSince: 1 } })
      expect(r.action).toBe('clear')
      expect(r.runtime).toEqual({})
    })

    it('死区为 0 时条件不满足立即恢复', () => {
      expect(run({ wasActive: true, value: 79, runtime: { triggerValue: 90 } }).action).toBe('clear')
    })
  })

  it('区间条件同样适用', () => {
    const rangeCond: Condition = { type: 'range', variable: 'temp', min: 60, max: 80 }
    expect(run({ condition: rangeCond, value: 70 }).action).toBe('trigger')
    expect(run({ condition: rangeCond, value: 10 }).action).toBe('none')
  })
})
