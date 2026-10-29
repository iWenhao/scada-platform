// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ComponentInstance } from '@/types/scada'
import {
  pipeGeometry,
  pipeBodyConfigs,
  pipeDashConfig,
  registerFlowAnimation,
} from './pipeFlow'

function makePipe(extra: Partial<ComponentInstance> = {}): ComponentInstance {
  return {
    id: 'el_pipe',
    type: 'pipe',
    x: 0,
    y: 0,
    width: 192,
    height: 80,
    rotation: 0,
    name: '管道',
    properties: { diameter: 50, showFlow: true, flowDirection: 'forward', flowSpeed: 1 },
    statusRules: [],
    dataBindings: [],
    ...extra,
  }
}

describe('pipeGeometry', () => {
  it('默认管径 50 时管身占可用高度一半，左右各留 6px', () => {
    const g = pipeGeometry(makePipe(), 0)
    expect(g.left).toBe(6)
    expect(g.right).toBe(186)
    // boxH = 80 - 0 - 10 = 70，管身 35，中线 y = 4 + 35 = 39
    expect(g.bodyH).toBe(35)
    expect(g.midY).toBe(39)
  })

  it('管径映射有上下限钳制', () => {
    const thin = pipeGeometry(makePipe({ properties: { diameter: 10 } }), 0)
    const thick = pipeGeometry(makePipe({ properties: { diameter: 500 } }), 0)
    expect(thin.bodyH).toBeCloseTo(70 * 0.18)
    expect(thick.bodyH).toBeCloseTo(70 * 0.72)
  })

  it('标签条高度会把管身可用区上移', () => {
    const g = pipeGeometry(makePipe(), 26)
    // boxH = 80 - 26 - 10 = 44，中线 y = 4 + 22 = 26
    expect(g.midY).toBe(26)
    expect(g.bodyH).toBe(22)
  })
})

describe('pipeBodyConfigs', () => {
  it('返回上下管壁与两端法兰共 4 条线，颜色跟随状态色', () => {
    const cfgs = pipeBodyConfigs(makePipe(), '#00d4aa', 0)
    expect(cfgs).toHaveLength(4)
    const g = pipeGeometry(makePipe(), 0)
    expect(cfgs[0].points).toEqual([g.left, g.midY - g.bodyH / 2, g.right, g.midY - g.bodyH / 2])
    expect(cfgs[0].stroke).toBe('#00d4aa')
    expect(cfgs[1].points).toEqual([g.left, g.midY + g.bodyH / 2, g.right, g.midY + g.bodyH / 2])
    // 法兰是圆头竖线，略高于管身
    expect(cfgs[2].points[0]).toBe(g.left)
    expect(cfgs[2].strokeWidth).toBe(5)
    expect(cfgs[3].points[0]).toBe(g.right)
  })

  it('2.5D 换成渐变管身：渐变档位取自 barrel token，端点与 2D 管壁重合', () => {
    const cfgs = pipeBodyConfigs(makePipe(), '#00d4aa', 0, '25d')
    // 管身 + 两条棱线 + 两端法兰 + 两道接缝
    expect(cfgs).toHaveLength(7)
    const g = pipeGeometry(makePipe(), 0)
    const [body, hi, lo] = cfgs
    expect(body.points).toEqual([g.left, g.midY, g.right, g.midY])
    expect(body.strokeWidth).toBe(g.bodyH)
    // 亮带在天顶、向下逐档压暗（与 FACE_STYLE.barrel 同一组数字）
    expect(body.strokeLinearGradientColorStops).toEqual([
      0, 'rgba(0,212,170,0.9)',
      0.16, 'rgba(0,212,170,0.96)',
      0.55, 'rgba(0,212,170,0.62)',
      0.82, 'rgba(0,212,170,0.34)',
      1, 'rgba(0,212,170,0.14)',
    ])
    expect(body.strokeLinearGradientStartPoint).toEqual({ x: 0, y: g.midY - g.bodyH / 2 })
    expect(hi.points).toEqual([g.left, g.midY - g.bodyH / 2, g.right, g.midY - g.bodyH / 2])
    expect(lo.points).toEqual([g.left, g.midY + g.bodyH / 2, g.right, g.midY + g.bodyH / 2])
    // 法兰与管身共用同一条渐变轴，接缝处不断层
    expect(cfgs[3].strokeLinearGradientColorStops).toEqual(body.strokeLinearGradientColorStops)
    expect(cfgs[3].points[0]).toBe(g.left)
    expect(cfgs[4].points[0]).toBe(g.right)
  })

  it('颜色解析不了时退回 2D 线条稿，不画没有明暗的实心条', () => {
    const cfgs = pipeBodyConfigs(makePipe(), 'var(--pipe-color)', 0, '25d')
    expect(cfgs).toHaveLength(4)
    expect(cfgs[0].strokeWidth).toBe(2)
  })
})

describe('pipeDashConfig', () => {
  it('静止时 dashOffset 归零且颜色跟随状态色', () => {
    const cfg = pipeDashConfig(makePipe(), '#666666', 0, { flowing: false, offset: 999 })
    expect(cfg.dashOffset).toBe(0)
    expect(cfg.stroke).toBe('#666666')
  })

  it('流动时按流向与流速推进 dashOffset', () => {
    const forward = pipeDashConfig(makePipe(), '#00d4aa', 0, { flowing: true, offset: 100 })
    expect(forward.dashOffset).toBe(-60)
    const reverse = pipeDashConfig(
      makePipe({ properties: { diameter: 50, flowDirection: 'reverse', flowSpeed: 2 } }),
      '#00d4aa',
      0,
      { flowing: true, offset: 100 },
    )
    expect(reverse.dashOffset).toBe(120)
  })

  it('showFlow 关闭时虚线不可见', () => {
    const cfg = pipeDashConfig(
      makePipe({ properties: { diameter: 50, showFlow: false } }),
      '#00d4aa',
      0,
      { flowing: true, offset: 10 },
    )
    expect(cfg.visible).toBe(false)
  })
})

describe('registerFlowAnimation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('多个订阅者共享同一 RAF，全部释放后停帧', () => {
    let rafId = 0
    const rafCalls: number[] = []
    const cancelCalls: number[] = []
    vi.stubGlobal('requestAnimationFrame', () => {
      rafCalls.push(++rafId)
      return rafId
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      cancelCalls.push(id)
    })

    const release1 = registerFlowAnimation()
    const release2 = registerFlowAnimation()
    expect(rafCalls).toHaveLength(1)

    release1()
    expect(cancelCalls).toHaveLength(0)
    release2()
    expect(cancelCalls).toHaveLength(1)
  })
})
