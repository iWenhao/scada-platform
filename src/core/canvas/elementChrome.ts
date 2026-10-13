import type { ComponentInstance } from '@/types/scada'
import type { ElementLayout } from './elementLayout'

/**
 * 元素外观配置（纯函数，编辑器画布与预览页共用）。
 *
 * 画布形态已定为「纯图形」：元素只呈现设备自身的线稿，不套卡片底色、不描边，
 * 状态变化只改设备线条颜色（见 useElementVisuals 的 getIconStrokeColor）。
 * 因此这里只保留三件事：显示开关解析、命中层、名称/数值的素文本样式。
 */

/**
 * 名称/数值显示开关解析。
 * 兼容旧数据：拆分字段（showName/showValue）缺省时回退旧合并开关 showLabel，
 * 两者都未设置时视为显示——旧画面渲染效果保持不变。
 */
export function isNameShown(element: ComponentInstance): boolean {
  return element.showName ?? element.showLabel ?? true
}

export function isValueShown(element: ComponentInstance): boolean {
  return element.showValue ?? element.showLabel ?? true
}

/**
 * 命中层：透明矩形，保证 group 可点选/拖拽/变换。
 * 元素现在没有任何可见的边底，命中层是唯一（不可见但必需）的结构层；
 * 其余装饰层一律 listening:false，否则 Konva 找不到命中目标。
 */
export function hitAreaConfig(element: ComponentInstance) {
  return {
    width: element.width,
    height: element.height,
    fill: 'transparent',
    cornerRadius: 10,
    listening: true,
  }
}

/**
 * 纯文本图元（`text` 类型）的文字配置。
 *
 * 与名称/数值那两条素文本的区别：内容是用户自由输入的，且要支持字号/加粗/对齐，
 * 所以位置按元素高度居中而非贴在布局分区的固定条上。颜色走元素状态色
 * （无状态规则时由调用方传默认色），与画布其余部分同一套变色口径。
 */
export function plainTextConfig(
  element: ComponentInstance,
  text: string,
  color: string,
  fallbackFontSize = 16,
) {
  const props = element.properties ?? {}
  const fontSize = Math.min(Math.max(Number(props.fontSize) || fallbackFontSize, 8), 200)
  const bold = props.bold === true
  const align = (['left', 'center', 'right'] as const).includes(props.align)
    ? (props.align as 'left' | 'center' | 'right')
    : 'center'
  const vertical = props.valign === 'top' ? 'top' : 'middle'
  return {
    text,
    fontSize,
    fontStyle: bold ? ('bold' as const) : ('normal' as const),
    fontFamily: 'system-ui, "Segoe UI", "Microsoft YaHei", sans-serif',
    fill: color,
    width: element.width,
    height: element.height,
    align,
    verticalAlign: vertical,
    padding: 2,
    listening: false,
    ...TEXT_HALO,
  }
}

/** 操作按钮的 Konva 配置（矩形本体 + 指令文字） */
export interface CommandButtonConfig {
  body: {
    x: number
    y: number
    width: number
    height: number
    fill: string
    stroke: string
    strokeWidth: number
    cornerRadius: number
    listening: boolean
  }
  text: {
    text: string
    fontSize: number
    fontFamily: string
    fill: string
    x: number
    y: number
    width: number
    height: number
    align: 'center'
    verticalAlign: 'middle'
    ellipsis: boolean
    listening: boolean
  }
}

/** 按钮常态 / 按下态填充：中性半透明灰，避免与状态色抢语义 */
const BUTTON_FILL = 'rgba(126,140,158,0.22)'
const BUTTON_FILL_PRESSED = 'rgba(126,140,158,0.5)'

/**
 * 操作按钮图元（`command-button` 类型）：圆角矩形 + 居中指令文字。
 *
 * 为什么它是「有填充」的例外——画布是纯图形形态，设备不铺底色、靠线条表达；
 * 但按钮必须让人一眼看出「这里可以按」，没有可点击的实体形状就等于一个隐形
 * 热点。填充刻意用中性半透明灰，深浅两种画布底色上都能浮出来，颜色语义仍然
 * 交给描边与文字，与「状态色是唯一状态表达通道」保持一致。
 */
export function commandButtonConfig(
  element: ComponentInstance,
  layout: ElementLayout,
  color: string,
  pressed = false,
): CommandButtonConfig {
  const props = element.properties ?? {}
  const fontSize = Math.min(Math.max(Number(props.fontSize) || 14, 10), 48)
  const raw = props.label
  const label = typeof raw === 'string' && raw.length > 0 ? raw : '按钮'
  // 强调色为空时跟随状态色，与其余图元同一套变色口径
  const accent = typeof props.accent === 'string' && props.accent ? props.accent : color
  return {
    body: {
      x: layout.contentX,
      y: layout.contentY,
      width: layout.contentWidth,
      height: layout.contentHeight,
      fill: pressed ? BUTTON_FILL_PRESSED : BUTTON_FILL,
      stroke: accent,
      strokeWidth: 2,
      cornerRadius: 6,
      listening: true,
    },
    text: {
      text: label,
      fontSize,
      fontFamily: 'system-ui, "Segoe UI", "Microsoft YaHei", sans-serif',
      fill: accent,
      x: layout.contentX,
      y: layout.contentY,
      width: layout.contentWidth,
      height: layout.contentHeight,
      align: 'center' as const,
      verticalAlign: 'middle' as const,
      ellipsis: true,
      listening: false,
    },
  }
}

/**
 * 文本外发光：画面上没有底条承托文字，用深色光晕保证名称/数值压在图形或网格上
 * 依然可读（Konva 的 Text 不支持 CSS text-shadow，用 shadow* 系列实现）。
 */
const TEXT_HALO = {
  shadowColor: 'rgba(4,8,16,0.92)',
  shadowBlur: 4,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowOpacity: 1,
} as const

/** 底部名称：素文本（原先是一条 72% 不透明度的深色填充条，已去除） */
export function labelTextConfig(element: ComponentInstance, layout: ElementLayout) {
  return {
    text: element.name,
    fontSize: layout.nameFontSize,
    fill: '#dce8ee',
    width: element.width,
    align: 'center' as const,
    y: layout.nameY,
    listening: false,
    ellipsis: true,
    ...TEXT_HALO,
  }
}

/** 顶部实时值：素文本（原先带底色胶囊，已去除） */
export function valueTextConfig(
  element: ComponentInstance,
  layout: ElementLayout,
  text: string,
) {
  return {
    text,
    fontSize: layout.valueFontSize,
    fill: '#8fe6d3',
    width: element.width,
    align: 'center' as const,
    y: layout.valueY,
    listening: false,
    ellipsis: true,
    ...TEXT_HALO,
  }
}

/**
 * 数值显示图元：数值即图形本身，居中大字，颜色跟随元素状态色。
 * 该类型不再叠加内建图标（原先画着 "8.8" 的方框与实时大字重叠成重影）。
 */
export function displayTextConfig(
  element: ComponentInstance,
  layout: ElementLayout,
  text: string,
  color: string,
) {
  return {
    text,
    fontSize: layout.displayFontSize,
    fontStyle: 'bold' as const,
    fill: color,
    width: element.width,
    align: 'center' as const,
    y: layout.displayY,
    listening: false,
    ...TEXT_HALO,
  }
}
