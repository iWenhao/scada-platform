import type { ComponentInstance } from '@/types/scada'

/**
 * 命中层：透明矩形，保证 group 可点选/拖拽/变换。
 * 装饰层均为 listening:false，否则 Konva 找不到命中目标。
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

/** 元素外框阴影 */
export function bodyShadowConfig(element: ComponentInstance) {
  return {
    x: 2,
    y: 3,
    width: element.width,
    height: element.height,
    fill: 'rgba(0,0,0,0.28)',
    cornerRadius: 10,
    listening: false,
  }
}

/**
 * 元素主体：圆角卡片 + 状态色低饱和填充 + 描边。
 * 比纯色块更接近「工业仪表卡片」质感。
 */
export function bodyFillConfig(
  element: ComponentInstance,
  color: string,
  selected: boolean,
) {
  return {
    width: element.width,
    height: element.height,
    fill: color,
    opacity: 0.22,
    cornerRadius: 10,
    stroke: selected ? '#00d4aa' : color,
    strokeWidth: selected ? 2.5 : 1.5,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowBlur: selected ? 10 : 4,
    shadowOffset: { x: 0, y: 2 },
    listening: false,
  }
}

/** 内层高光线，增强体积 */
export function bodyTopGlowConfig(element: ComponentInstance) {
  return {
    x: 4,
    y: 4,
    width: Math.max(element.width - 8, 1),
    height: Math.min(14, element.height * 0.22),
    fill: 'rgba(255,255,255,0.1)',
    cornerRadius: 8,
    listening: false,
  }
}

/** 底部标签条 */
export function labelBarConfig(element: ComponentInstance, labelH: number) {
  return {
    y: element.height - labelH,
    width: element.width,
    height: labelH,
    fill: 'rgba(8,12,24,0.72)',
    cornerRadius: [0, 0, 10, 10],
    listening: false,
  }
}

export function labelTextConfig(element: ComponentInstance, labelH: number) {
  return {
    text: element.name,
    fontSize: Math.min(12, Math.max(9, labelH - 6)),
    fill: '#dce8ee',
    width: element.width,
    align: 'center' as const,
    y: element.height - labelH + (labelH - 14) / 2 + 1,
    listening: false,
    ellipsis: true,
  }
}

/** 实时值胶囊（非 display 图元） */
export function valuePillConfig(element: ComponentInstance, text: string) {
  const w = Math.min(element.width - 8, Math.max(36, text.length * 8 + 14))
  return {
    x: (element.width - w) / 2,
    y: 6,
    width: w,
    height: 18,
    fill: 'rgba(0, 212, 170, 0.12)',
    stroke: 'rgba(0, 212, 170, 0.35)',
    strokeWidth: 1,
    cornerRadius: 9,
    listening: false,
  }
}

export function valueTextConfig(element: ComponentInstance, text: string) {
  return {
    text,
    fontSize: 10,
    fill: '#8fe6d3',
    width: element.width,
    align: 'center' as const,
    y: 10,
    listening: false,
    ellipsis: true,
  }
}
