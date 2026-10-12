import type { ComponentDefinition } from '@/types/scada'

/**
 * 基础图形：矩形 / 圆 / 三角 / 横线 / 竖线 / 虚横线 / 虚竖线。
 *
 * 为什么手绘而不是导入素材：源产品这 7 项只提供了 PNG 缩略图（`base0.png`~
 * `base2.png`、`hr1/2.png`、`dashed1/2.png`），没有矢量源。而这些图形本身极其简单，
 * 手绘成 `currentColor` 线条稿有三点好处——任意缩放不虚、能跟随元素状态变色、
 * 与仓库既有手写图元同一套绘制口径（viewBox 0 0 100 100、stroke-width 2.6）。
 *
 * 与 `CustomComponentDialog.vue` 的 `SHAPES` 是两套东西、不要合并：那边给用户自建
 * 组件用，颜色由用户在弹窗里指定（写死 `stroke="#xxxxxx"`）；这边是内置组件，必须走
 * `currentColor` 才能被状态色替换。
 *
 * 不配 statusRules / dataBindings：纯图形没有工况语义，与 `basic/image.ts` 同例。
 */

/** 7 个基础图形共用的图标骨架（与 coal/power 等手写图元同一套参数） */
const SHAPE_ICON = (body: string) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`

/** 纯图形组件的属性面板只留名称，与 image.ts 的最小集一致 */
function shapeProperties(name: string): ComponentDefinition['properties'] {
  return [{ key: 'name', label: '名称', type: 'string', default: name, group: '基本' }]
}

function shapeDef(
  type: string,
  name: string,
  body: string,
  defaultWidth: number,
  defaultHeight: number,
): ComponentDefinition {
  return {
    type,
    name,
    group: 'basic',
    icon: SHAPE_ICON(body),
    defaultWidth,
    defaultHeight,
    defaultConfig: {},
    statusRules: [],
    dataBindings: [],
    properties: shapeProperties(name),
  }
}

export const RectShapeDefinition = shapeDef(
  'shape_rect',
  '矩形',
  '<rect x="4" y="4" width="92" height="92" rx="3" />',
  100,
  100,
)

export const CircleShapeDefinition = shapeDef('shape_circle', '圆', '<circle cx="50" cy="50" r="45" />', 100, 100)

export const TriangleShapeDefinition = shapeDef(
  'shape_triangle',
  '三角',
  '<polygon points="50,7 93,88 7,88" />',
  100,
  100,
)

export const HLineShapeDefinition = shapeDef(
  'shape_hline',
  '横线',
  '<line x1="4" y1="50" x2="96" y2="50" />',
  100,
  100,
)

export const VLineShapeDefinition = shapeDef(
  'shape_vline',
  '竖线',
  '<line x1="50" y1="4" x2="50" y2="96" />',
  100,
  100,
)

export const DashedHLineShapeDefinition = shapeDef(
  'shape_dashed_hline',
  '虚横线',
  '<line x1="4" y1="50" x2="96" y2="50" stroke-dasharray="12 8" />',
  100,
  100,
)

export const DashedVLineShapeDefinition = shapeDef(
  'shape_dashed_vline',
  '虚竖线',
  '<line x1="50" y1="4" x2="50" y2="96" stroke-dasharray="12 8" />',
  100,
  100,
)

export const basicShapeComponents: ComponentDefinition[] = [
  RectShapeDefinition,
  CircleShapeDefinition,
  TriangleShapeDefinition,
  HLineShapeDefinition,
  VLineShapeDefinition,
  DashedHLineShapeDefinition,
  DashedVLineShapeDefinition,
]
