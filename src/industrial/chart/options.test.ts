import { describe, it, expect } from 'vitest'
import { buildTrendOption, buildBarOption, buildPieOption, downsample, CHART_PALETTE } from './options'

describe('downsample', () => {
  it('点数不足时原样返回', () => {
    const items = [1, 2, 3]
    expect(downsample(items, 10)).toEqual([1, 2, 3])
  })

  it('超限时均匀抽稀并保留首尾', () => {
    const items = Array.from({ length: 11 }, (_, i) => i)
    const result = downsample(items, 6)
    expect(result).toHaveLength(6)
    expect(result[0]).toBe(0)
    expect(result[5]).toBe(10)
    // 均匀取样：步长 2，取 0,2,4,6,8,10
    expect(result).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('maxPoints 非法时原样返回', () => {
    expect(downsample([1, 2, 3], 0)).toEqual([1, 2, 3])
  })
})

describe('buildTrendOption', () => {
  it('每个输入系列生成一条折线，数据为 [时间, 值] 对', () => {
    const option = buildTrendOption(
      [
        { name: 'speed', points: [{ t: 1000, v: 1 }, { t: 2000, v: 2 }] },
        { name: 'temp', points: [{ t: 1000, v: 50 }] },
      ],
      100,
    )
    expect(option.series).toHaveLength(2)
    expect(option.series[0].name).toBe('speed')
    expect(option.series[0].data).toEqual([[1000, 1], [2000, 2]])
    expect(option.series[0].type).toBe('line')
  })

  it('透明背景且应用抽稀上限', () => {
    const points = Array.from({ length: 300 }, (_, i) => ({ t: i, v: i }))
    const option = buildTrendOption([{ name: 'x', points }], 60)
    expect(option.backgroundColor).toBe('transparent')
    expect(option.series[0].data).toHaveLength(60)
  })
})

describe('buildBarOption', () => {
  it('类别轴为变量名，逐柱配色', () => {
    const option = buildBarOption(['a', 'b', 'c'], [1, 2, 3])
    expect(option.xAxis.data).toEqual(['a', 'b', 'c'])
    expect(option.series[0].data).toEqual([1, 2, 3])
    expect(option.series[0].itemStyle.color({ dataIndex: 1 })).toBe(CHART_PALETTE[1])
  })

  it('变量多时类别标签旋转避免重叠', () => {
    const option = buildBarOption(Array.from({ length: 8 }, (_, i) => `v${i}`), Array.from({ length: 8 }, () => 1))
    expect(option.xAxis.axisLabel.rotate).toBe(30)
  })
})

describe('buildPieOption', () => {
  it('正值数据生成扇区（取绝对值）', () => {
    const option = buildPieOption([{ name: 'a', value: 30 }, { name: 'b', value: -70 }])
    expect(option.series[0].type).toBe('pie')
    expect(option.series[0].data).toEqual([
      { name: 'a', value: 30 },
      { name: 'b', value: 70 },
    ])
  })

  it('全零/负值时渲染占位环而非空图', () => {
    const option = buildPieOption([{ name: 'a', value: 0 }, { name: 'b', value: 0 }])
    expect(option.series[0].data[0].name).toBe('暂无数据')
  })
})
