import { describe, it, expect } from 'vitest'
import { withPropertyDefaults } from './elementDefaults'
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
    layerId: 'layer_default',
    properties,
    statusRules: [],
    dataBindings: [],
  } as ComponentInstance
}

/** 时间组件的精简定义：只留一个数字属性与一个字符串属性，便于断言 */
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
    { key: 'format', label: '显示格式', type: 'select', default: 'hms' },
    { key: 'customFormat', label: '自定义模板', type: 'string', default: '' },
    { key: 'showHeader', label: '显示表头', type: 'boolean', default: true },
  ],
} as unknown as ComponentDefinition

describe('withPropertyDefaults', () => {
  it('缺失的键补上定义里的 default', () => {
    expect(withPropertyDefaults(makeElement(), clockDef)).toEqual({
      fontSize: 24,
      format: 'hms',
      customFormat: '',
      showHeader: true,
    })
  })

  it('实例里已有的值不被覆盖', () => {
    const merged = withPropertyDefaults(makeElement({ fontSize: 40, format: 'ymd' }), clockDef)
    expect(merged.fontSize).toBe(40)
    expect(merged.format).toBe('ymd')
  })

  it('null 视同缺失，空串视为用户主动清空', () => {
    const merged = withPropertyDefaults(
      makeElement({ fontSize: null, customFormat: '' }),
      clockDef,
    )
    expect(merged.fontSize).toBe(24)
    expect(merged.customFormat).toBe('')
  })

  it('false / 0 这类有效值不当作缺失', () => {
    const def = {
      properties: [
        { key: 'loop', label: '循环', type: 'boolean', default: true },
        { key: 'decimals', label: '小数位', type: 'number', default: 1 },
      ],
    } as unknown as ComponentDefinition
    const merged = withPropertyDefaults(makeElement({ loop: false, decimals: 0 }), def)
    expect(merged.loop).toBe(false)
    expect(merged.decimals).toBe(0)
  })

  it('不修改实例本身，返回的是副本', () => {
    const element = makeElement()
    const merged = withPropertyDefaults(element, clockDef)
    expect(element.properties).toEqual({})
    merged.fontSize = 99
    expect(element.properties.fontSize).toBeUndefined()
  })

  it('定义缺失（未注册类型）时原样返回副本', () => {
    const merged = withPropertyDefaults(makeElement({ a: 1 }), null)
    expect(merged).toEqual({ a: 1 })
    expect(merged).not.toBe(undefined)
  })
})