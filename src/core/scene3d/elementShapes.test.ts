import { describe, expect, it } from 'vitest'
import { getComponent3DShape, getGeometryParams } from './elementShapes'

describe('getComponent3DShape', () => {
  it('内置设备按形状特化', () => {
    expect(getComponent3DShape('tank')).toBe('cylinder')
    expect(getComponent3DShape('fan')).toBe('cylinder')
    expect(getComponent3DShape('pump')).toBe('cylinder-horizontal')
    expect(getComponent3DShape('motor')).toBe('cylinder-horizontal')
    expect(getComponent3DShape('pipe')).toBe('pipe')
  })

  it('未建模的组件回落为 box，新组件无需强制建模', () => {
    expect(getComponent3DShape('shearer')).toBe('box')
    expect(getComponent3DShape('custom-xyz')).toBe('box')
  })
})

describe('getGeometryParams', () => {
  it('box：底面与画布占位一致，高度按短边比例且限制范围', () => {
    expect(getGeometryParams('box', 100, 60)).toEqual({ kind: 'box', width: 100, height: 36, depth: 60 })
    // 过小的元素不至于薄成纸片
    const tiny = getGeometryParams('box', 10, 10)
    expect(tiny.kind === 'box' && tiny.height >= 24).toBe(true)
  })

  it('box 高度封顶，避免大面积元素喧宾夺主', () => {
    const params = getGeometryParams('box', 500, 400)
    expect(params.kind === 'box' && params.height).toBe(200)
  })

  it('cylinder：半径取短边内切，高度拉高体现罐体感', () => {
    expect(getGeometryParams('cylinder', 100, 100)).toEqual({ kind: 'cylinder', radius: 45, height: 140 })
  })

  it('cylinder-horizontal：躺倒放置，长度取长边', () => {
    const params = getGeometryParams('cylinder-horizontal', 200, 100)
    expect(params.kind).toBe('cylinder-horizontal')
    if (params.kind !== 'cylinder-horizontal') return
    expect(params.radius).toBeCloseTo(27.5)
    expect(params.length).toBe(200)
  })

  it('pipe：管廊贴地，高度压扁', () => {
    const params = getGeometryParams('pipe', 300, 20)
    expect(params).toEqual({ kind: 'box', width: 300, height: 24, depth: 20 })
  })
})
