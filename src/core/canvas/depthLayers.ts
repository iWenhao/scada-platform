import type { ComponentInstance } from '@/types/scada'

/**
 * 2.5D 立体感图元：地面投影 + 侧面 + 顶面高光。
 * 返回 Konva 配置数组，按顺序画在主体色块之下/之上。
 */
/** 地面投影（2.5D） */
export function depthShadowConfig(element: ComponentInstance, enabled: boolean) {
  if (!enabled) return null
  const w = element.width
  const h = element.height
  const depth = Math.min(10, Math.max(5, w * 0.06))
  return {
    x: w / 2 + depth * 0.35,
    y: h + depth * 0.45,
    radiusX: w / 2 + 4,
    radiusY: 8,
    fill: 'rgba(0,0,0,0.28)',
    listening: false,
  }
}

/** 侧面体积（2.5D） */
export function depthSideConfig(element: ComponentInstance, baseColor: string, enabled: boolean) {
  if (!enabled) return null
  const w = element.width
  const h = element.height
  const depth = Math.min(10, Math.max(5, w * 0.06))
  return {
    x: depth * 0.55,
    y: depth * 0.55,
    width: w,
    height: h,
    fill: shade(baseColor, -0.35),
    opacity: 0.95,
    cornerRadius: 4,
    listening: false,
  }
}

/** 顶面高光（2.5D） */
export function depthHighlightConfig(element: ComponentInstance, enabled: boolean) {
  if (!enabled) return null
  const w = element.width
  const h = element.height
  return {
    x: 0,
    y: 0,
    width: w,
    height: Math.min(8, h * 0.18),
    fill: 'rgba(255,255,255,0.12)',
    cornerRadius: 4,
    listening: false,
  }
}

function shade(hex: string, amount: number): string {
  // #rgb / #rrggbb 简单压暗
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('')
  if (c.length !== 6) return hex
  const num = parseInt(c, 16)
  const r = clamp(((num >> 16) & 255) * (1 + amount))
  const g = clamp(((num >> 8) & 255) * (1 + amount))
  const b = clamp((num & 255) * (1 + amount))
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)))
}
