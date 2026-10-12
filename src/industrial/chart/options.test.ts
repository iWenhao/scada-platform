import { describe, it, expect } from 'vitest'
import {
  buildTrendOption,
  buildBarOption,
  buildPieOption,
  buildRadarOption,
  downsample,
  CHART_PALETTE,
} from './options'

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

describe('buildRadarOption', () => {
  const items = [
    { name: 'speed', value: 30 },
    { name: 'load', value: 60 },
    { name: 'temp', value: 45 },
  ]

  it('每个绑定生成一个指标轴，取当前值', () => {
    const option = buildRadarOption(items)
    expect(option.radar.indicator).toHaveLength(3)
    expect(option.radar.indicator.map((i: { name: string }) => i.name)).toEqual(['speed', 'load', 'temp'])
    expect(option.series[0].data[0].value).toEqual([30, 60, 45])
  })

  it('上限缺省取最大绝对值的 1.2 倍，保证最外圈有数据触达', () => {
    const option = buildRadarOption(items)
    expect(option.radar.indicator[0].max).toBeCloseTo(72, 5)
  })

  it('显式传入上限时以传入值为准', () => {
    const option = buildRadarOption(items, 100)
    expect(option.radar.indicator.every((i: { max: number }) => i.max === 100)).toBe(true)
  })

  it('全 0 时用占位多边形而不是退化成一个点', () => {
    const option = buildRadarOption([
      { name: 'a', value: 0 },
      { name: 'b', value: 0 },
    ])
    // 占位值必须是正的，否则雷达图仍然画不出东西
    expect(option.series[0].data[0].value.every((v: number) => v > 0)).toBe(true)
    // 上限至少为 1，避免全 0 时除零得到 NaN
    expect(option.radar.indicator[0].max).toBeGreaterThanOrEqual(1)
  })

  it('非有限值按 0 处理，不把 NaN 传进 ECharts', () => {
    // 混在一个有效值里，才能单独看出 NaN/Infinity 被转成了 0
    const option = buildRadarOption([
      { name: 'a', value: 30 },
      { name: 'b', value: Number.NaN },
      { name: 'c', value: Number.POSITIVE_INFINITY },
    ])
    expect(option.series[0].data[0].value).toEqual([30, 0, 0])
  })

  it('全部非有限值时转成 0 后落入占位分支，仍然画得出东西', () => {
    const option = buildRadarOption([
      { name: 'a', value: Number.NaN },
      { name: 'b', value: Number.POSITIVE_INFINITY },
    ])
    // 与「全 0」同一分支：占位值必须为正
    expect(option.series[0].data[0].value.every((v: number) => v > 0)).toBe(true)
  })

  it('背景透明，透出画布底色', () => {
    expect(buildRadarOption(items).backgroundColor).toBe('transparent')
  })
})
