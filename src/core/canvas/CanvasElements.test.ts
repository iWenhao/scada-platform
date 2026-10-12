import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CanvasElements from '@/core/canvas/CanvasElements.vue'
import type { ComponentInstance } from '@/types/scada'
import type { ElementLayout } from '@/core/canvas/elementLayout'

/**
 * 造一组 visuals：每个函数都计数，用来断言「一次渲染里每个元素每项只求值一次」。
 * 这不是为了测 Konva（jsdom 里没有 canvas），而是守住渲染函数的调用次数——
 * 模板里同一项写多遍是很容易复发的性能问题，且静态检查看不出来。
 */
function makeVisuals() {
  const calls: Record<string, number> = {}
  const count = (name: string, value: unknown) => () => {
    calls[name] = (calls[name] || 0) + 1
    return value
  }
  const layout: ElementLayout = {
    showName: true,
    showValue: true,
    iconRect: { x: 0, y: 0, width: 40, height: 40 },
    nameY: 44,
    valueY: 60,
    fontSize: 12,
  } as unknown as ElementLayout

  return {
    calls,
    visuals: {
      getElementColor: count('color', '#39d353'),
      getIconStrokeColor: count('stroke', '#39d353'),
      getElementLayout: count('layout', layout),
      getLabelHeight: count('labelHeight', 14),
      getIconImageConfig: count('icon', { image: {}, width: 40, height: 40 }),
      getUserImageConfig: count('userImage', null),
      getElementMotion: count('motion', { running: true, speed: 1 }),
      isDisplayElement: count('isDisplay', false),
      getDisplayValueText: count('displayText', '12.5'),
      getElementValueText: count('valueText', '12.5'),
      isPipeFlowing: count('flowing', false),
      getElementPorts: count('ports', []),
      isLayerVisible: count('visible', true),
      isLayerLocked: count('locked', false),
    },
  }
}

function makeElement(id: string, type: string): ComponentInstance {
  return {
    id,
    type,
    x: 10,
    y: 20,
    width: 60,
    height: 80,
    rotation: 0,
    name: id,
    layerId: 'background',
    properties: {},
    statusRules: [],
    dataBindings: [],
  } as unknown as ComponentInstance
}

// v-layer / v-group 等由 unplugin 自动注册，测试环境里没有——用同名桩件顶上，
// 让模板能渲染出层级结构（本测试关心的是调用次数，不是 Konva 绘制结果）
function mountCanvas(elements: ComponentInstance[], activeTool = 'select') {
  const { visuals, calls } = makeVisuals()
  const stub = (name: string) =>
    defineComponent({ name, setup: (_, { slots }) => () => h('div', { 'data-stub': name }, slots?.default?.()) })

  const wrapper = mount(CanvasElements, {
    props: {
      elements,
      selectedIds: [],
      activeTool,
      snapToGrid: false,
      viewMode: '2d' as const,
      visuals: visuals as any,
      gridSnapFunc: undefined as any,
    },
    global: {
      stubs: {
        'v-layer': stub('v-layer'),
        'v-group': stub('v-group'),
        'v-image': stub('v-image'),
        'v-rect': stub('v-rect'),
        'v-text': stub('v-text'),
        'v-line': stub('v-line'),
        'v-circle': stub('v-circle'),
        ElementMotion: stub('ElementMotion'),
        PipeFlowLine: stub('PipeFlowLine'),
      },
    },
  })
  return { wrapper, calls }
}

describe('CanvasElements', () => {
  it('每个元素每项只求值一次（重复调用会让 Konva 每帧多跑几十倍的函数）', () => {
    const { calls } = mountCanvas([makeElement('el_1', 'valve')])

    expect(calls.layout).toBe(1)
    expect(calls.icon).toBe(1)
    expect(calls.userImage).toBe(1)
    expect(calls.motion).toBe(1)
    expect(calls.stroke).toBe(1) // 有运转动效才取描边色
  })

  it('按需计算：普通设备不碰只有管道/文本/数值图元才用到的项', () => {
    const { calls } = mountCanvas([makeElement('el_1', 'valve')])

    // 原模板里 getElementColor 出现在管道、文本、数值图元三处分支中，
    // 预计算必须保留这个条件——否则「省掉重复调用」会变成「给所有元素多算一堆用不上的东西」
    expect(calls.color).toBeUndefined()
    expect(calls.labelHeight).toBeUndefined()
    expect(calls.displayText).toBeUndefined()
    expect(calls.ports).toBeUndefined()
  })

  it('文本图元的取色只算一次', () => {
    const { calls } = mountCanvas([makeElement('txt_1', 'text')])
    expect(calls.color).toBe(1)
  })

  it('多元素时按元素各算一次，而不是按元素 × 模板出现次数', () => {
    const { calls } = mountCanvas([
      makeElement('el_1', 'valve'),
      makeElement('el_2', 'pump'),
      makeElement('el_3', 'tank'),
    ])

    expect(calls.layout).toBe(3)
    expect(calls.icon).toBe(3)
    expect(calls.motion).toBe(3)
  })

  it('管道专属配置只对管道元素计算', () => {
    const { calls } = mountCanvas([
      makeElement('el_1', 'valve'),
      makeElement('pipe_1', 'pipe'),
    ])

    // 只有一个管道元素：管身配置与标签高度各算一次
    expect(calls.labelHeight).toBe(1)
    expect(calls.flowing).toBe(1)
  })

  it('端口只在连线工具激活时计算', () => {
    const select = mountCanvas([makeElement('el_1', 'valve')], 'select')
    expect(select.calls.ports).toBeUndefined()

    const connect = mountCanvas([makeElement('el_1', 'valve')], 'connect')
    expect(connect.calls.ports).toBe(1)
  })

  // 下面几条守的是「分支条件没被预计算改坏」：原来这些条件写在模板的 v-if 里，
  // 现在搬到 computed，最容易出的错是条件合并后多渲染或少渲染一块。
  it('普通设备渲染名称与实时值两段文本', () => {
    const { wrapper } = mountCanvas([makeElement('el_1', 'valve')])
    expect(wrapper.findAll('[data-stub="v-text"]')).toHaveLength(2)
  })

  it('文本图元多一段正文：正文 + 名称 + 实时值', () => {
    const { wrapper } = mountCanvas([makeElement('txt_1', 'text')])
    expect(wrapper.findAll('[data-stub="v-text"]')).toHaveLength(3)
  })

  it('管道元素走管道分支（挂上 PipeFlowLine）', () => {
    const { wrapper } = mountCanvas([makeElement('pipe_1', 'pipe')])
    expect(wrapper.findAll('[data-stub="PipeFlowLine"]')).toHaveLength(1)
  })

  it('有运转动效的设备挂上 ElementMotion', () => {
    const { wrapper } = mountCanvas([makeElement('el_1', 'valve')])
    expect(wrapper.findAll('[data-stub="ElementMotion"]')).toHaveLength(1)
  })
})
