// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getElementCapabilities, registerComponents } from './registry'
import { widgetComponents } from './widget'
import type { ComponentDefinition } from '@/types/scada'

/** 本地驱动（不消费数据源）的挂件：日期 / 时间 / 视频 / 网页 / 超文本 */
const LOCAL_ONLY = ['date', 'clock', 'video', 'iframe', 'super-text']

describe('getElementCapabilities', () => {
  it('未注册的类型按全部支持处理——不把面板裁空', () => {
    expect(getElementCapabilities('not_registered_type')).toEqual({
      navigate: true,
      dataBinding: true,
      statusRules: true,
      nameLabel: true,
      valueLabel: true,
    })
  })

  it('定义未声明 capabilities 时按全部支持处理', () => {
    const bare: ComponentDefinition = {
      type: 'cap_bare',
      name: '裸定义',
      group: 'basic',
      icon: '',
      defaultWidth: 100,
      defaultHeight: 80,
      defaultConfig: {},
      statusRules: [],
      dataBindings: [],
      properties: [],
    }
    registerComponents([bare])
    expect(getElementCapabilities('cap_bare').nameLabel).toBe(true)
  })

  it('定义里显式关掉的项返回 false，其余仍为 true', () => {
    const limited: ComponentDefinition = {
      type: 'cap_limited',
      name: '受限定义',
      group: 'basic',
      icon: '',
      defaultWidth: 100,
      defaultHeight: 80,
      defaultConfig: {},
      statusRules: [],
      dataBindings: [],
      properties: [],
      capabilities: { dataBinding: false, nameLabel: false },
    }
    registerComponents([limited])
    expect(getElementCapabilities('cap_limited')).toEqual({
      navigate: true,
      dataBinding: false,
      statusRules: true,
      nameLabel: false,
      valueLabel: true,
    })
  })
})

/**
 * 挂件能力标注的回归护栏。
 *
 * 两条依据都不容易从代码表面看出来，过几个月很容易在新增挂件时漏标：
 * ① overlay 由 DOM 呈现、Konva 不再画线，状态色没有输出通道；
 * ② 名称条内容是 element.name（缺省即组件类型名），压在已经写着内容的图形
 *    下面不增加信息。
 */
describe('HTML 挂件的能力标注', () => {
  it('全部挂件都不支持名称条与状态规则', () => {
    registerComponents(widgetComponents)
    for (const def of widgetComponents) {
      const caps = getElementCapabilities(def.type)
      expect(caps.nameLabel, `${def.type} 的名称条`).toBe(false)
      expect(caps.statusRules, `${def.type} 的状态规则`).toBe(false)
    }
  })

  it('本地驱动型挂件连数据绑定与实时数值也不支持', () => {
    registerComponents(widgetComponents)
    for (const type of LOCAL_ONLY) {
      const caps = getElementCapabilities(type)
      expect(caps.dataBinding, `${type} 的数据绑定`).toBe(false)
      expect(caps.valueLabel, `${type} 的实时数值`).toBe(false)
    }
  })

  it('数据驱动型挂件仍保留数据绑定与实时数值', () => {
    registerComponents(widgetComponents)
    for (const def of widgetComponents) {
      if (LOCAL_ONLY.includes(def.type)) continue
      const caps = getElementCapabilities(def.type)
      expect(caps.dataBinding, `${def.type} 的数据绑定`).toBe(true)
      expect(caps.valueLabel, `${def.type} 的实时数值`).toBe(true)
    }
  })
})