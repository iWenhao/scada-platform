import { describe, it, expect } from 'vitest'
import { isNameShown, isValueShown, plainTextConfig } from './elementChrome'
import type { ComponentInstance } from '@/types/scada'

function makeElement(extra: Partial<ComponentInstance> = {}): ComponentInstance {
  return {
    id: 'el_1',
    type: 'motor',
    x: 10,
    y: 20,
    width: 80,
    height: 70,
    rotation: 0,
    name: '电机',
    layerId: 'device',
    properties: {},
    statusRules: [],
    dataBindings: [],
    ...extra,
  }
}

describe('elementChrome 显示开关解析', () => {
  it('旧数据无任何开关字段时，名称与数值均视为显示（兼容默认）', () => {
    const el = makeElement()
    expect(isNameShown(el)).toBe(true)
    expect(isValueShown(el)).toBe(true)
  })

  it('新组件显式关闭时隐藏对应内容', () => {
    const el = makeElement({ showName: false, showValue: false })
    expect(isNameShown(el)).toBe(false)
    expect(isValueShown(el)).toBe(false)
  })

  it('两个开关互不影响，可单独打开', () => {
    const el = makeElement({ showName: true, showValue: false })
    expect(isNameShown(el)).toBe(true)
    expect(isValueShown(el)).toBe(false)
  })

  it('拆分字段缺省时回退旧合并开关 showLabel', () => {
    const hidden = makeElement({ showLabel: false })
    expect(isNameShown(hidden)).toBe(false)
    expect(isValueShown(hidden)).toBe(false)

    const shown = makeElement({ showLabel: true })
    expect(isNameShown(shown)).toBe(true)
    expect(isValueShown(shown)).toBe(true)
  })

  it('拆分字段优先级高于旧合并开关', () => {
    // 旧画面 showLabel=false（全隐藏），用户单独打开名称后数值仍保持隐藏
    const el = makeElement({ showLabel: false, showName: true })
    expect(isNameShown(el)).toBe(true)
    expect(isValueShown(el)).toBe(false)
  })
})

describe('plainTextConfig（纯文本图元）', () => {
  const cfg = (properties: Record<string, unknown>, over: Partial<ComponentInstance> = {}) =>
    plainTextConfig(makeElement({ properties, ...over }), String(properties.text ?? '文本'), '#00d4aa')

  it('按属性面板取值：内容/字号/加粗/对齐', () => {
    const c = cfg({ text: '一号巷道', fontSize: 28, bold: true, align: 'right' })
    expect(c.fontSize).toBe(28)
    expect(c.fontStyle).toBe('bold')
    expect(c.align).toBe('right')
    expect(c.fill).toBe('#00d4aa')
  })

  it('缺省值：16px 常规体、水平垂直居中', () => {
    const c = cfg({})
    expect(c.fontSize).toBe(16)
    expect(c.fontStyle).toBe('normal')
    expect(c.align).toBe('center')
    expect(c.verticalAlign).toBe('middle')
  })

  it('字号夹在 8~200，防止撑爆元素或小到看不见', () => {
    expect(cfg({ fontSize: 9999 }).fontSize).toBe(200)
    expect(cfg({ fontSize: 1 }).fontSize).toBe(8)
    // 非数字（含 NaN / 字符串）回落默认值，不把 NaN 传给 Konva
    expect(cfg({ fontSize: 'abc' }).fontSize).toBe(16)
  })

  it('非法对齐值回落，避免 Konva 拿到未知 align / verticalAlign', () => {
    expect(cfg({ align: 'middle' }).align).toBe('center')
    expect(cfg({ valign: 'bottom' }).verticalAlign).toBe('middle')
    expect(cfg({ valign: 'top' }).verticalAlign).toBe('top')
  })

  it('带文本外发光且不参与命中', () => {
    const c = cfg({})
    expect(c.shadowBlur).toBeGreaterThan(0)
    expect(c.shadowColor).toContain('rgba')
    // 装饰层一律 listening:false，否则会挡住下层元素的点选
    expect(c.listening).toBe(false)
  })

  it('宽高取自元素本身，文字按元素范围排版', () => {
    const c = cfg({}, { width: 320, height: 90 })
    expect(c.width).toBe(320)
    expect(c.height).toBe(90)
  })
})
