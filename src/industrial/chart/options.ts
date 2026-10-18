/**
 * 图表图元的 ECharts option 构建（纯函数，便于单测）。
 *
 * 统一约定：背景透明（透出画布底色）、文字用暗色调色板可读的浅灰、
 * 图表内不再配标题（元素名称由画布标签条承担），避免双重标题。
 *
 * 不配 tooltip：图元按需求未注册 TooltipComponent，写了 `tooltip: { show: false }`
 * 反而会触发 ECharts 的 "Component tooltip is used but not imported" 警告；
 * option 里没有 tooltip 键时该组件根本不会创建，行为一致且更省体积。
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

/**
 * 雷达图：每条绑定是一个维度（指标轴），取该维度的当前值。
 *
 * 与饼图一样要处理「全 0」：雷达图所有轴都是 0 时会退化成一条看不见的线，
 * 用占位多边形保持布局稳定，避免用户以为组件坏了。
 */
export function buildRadarOption(items: Array<{ name: string; value: number }>, max?: number) {
  // ⚠️ 无绑定时必须补一条占位指标轴：radar.indicator 为空时 ECharts 6 的
  // radarLayout 会在 `points[idx].push(...)` 上抛 TypeError（points 是按轴逐项
  // 建的，一个轴都没有就一项都不会建，但数据项仍然存在），图元会随 mounted
  // 报错一起挂掉。占位轴让「拖进来还没绑变量」的状态保持可渲染。
  const source = items.length > 0 ? items : [{ name: '暂无数据', value: 0 }]
  const names = source.map(it => it.name)
  const values = source.map(it => (Number.isFinite(it.value) ? it.value : 0))
  const hasData = items.length > 0 && values.some(v => v !== 0)
  // 上限缺省取数据最大值的 1.2 倍（至少 1，防全 0 时除零）
  const ceiling = Math.max(1, max ?? Math.max(...values.map(Math.abs), 0) * 1.2)
  return {
    backgroundColor: 'transparent',
    color: [...CHART_PALETTE],
    animation: false,
    legend: {
      bottom: 2,
      left: 'center',
      textStyle: { color: TEXT_COLOR, fontSize: 10 },
      itemWidth: 12,
      itemHeight: 8,
    },
    radar: {
      indicator: names.map(n => ({ name: n, max: ceiling })),
      center: ['50%', '46%'],
      radius: '58%',
      axisName: { color: TEXT_COLOR, fontSize: 10 },
      splitLine: { lineStyle: { color: SPLIT_LINE_COLOR } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
    },
    series: [
      {
        type: 'radar',
        data: hasData
          ? [{ value: values, name: '当前值', areaStyle: { opacity: 0.25 }, lineStyle: { width: 2 } }]
          : [{ value: names.map(() => ceiling * 0.35), name: '暂无数据', lineStyle: { opacity: 0.25 } }],
      },
    ],
  }
}
