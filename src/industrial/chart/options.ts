/**
 * 图表图元的 ECharts option 构建（纯函数，便于单测）。
 *
 * 统一约定：背景透明（透出画布底色）、文字用暗色调色板可读的浅灰、
 * 图表内不再配标题（元素名称由画布标签条承担），避免双重标题。
 */

/** 系列名 + 数据点（trend 用） */
export interface TrendSeriesInput {
  name: string
  /** 时间戳（ms）与值 */
  points: Array<{ t: number; v: number }>
}

const TEXT_COLOR = '#8a9bb0'
const AXIS_LINE_COLOR = '#3a4a5e'
const SPLIT_LINE_COLOR = 'rgba(120,140,170,0.15)'
/** 与画布主题色呼应的系列默认配色（ECharts 会在系列间轮转） */
export const CHART_PALETTE = ['#00d4aa', '#4a9eff', '#ffa502', '#ff6b81', '#a78bfa', '#34d399']

export function buildTrendOption(series: TrendSeriesInput[], maxPoints: number) {
  return {
    backgroundColor: 'transparent',
    color: [...CHART_PALETTE],
    animation: false,
    grid: { left: 44, right: 12, top: 28, bottom: 22 },
    legend: {
      top: 2,
      left: 'center',
      textStyle: { color: TEXT_COLOR, fontSize: 10 },
      itemWidth: 12,
      itemHeight: 8,
    },
    tooltip: { show: false },
    xAxis: {
      type: 'time',
      axisLabel: { color: TEXT_COLOR, fontSize: 10, hideOverlap: true },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: TEXT_COLOR, fontSize: 10 },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
    },
    series: series.map(s => ({
      name: s.name,
      type: 'line',
      showSymbol: false,
      // 每系列最多取最近 maxPoints 个点，超出时均匀抽稀而不是截断尾部，
      // 否则长时间运行后画面只剩最新的几秒
      data: downsample(s.points, maxPoints).map(p => [p.t, p.v]),
      lineStyle: { width: 1.5 },
    })),
  }
}

export function buildBarOption(names: string[], values: number[]) {
  return {
    backgroundColor: 'transparent',
    color: [...CHART_PALETTE],
    animation: false,
    grid: { left: 44, right: 12, top: 28, bottom: 22 },
    tooltip: { show: false },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { color: TEXT_COLOR, fontSize: 10, interval: 0, rotate: names.length > 5 ? 30 : 0 },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: TEXT_COLOR, fontSize: 10 },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
    },
    series: [
      {
        type: 'bar',
        data: values,
        // 单系列整体用同色不如逐柱配色直观（组态大屏惯例）
        itemStyle: { color: (p: { dataIndex: number }) => CHART_PALETTE[p.dataIndex % CHART_PALETTE.length] },
        barMaxWidth: 32,
      },
    ],
  }
}

export function buildPieOption(items: Array<{ name: string; value: number }>) {
  const total = items.reduce((sum, it) => sum + (Number.isFinite(it.value) ? Math.abs(it.value) : 0), 0)
  return {
    backgroundColor: 'transparent',
    color: [...CHART_PALETTE],
    animation: false,
    tooltip: { show: false },
    legend: {
      bottom: 2,
      left: 'center',
      textStyle: { color: TEXT_COLOR, fontSize: 10 },
      itemWidth: 12,
      itemHeight: 8,
    },
    // 全部为 0/负值时饼图无法成图，用占位环保持布局稳定
    series: [
      total > 0
        ? {
            type: 'pie',
            radius: ['35%', '62%'],
            center: ['50%', '44%'],
            label: { color: TEXT_COLOR, fontSize: 10, formatter: '{b} {d}%' },
            labelLine: { lineStyle: { color: AXIS_LINE_COLOR } },
            data: items.map(it => ({ name: it.name, value: Math.abs(it.value) })),
          }
        : {
            type: 'pie',
            radius: ['35%', '62%'],
            center: ['50%', '44%'],
            label: { show: false },
            data: [{ name: '暂无数据', value: 1, itemStyle: { color: 'rgba(120,140,170,0.15)' } }],
            silent: true,
          },
    ],
  }
}

/** 均匀抽稀到 maxPoints 以内（保留首尾）；超过时按间隔取样，避免趋势尾部被截掉 */
export function downsample<T>(items: T[], maxPoints: number): T[] {
  if (maxPoints <= 0 || items.length <= maxPoints) return items
  const step = (items.length - 1) / (maxPoints - 1)
  const result: T[] = []
  for (let i = 0; i < maxPoints; i++) {
    result.push(items[Math.round(i * step)])
  }
  return result
}
