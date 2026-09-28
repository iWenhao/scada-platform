import { describe, it, expect } from 'vitest'
import { resolveSeverity, isAlarmSeverity } from './severity'
import type { StatusRule } from '@/types/scada'

function rule(partial: Partial<StatusRule> = {}): StatusRule {
  return {
    id: 'r',
    name: '规则',
    color: '#ff4757',
    condition: { type: 'compare', variable: 'v', operator: '>', value: 0 },
    priority: 1,
    ...partial,
  }
}

describe('resolveSeverity', () => {
  it('显式 severity 优先于颜色', () => {
    expect(resolveSeverity(rule({ color: '#ff4757', severity: 'normal' }))).toBe('normal')
    expect(resolveSeverity(rule({ color: '#00d4aa', severity: 'critical' }))).toBe('critical')
  })

  it('缺失 severity 时按历史颜色约定兜底', () => {
    expect(resolveSeverity(rule({ color: '#ff4757' }))).toBe('critical')
    expect(resolveSeverity(rule({ color: '#ffa502' }))).toBe('warning')
  })

  it('颜色大小写不敏感', () => {
    expect(resolveSeverity(rule({ color: '#FF4757' }))).toBe('critical')
  })

  it('非告警色一律判为正常', () => {
    expect(resolveSeverity(rule({ color: '#00d4aa' }))).toBe('normal')
    expect(resolveSeverity(rule({ color: '#666666' }))).toBe('normal')
  })
})

describe('isAlarmSeverity', () => {
  it('只有预警与报警需要提示', () => {
    expect(isAlarmSeverity('critical')).toBe(true)
    expect(isAlarmSeverity('warning')).toBe(true)
    expect(isAlarmSeverity('normal')).toBe(false)
  })
})
