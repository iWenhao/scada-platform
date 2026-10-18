// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isNameShown, isValueShown, plainTextConfig, commandButtonConfig } from './elementChrome'
import type { ElementLayout } from './elementLayout'
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

describe('commandButtonConfig（操作按钮图元）', () => {
  // 按钮关掉了名称条与实时值，图形区即整个元素
  const layout: ElementLayout = {
    pad: 4,
    nameHeight: 0,
    valueHeight: 0,
    showName: false,
    showValue: false,
    contentX: 4,
    contentY: 4,
    contentWidth: 92,
    contentHeight: 32,
    nameFontSize: 0,
    nameY: 0,
    valueFontSize: 0,
    valueY: 0,
    displayFontSize: 14,
    displayY: 10,
  }

  const cfg = (properties: Record<string, unknown>) =>
    commandButtonConfig(
      makeElement({ type: 'command-button', properties }),
      layout,
      '#00d4aa',
    )

  it('按钮面取属性里的文字，未配置时给占位而不是空白', () => {
    expect(cfg({ label: '启动' }).text.text).toBe('启动')
    expect(cfg({}).text.text).toBe('按钮')
  })

  it('未指定强调色时，描边与文字走元素状态色', () => {
    const c = cfg({ label: '启动' })
    expect(c.body.stroke).toBe('#00d4aa')
    expect(c.text.fill).toBe('#00d4aa')
  })

  it('指定强调色后覆盖状态色（红停绿开这类固定配色）', () => {
    const c = cfg({ label: '停止', accent: '#e24b4a' })
    expect(c.body.stroke).toBe('#e24b4a')
    expect(c.text.fill).toBe('#e24b4a')
  })

  it('字号夹在 10~48，非数字回落默认 14', () => {
    expect(cfg({ fontSize: 999 }).text.fontSize).toBe(48)
    expect(cfg({ fontSize: 2 }).text.fontSize).toBe(10)
    expect(cfg({ fontSize: 'abc' }).text.fontSize).toBe(14)
  })

  it('按下态只换填充，形状与位置不变（避免视觉上跳一下）', () => {
    const el = makeElement({ type: 'command-button', properties: { label: '启动' } })
    const normal = commandButtonConfig(el, layout, '#00d4aa')
    const pressed = commandButtonConfig(el, layout, '#00d4aa', true)
    expect(pressed.body.fill).not.toBe(normal.body.fill)
    expect(pressed.body.width).toBe(normal.body.width)
    expect(pressed.body.x).toBe(normal.body.x)
    expect(pressed.text.text).toBe(normal.text.text)
  })

  it('文字居中且不参与命中，按钮本体可点', () => {
    const c = cfg({ label: '启动' })
    expect(c.text.align).toBe('center')
    expect(c.text.verticalAlign).toBe('middle')
    expect(c.text.listening).toBe(false)
    expect(c.body.listening).toBe(true)
  })

  it('按钮占据整个图形区，不留名称/数值分区', () => {
    const c = cfg({ label: '启动' })
    expect(c.body.x).toBe(layout.contentX)
    expect(c.body.y).toBe(layout.contentY)
    expect(c.body.width).toBe(layout.contentWidth)
    expect(c.body.height).toBe(layout.contentHeight)
  })
})
