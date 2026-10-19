// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ELEMENT_COLOR,
  UNBOUND_ELEMENT_COLOR,
  evaluateElementColor,
  evaluateElementState,
} from './elementStatus'
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

describe('evaluateElementState · 未绑定是系统档', () => {
  const rules = [makeRule({ id: 'stopped', priority: 3, color: '#8c8c8c' })]

  it('data 为 null 时返回未绑定灰，且不产出命中规则', () => {
    const state = evaluateElementState(rules, null)
    expect(state.color).toBe(UNBOUND_ELEMENT_COLOR)
    expect(state.unbound).toBe(true)
    expect(state.rule).toBeNull()
  })

  it('未绑定优先于一切用户规则——用户配不出、也盖不掉这一档', () => {
    const always = makeRule({ id: 'always', priority: 1, color: '#ff4d4f',
      condition: { type: 'expression', expr: '1 > 0' } })
    expect(evaluateElementState([always], null).color).toBe(UNBOUND_ELEMENT_COLOR)
  })

  it('无状态组件没有未绑定概念，恒为默认色', () => {
    expect(evaluateElementState([], null)).toEqual({
      color: DEFAULT_ELEMENT_COLOR,
      rule: null,
      unbound: false,
    })
  })

  it('可信数据下按规则求值，并把命中的规则带出去（动效据此停转）', () => {
    const fault = makeRule({ id: 'fault', priority: 1, color: '#ff4d4f', stopMotion: true })
    const state = evaluateElementState([fault], { v: 5 })
    expect(state.color).toBe('#ff4d4f')
    expect(state.rule?.stopMotion).toBe(true)
    expect(state.unbound).toBe(false)
  })
})
