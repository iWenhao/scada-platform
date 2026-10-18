import type { ComponentDefinition } from '@/types/scada'

/**
 * 图表图元（ECharts 渲染）。
 *
 * 渲染方式与工业图元不同：ECharts 需要 DOM 容器，因此图表元素在画布上
 * 由 HTML overlay 呈现（编辑态 pointer-events 穿透，拖拽/选中仍由 Konva 处理）。
 * 数据绑定支持多条：折线/柱状的每条绑定是一个系列，饼图的每条绑定是一个扇区。
 */

const CHART_WIDTH = 320
const CHART_HEIGHT = 200

function nameProperty(defaultName: string) {
  return {
    key: 'name',
    label: '名称',
    type: 'string' as const,
    default: defaultName,
    group: '基本',
  }
}

export const ChartTrendDefinition: ComponentDefinition = {
  type: 'chart-trend',
  name: '折线图',
  group: 'chart',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <rect x="10" y="15" width="80" height="70" rx="4" />
      <polyline points="18,65 34,50 48,58 64,32 82,42" />
    </g>
  </svg>`,
  defaultWidth: CHART_WIDTH,
  defaultHeight: CHART_HEIGHT,
  defaultConfig: {
    historyPoints: 60,
  },
  statusRules: [],
  dataBindings: [],
  properties: [
    nameProperty('折线图'),
    {
      key: 'historyPoints',
      label: '显示点数',
      type: 'number',
      default: 60,
      min: 10,
      max: 300,
      group: '显示',
    },
  ],
}

export const ChartBarDefinition: ComponentDefinition = {
  type: 'chart-bar',
  name: '柱状图',
  group: 'chart',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <rect x="10" y="15" width="80" height="70" rx="4" />
      <line x1="26" y1="70" x2="26" y2="45" />
      <line x1="50" y1="70" x2="50" y2="28" />
      <line x1="74" y1="70" x2="74" y2="55" />
    </g>
  </svg>`,
  defaultWidth: CHART_WIDTH,
  defaultHeight: CHART_HEIGHT,
  defaultConfig: {},
  statusRules: [],
  dataBindings: [],
  properties: [nameProperty('柱状图')],
}

export const ChartPieDefinition: ComponentDefinition = {
  type: 'chart-pie',
  name: '饼图',
  group: 'chart',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <circle cx="50" cy="50" r="32" />
      <line x1="50" y1="50" x2="50" y2="18" />
      <line x1="50" y1="50" x2="78" y2="60" />
    </g>
  </svg>`,
  defaultWidth: 240,
  defaultHeight: CHART_HEIGHT,
  defaultConfig: {},
  statusRules: [],
  dataBindings: [],
  properties: [nameProperty('饼图')],
}



export const ChartRadarDefinition: ComponentDefinition = {
  type: 'chart-radar',
  name: '雷达图',
  group: 'chart',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round">
      <polygon points="50,14 82,38 70,76 30,76 18,38" />
      <polygon points="50,32 66,42 60,64 40,64 34,42" />
      <line x1="50" y1="14" x2="50" y2="32" />
      <line x1="82" y1="38" x2="66" y2="42" />
      <line x1="70" y1="76" x2="60" y2="64" />
      <line x1="30" y1="76" x2="40" y2="64" />
      <line x1="18" y1="38" x2="34" y2="42" />
    </g>
  </svg>`,
  defaultWidth: 280,
  defaultHeight: 240,
  defaultConfig: {},
  statusRules: [],
  dataBindings: [],
  properties: [
    nameProperty('雷达图'),
    {
      key: 'radarMax',
      label: '半径上限（0=自动）',
      type: 'number',
      default: 0,
      min: 0,
      group: '显示',
    },
  ],
}

export const chartComponents: ComponentDefinition[] = [
  ChartTrendDefinition,
  ChartBarDefinition,
  ChartPieDefinition,
  ChartRadarDefinition,
]
