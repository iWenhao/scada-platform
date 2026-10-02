import { describe, expect, it } from 'vitest'
import { computeDefaultCamera, computeSceneBounds, elementToWorld } from './coordinates'
import { defaultCanvasConfig } from '@/types/canvas'
import type { ComponentInstance } from '@/types/scada'

function makeElement(partial: Partial<ComponentInstance>): ComponentInstance {
  return {
    id: 'e1',
    type: 'pump',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    name: '设备',
    layerId: 'l1',
    properties: {},
    statusRules: [],
    dataBindings: [],
    ...partial,
  }
}

describe('elementToWorld', () => {
  it('以元素中心为锚点落到地面（画布 X → 世界 X，画布 Y → 世界 Z）', () => {
    const placement = elementToWorld(makeElement({ x: 100, y: 200, width: 50, height: 80 }))
    expect(placement.x).toBe(125)
    expect(placement.z).toBe(240)
    expect(placement.width).toBe(50)
    expect(placement.depth).toBe(80)
  })

  it('Konva 顺时针角度转成 three 绕 Y 轴的负弧度', () => {
    expect(elementToWorld(makeElement({ rotation: 90 })).rotationY).toBeCloseTo(-Math.PI / 2)
    expect(elementToWorld(makeElement({ rotation: -45 })).rotationY).toBeCloseTo(Math.PI / 4)
  })
})

describe('computeSceneBounds', () => {
  it('空场景退化为画布尺寸', () => {
    const bounds = computeSceneBounds([], defaultCanvasConfig)
    expect(bounds.minX).toBe(0)
    expect(bounds.maxX).toBe(1920)
    expect(bounds.maxZ).toBe(1080)
    expect(bounds.centerZ).toBe(540)
  })

  it('超出画布边界的元素会外扩范围', () => {
    const bounds = computeSceneBounds(
      [makeElement({ x: -100, y: 0, width: 50, height: 50 }), makeElement({ x: 2000, y: 1200, width: 50, height: 50 })],
      defaultCanvasConfig,
    )
    expect(bounds.minX).toBe(-100)
    expect(bounds.maxX).toBe(2050)
    expect(bounds.maxZ).toBe(1250)
    expect(bounds.width).toBe(2150)
  })
})

describe('computeDefaultCamera', () => {
  it('注视场景中心地面，机位在斜上方', () => {
    const bounds = computeSceneBounds([], defaultCanvasConfig)
    const view = computeDefaultCamera(bounds)
    expect(view.target).toEqual({ x: 960, y: 0, z: 540 })
    expect(view.position.y).toBeGreaterThan(0)
    expect(view.position.x).not.toBe(960)
    expect(view.position.z).not.toBe(540)
  })
})
