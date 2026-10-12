import type { ComponentDefinition, PropertyDefinition } from '@/types/scada'
import { CLOCK_FORMAT_OPTIONS, DEFAULT_CLOCK_FORMAT, DEFAULT_DATE_FORMAT } from './format'

/**
 * HTML 挂件类组件定义：进度条 / 报表 / 网格图 / 表格 / 日期 / 时间 /
 * 视频 / 网页 / 超文本。
 *
 * 这些组件的共同点是**需要 DOM 才能呈现**（ECharts 那批走 chart/ChartElement.vue，
 * 这批走 widget/WidgetElement.vue），因此渲染路径与设备图元不同：由画布的 HTML
 * overlay 按元素定位叠放，Konva 只保留不可见命中层负责拖拽/选中/缩放。
 *
 * 分组沿用源产品的口径：数据展示类进 `chart`（图表组件），日期时间与富媒体进
 * `basic`（基础组件）。分组只写在定义里，不进元素实例，故不影响既有工程数据。
 *
 * 「文字」不在这里——它是 Konva 原生 Text 渲染，定义见 basic/text.ts。
 */

/** 定义工厂：9 个挂件的属性结构高度重复，集中收拢避免逐份抄写 */
function widgetDef(
  type: string,
  name: string,
  group: ComponentDefinition['group'],
  icon: string,
  defaultWidth: number,
  defaultHeight: number,
  properties: PropertyDefinition[],
  defaultConfig: Record<string, unknown> = {},
): ComponentDefinition {
  return {
    type,
    name,
    group,
    icon,
    defaultWidth,
    defaultHeight,
    defaultConfig,
    // 挂件没有工况语义：不配 statusRules（避免按颜色兜底推断出报警），
    // 数据绑定由用户在属性面板按需添加
    statusRules: [],
    dataBindings: [],
    properties: [{ key: 'name', label: '名称', type: 'string', default: name, group: '基本' }, ...properties],
  }
}

/** 挂件共用的图标骨架（与手写设备图元同一套口径） */
const svg = (body: string) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`

const fontSizeProp = (d = 12) => ({
  key: 'fontSize',
  label: '字号',
  type: 'number' as const,
  default: d,
  min: 8,
  max: 72,
  group: '显示',
})

export const ProgressBarDefinition = widgetDef(
  'progress-bar',
  '进度条',
  'chart',
  svg('<rect x="8" y="34" width="84" height="32" rx="16" /><line x1="24" y1="50" x2="76" y2="50" />'),
  240,
  60,
  [
    fontSizeProp(12),
    { key: 'decimals', label: '小数位', type: 'number', default: 0, min: 0, max: 3, group: '显示' },
  ],
)

export const ReportTableDefinition = widgetDef(
  'report-table',
  '报表',
  'chart',
  svg(
    '<rect x="10" y="16" width="80" height="68" rx="4" /><line x1="10" y1="34" x2="90" y2="34" /><line x1="10" y1="52" x2="90" y2="52" /><line x1="10" y1="70" x2="90" y2="70" /><line x1="36" y1="16" x2="36" y2="84" /><line x1="62" y1="16" x2="62" y2="84" />',
  ),
  320,
  220,
  [
    fontSizeProp(12),
    { key: 'columns', label: '列数', type: 'number', default: 3, min: 1, max: 12, group: '表格' },
    { key: 'rows', label: '数据行数', type: 'number', default: 4, min: 1, max: 50, group: '表格' },
    { key: 'showHeader', label: '显示表头', type: 'boolean', default: true, group: '表格' },
    {
      key: 'headers',
      label: '表头（逗号分隔）',
      type: 'string',
      default: '',
      group: '表格',
    },
    { key: 'align', label: '对齐', type: 'select', default: 'left', options: [
      { label: '左', value: 'left' },
      { label: '中', value: 'center' },
      { label: '右', value: 'right' },
    ], group: '表格' },
  ],
)

export const GridChartDefinition = widgetDef(
  'grid-chart',
  '网格图',
  'chart',
  svg(
    '<rect x="10" y="16" width="34" height="30" rx="3" /><rect x="56" y="16" width="34" height="30" rx="3" /><rect x="10" y="56" width="34" height="30" rx="3" /><rect x="56" y="56" width="34" height="30" rx="3" />',
  ),
  320,
  220,
  [
    fontSizeProp(12),
    { key: 'valueFontSize', label: '数值字号', type: 'number', default: 15, min: 8, max: 48, group: '显示' },
    { key: 'gridColumns', label: '每行列数', type: 'number', default: 4, min: 1, max: 12, group: '显示' },
    { key: 'alarmAbove', label: '报警阈值（大于）', type: 'number', default: 0, min: 0, group: '显示' },
    { key: 'decimals', label: '小数位', type: 'number', default: 1, min: 0, max: 3, group: '显示' },
  ],
)

export const FilterTableDefinition = widgetDef(
  'filter-table',
  '表格',
  'chart',
  svg(
    '<rect x="10" y="16" width="80" height="68" rx="4" /><line x1="10" y1="34" x2="90" y2="34" /><line x1="10" y1="52" x2="90" y2="52" /><line x1="10" y1="70" x2="90" y2="70" /><circle cx="24" cy="25" r="4" /><line x1="32" y1="25" x2="52" y2="25" />',
  ),
  320,
  240,
  [
    fontSizeProp(12),
    { key: 'unit', label: '数值单位', type: 'string', default: '', group: '表格' },
    { key: 'alarmAbove', label: '报警阈值（大于）', type: 'number', default: 0, min: 0, group: '表格' },
    { key: 'decimals', label: '小数位', type: 'number', default: 1, min: 0, max: 3, group: '表格' },
  ],
)

export const DateDefinition = widgetDef(
  'date',
  '日期',
  'basic',
  svg(
    '<rect x="14" y="20" width="72" height="66" rx="6" /><line x1="14" y1="38" x2="86" y2="38" /><line x1="32" y1="12" x2="32" y2="28" /><line x1="68" y1="12" x2="68" y2="28" /><line x1="30" y1="58" x2="44" y2="58" /><line x1="56" y1="58" x2="70" y2="58" /><line x1="30" y1="72" x2="44" y2="72" /><line x1="56" y1="72" x2="70" y2="72" />',
  ),
  180,
  70,
  [
    fontSizeProp(24),
    {
      key: 'format',
      label: '显示格式',
      type: 'select',
      default: DEFAULT_DATE_FORMAT,
      options: CLOCK_FORMAT_OPTIONS,
      group: '显示',
    },
  ],
)

export const ClockDefinition = widgetDef(
  'clock',
  '时间',
  'basic',
  svg('<circle cx="50" cy="50" r="34" /><line x1="50" y1="50" x2="50" y2="28" /><line x1="50" y1="50" x2="66" y2="58" />'),
  180,
  70,
  [
    fontSizeProp(24),
    {
      key: 'format',
      label: '显示格式',
      type: 'select',
      default: DEFAULT_CLOCK_FORMAT,
      options: CLOCK_FORMAT_OPTIONS,
      group: '显示',
    },
  ],
)

export const VideoDefinition = widgetDef(
  'video',
  '视频',
  'basic',
  svg('<rect x="10" y="20" width="80" height="60" rx="6" /><polygon points="42,38 62,50 42,62" /><line x1="10" y1="58" x2="10" y2="72" /><line x1="90" y1="58" x2="90" y2="72" />'),
  320,
  200,
  [
    { key: 'src', label: '视频地址', type: 'string', default: '', group: '媒体' },
    { key: 'controls', label: '显示控制条', type: 'boolean', default: true, group: '媒体' },
    { key: 'loop', label: '循环播放', type: 'boolean', default: false, group: '媒体' },
    { key: 'muted', label: '静音', type: 'boolean', default: false, group: '媒体' },
    { key: 'autoplay', label: '自动播放', type: 'boolean', default: false, group: '媒体' },
  ],
)

export const IframeDefinition = widgetDef(
  'iframe',
  '网页',
  'basic',
  svg('<rect x="10" y="18" width="80" height="64" rx="5" /><line x1="10" y1="34" x2="90" y2="34" /><circle cx="20" cy="26" r="2.5" /><circle cx="30" cy="26" r="2.5" /><circle cx="40" cy="26" r="2.5" /><line x1="24" y1="48" x2="60" y2="48" /><line x1="24" y1="60" x2="74" y2="60" />'),
  320,
  240,
  [{ key: 'url', label: '网页地址', type: 'string', default: '', group: '媒体' }],
)

export const SuperTextDefinition = widgetDef(
  'super-text',
  '超文本',
  'basic',
  svg('<rect x="14" y="16" width="72" height="68" rx="5" /><line x1="24" y1="34" x2="66" y2="34" /><line x1="24" y1="48" x2="76" y2="48" /><line x1="24" y1="62" x2="58" y2="62" /><line x1="24" y1="74" x2="70" y2="74" />'),
  280,
  160,
  [
    fontSizeProp(13),
    {
      key: 'html',
      label: '内容（HTML）',
      type: 'string',
      default: '<p>富文本</p>',
      group: '内容',
    },
  ],
)

export const widgetComponents: ComponentDefinition[] = [
  ProgressBarDefinition,
  ReportTableDefinition,
  GridChartDefinition,
  FilterTableDefinition,
  DateDefinition,
  ClockDefinition,
  VideoDefinition,
  IframeDefinition,
  SuperTextDefinition,
]
