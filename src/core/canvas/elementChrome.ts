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
