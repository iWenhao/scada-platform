import { describe, expect, it } from 'vitest'
import { DEFAULT_ELEMENT_COLOR, evaluateElementColor } from './elementStatus'
import type { StatusRule } from '@/types/scada'

function makeRule(partial: Partial<StatusRule>): StatusRule {
  return {
    id: 'r1',
    name: '规则',
    color: '#ff0000',
    condition: { type: 'compare', variable: 'v', operator: '>', value: 0 },
    priority: 5,
    ...partial,
  }
}

describe('evaluateElementColor', () => {
  it('无规则或未命中时返回默认色', () => {
    expect(evaluateElementColor([], { v: 10 })).toBe(DEFAULT_ELEMENT_COLOR)
    expect(evaluateElementColor([makeRule({})], { v: -1 })).toBe(DEFAULT_ELEMENT_COLOR)
    expect(evaluateElementColor([makeRule({})], {})).toBe(DEFAULT_ELEMENT_COLOR)
  })

  it('命中规则时返回规则色', () => {
    expect(evaluateElementColor([makeRule({ color: '#ffa502' })], { v: 3 })).toBe('#ffa502')
  })

  it('多条命中时取优先级数字最小的规则色（与 2D 画布口径一致）', () => {
    const rules = [
      makeRule({ id: 'low', priority: 5, color: '#ff4757' }),
      makeRule({ id: 'high', priority: 1, color: '#00d4aa' }),
    ]
    expect(evaluateElementColor(rules, { v: 3 })).toBe('#00d4aa')
  })
})
