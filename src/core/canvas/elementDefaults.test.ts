// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { normalizeProperties } from './elementDefaults'
import type { ComponentDefinition, ComponentInstance } from '@/types/scada'

function makeElement(properties: Record<string, any> = {}): ComponentInstance {
  return {
    id: 'el_1',
    type: 'clock',
    x: 0,
    y: 0,
    width: 180,
    height: 70,
    rotation: 0,
    name: '时间',
    properties,
    statusRules: [],
    dataBindings: [],
  } as ComponentInstance
}

/** 时间组件的精简定义：含 select / number / string / boolean 四种类型 */
const clockDef = {
  type: 'clock',
  name: '时间',
  group: 'basic',
  icon: '',
  defaultWidth: 180,
  defaultHeight: 70,
  defaultConfig: {},
  statusRules: [],
  dataBindings: [],
  properties: [
    { key: 'fontSize', label: '字号', type: 'number', default: 24 },
    {
      key: 'format',
      label: '显示格式',
      type: 'select',
      default: 'hms',
      options: [
        { label: '07:15:10', value: 'hms' },
        { label: '07:15', value: 'hm' },
        { label: '2026-10-13', value: 'ymd' },
      ],
    },
    { key: 'customFormat', label: '自定义模板', type: 'string', default: '' },
    { key: 'showHeader', label: '显示表头', type: 'boolean', default: true },
  ],
} as unknown as ComponentDefinition

describe('normalizeProperties · 缺失', () => {
  it('缺失的键补上定义里的 default', () => {
    expect(normalizeProperties(makeElement(), clockDef).values).toEqual({
      fontSize: 24,
      format: 'hms',
      customFormat: '',
      showHeader: true,
    })
  })

  it('实例里已有的值不被覆盖', () => {
    const { values } = normalizeProperties(makeElement({ fontSize: 40, format: 'ymd' }), clockDef)
    expect(values.fontSize).toBe(40)
    expect(values.format).toBe('ymd')
  })

  it('null 视同缺失，空串视为用户主动清空', () => {
    const { values } = normalizeProperties(
      makeElement({ fontSize: null, customFormat: '' }),
      clockDef,
    )
    expect(values.fontSize).toBe(24)
    expect(values.customFormat).toBe('')
  })

  it('false / 0 这类有效值不当作缺失', () => {
    const def = {
      properties: [
        { key: 'loop', label: '循环', type: 'boolean', default: true },
        { key: 'decimals', label: '小数位', type: 'number', default: 1 },
      ],
    } as unknown as ComponentDefinition
    const { values } = normalizeProperties(makeElement({ loop: false, decimals: 0 }), def)
    expect(values.loop).toBe(false)
    expect(values.decimals).toBe(0)
  })
})

describe('normalizeProperties · 非法取值', () => {
  it('select 存了不在 options 里的值时回退到 default，并留下提示', () => {
    const { values, notices } = normalizeProperties(makeElement({ format: 'ymd-week' }), clockDef)
    expect(values.format).toBe('hms')
    expect(notices.format).toEqual({
      key: 'format',
      label: '显示格式',
      raw: 'ymd-week',
      fallback: 'hms',
    })
  })

  it('正常值不产生提示', () => {
    const { notices } = normalizeProperties(makeElement({ format: 'hm' }), clockDef)
    expect(notices).toEqual({})
  })

  it('数字越界不拦：el-input-number 自带 clamp，不值得加提示噪音', () => {
    const { values, notices } = normalizeProperties(makeElement({ fontSize: 200 }), clockDef)
    expect(values.fontSize).toBe(200)
    expect(notices.fontSize).toBeUndefined()
  })

  it('字符串没有取值域，任何内容都不算非法', () => {
    const { values, notices } = normalizeProperties(
      makeElement({ customFormat: 'YYYY-MM-DD' }),
      clockDef,
    )
    expect(values.customFormat).toBe('YYYY-MM-DD')
    expect(notices.customFormat).toBeUndefined()
  })

  it('定义缺失（未注册类型）时原样返回副本', () => {
    const { values, notices } = normalizeProperties(makeElement({ a: 1 }), null)
    expect(values).toEqual({ a: 1 })
    expect(notices).toEqual({})
  })

  it('不修改实例本身，返回的是副本', () => {
    const element = makeElement()
    const { values } = normalizeProperties(element, clockDef)
    expect(element.properties).toEqual({})
    values.fontSize = 99
    expect(element.properties.fontSize).toBeUndefined()
  })
})