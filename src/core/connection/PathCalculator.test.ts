import { describe, it, expect } from 'vitest'
import { pathCalculator } from './PathCalculator'
import type { PortInfo } from './PathCalculator'

function port(position: PortInfo['position'], x: number, y: number): PortInfo {
  return { position, x, y }
}

describe('PathCalculator', () => {
  describe('calculateStraightPath', () => {
    it('应该返回起终点直线', () => {
      const points = pathCalculator.calculateStraightPath(port('left', 0, 0), port('right', 100, 50))
      expect(points).toEqual([0, 0, 100, 50])
    })
  })

  describe('calculatePolylinePath', () => {
    it('右端口到左端口应该在水平中点转折', () => {
      const points = pathCalculator.calculatePolylinePath(port('right', 100, 50), port('left', 300, 150))
      expect(points[0]).toBe(100)
      expect(points[1]).toBe(50)
      expect(points).toContain(200) // midX
      expect(points[points.length - 2]).toBe(300)
      expect(points[points.length - 1]).toBe(150)
    })

    it('下端口到上端口应该在垂直中点转折', () => {
      const points = pathCalculator.calculatePolylinePath(port('bottom', 100, 100), port('top', 200, 300))
      expect(points).toContain(200) // midY
      expect(points[points.length - 2]).toBe(200)
      expect(points[points.length - 1]).toBe(300)
    })

    it('路径始终从源端口出发到达目标端口', () => {
      const points = pathCalculator.calculatePolylinePath(port('top', 50, 0), port('left', 200, 80))
      expect(points[0]).toBe(50)
      expect(points[1]).toBe(0)
      expect(points[points.length - 2]).toBe(200)
      expect(points[points.length - 1]).toBe(80)
    })
  })

  describe('calculateCurvePath', () => {
    it('应该生成离散化贝塞尔曲线且首尾与端口重合', () => {
      const points = pathCalculator.calculateCurvePath(port('right', 100, 100), port('left', 300, 100))

      // 起点 + 20 段离散点 = 21 个点 = 42 个数字
      expect(points).toHaveLength(42)
      expect(points[0]).toBe(100)
      expect(points[1]).toBe(100)
      expect(points[points.length - 2]).toBe(300)
      expect(points[points.length - 1]).toBe(100)
    })
  })

  describe('calculatePathLength', () => {
    it('应该计算折线总长度', () => {
      // 直角边 3-4-5
      expect(pathCalculator.calculatePathLength([0, 0, 3, 0, 3, 4])).toBe(7)
    })
  })

  describe('getPointOnPath', () => {
    it('t=0 返回起点, t=1 返回终点', () => {
      const points = [0, 0, 10, 0]
      expect(pathCalculator.getPointOnPath(points, 0)).toEqual({ x: 0, y: 0 })
      expect(pathCalculator.getPointOnPath(points, 1)).toEqual({ x: 10, y: 0 })
    })

    it('t=0.5 返回线段中点', () => {
      expect(pathCalculator.getPointOnPath([0, 0, 10, 0], 0.5)).toEqual({ x: 5, y: 0 })
    })
  })
})
