/**
 * 由 HTML overlay（DOM）而非 Konva 呈现的元素类型——单一来源。
 *
 * 以前这份清单有两份：`useElementVisuals.ts` 里的 `HTML_OVERLAY_TYPES` 与
 * `HtmlOverlay.vue` 里的 `CHART_TYPES` / `WIDGET_TYPES`，靠注释互相提醒「保持一致」。
 * 两边用途不同却必须同步：漏加一处，元素是「背后有图标重影」（Konva 还在画）或
 * 「画面上什么都不显示」（overlay 不认这个类型）。新增 DOM 承载的组件时这是必踩的坑。
 *
 * 现在两边都从这里 import，不存在第二份。
 */

/** ECharts 渲染的图表类型（走 industrial/chart/ChartElement.vue） */
export const CHART_TYPES = ['chart-trend', 'chart-bar', 'chart-pie', 'chart-radar']

/** 普通 DOM 挂件类型（走 industrial/widget/WidgetElement.vue） */
export const WIDGET_TYPES = [
  'progress-bar',
  'report-table',
  'grid-chart',
  'filter-table',
  'date',
  'clock',
  'video',
  'iframe',
  'super-text',
]

/** 全部 overlay 类型：Konva 侧据此不再画内建图标，避免与 overlay 叠成重影 */
export const HTML_OVERLAY_TYPES: ReadonlySet<string> = new Set([...CHART_TYPES, ...WIDGET_TYPES])

/** 该元素是否由 HTML overlay 呈现 */
export function isOverlayType(type: string): boolean {
  return HTML_OVERLAY_TYPES.has(type)
}
