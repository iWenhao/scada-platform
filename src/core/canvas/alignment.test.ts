import { describe, it, expect } from 'vitest'
import { computeAlignment } from './alignment'

describe('computeAlignment', () => {
  const moved = { x: 100, y: 200, width: 80, height: 60 }

  it('左边缘在阈值内应吸附并生成垂直参考线', () => {
    const others = [{ x: 104, y: 180, width: 80, height: 60 }]
    const result = computeAlignment(moved, others, 6)

    expect(result.x).toBe(104)
    expect(result.y).toBeNull()
    // 参考线贯穿两元素: 上=min(200,180)-8=172, 下=max(260,240)+8=268
    expect(result.guides).toContainEqual([104, 172, 104, 268])
  })

  it('水平中线应与对方中线对齐', () => {
    const others = [{ x: 0, y: 0, width: 300, height: 100 }]
    const result = computeAlignment(moved, others, 6)

    // moved 候选 [100,140,180] vs other [0,150,300], 无 6px 内匹配
    expect(result.x).toBeNull()
  })

  it('垂直方向应在阈值内吸附上边缘', () => {
    const others = [{ x: 320, y: 196, width: 80, height: 60 }]
    const result = computeAlignment(moved, others, 6)

    expect(result.y).toBe(196)
    expect(result.x).toBeNull()
    expect(result.guides.some(g => g[1] === 196 && g[3] === 196)).toBe(true)
  })

  it('超过阈值不吸附', () => {
    const others = [{ x: 150, y: 0, width: 80, height: 60 }]
    const result = computeAlignment(moved, others, 6)

    expect(result.x).toBeNull()
    expect(result.y).toBeNull()
    expect(result.guides).toEqual([])
  })

  it('应选择阈值内距离最近的匹配', () => {
    const others = [
      { x: 96, y: 0, width: 80, height: 60 },
      { x: 102, y: 0, width: 80, height: 60 },
    ]
    const result = computeAlignment(moved, others, 6)

    expect(result.x).toBe(102)
  })
})
