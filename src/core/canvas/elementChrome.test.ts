import { describe, it, expect } from 'vitest'
import {
  isNameShown,
  isValueShown,
  isPureShapeMode,
  hasIntrinsicGraphic,
} from './elementChrome'
import { registerComponents } from '@/industrial/registry'
import { basicComponents } from '@/industrial/basic'
import type { ComponentInstance } from '@/types/scada'

// hasIntrinsicGraphic 依赖组件注册表，测试前注册内置组件
registerComponents(basicComponents)

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

describe('elementChrome 纯图形模式', () => {
  it('名称与数值都隐藏时进入纯图形模式', () => {
    expect(isPureShapeMode(makeElement({ showName: false, showValue: false }))).toBe(true)
    expect(isPureShapeMode(makeElement({ showName: false, showValue: true }))).toBe(false)
    expect(isPureShapeMode(makeElement({ showName: true, showValue: false }))).toBe(false)
  })

  it('自带图形主体的类型（管线/带图组件）在纯图形模式可安全去掉卡片', () => {
    expect(hasIntrinsicGraphic(makeElement({ type: 'pipe' }))).toBe(true)
    expect(hasIntrinsicGraphic(makeElement({ type: 'pump' }))).toBe(true)
  })

  it('无自绘图形的未知类型保留卡片描边兜底，避免元素不可见', () => {
    expect(hasIntrinsicGraphic(makeElement({ type: 'not-exist-type' }))).toBe(false)
  })
})
