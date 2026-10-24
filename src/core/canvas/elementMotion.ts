/**
 * 设备运转动效的几何与配置（纯函数，编辑器画布与预览页共用）。
 *
 * 为什么可动件要单独渲染：设备图标是 `new Image()` 把整段 SVG 光栅化成**一张位图**
 * 后交给 Konva 的，Konva 无法让位图里的某一个圆单独旋转。所以定义层把可动件
 * （截割滚筒的截齿、截割头的截齿、皮带面）从主图标里拆出来放进 `motion`，
 * 这里再把它们摆回主图标里的原位置——用同一套 contain 变换换算坐标。
 *
 * 坐标换算：可动件片段与主图标同在 0..100 用户坐标系，因此
 *   元素坐标 = 图标矩形 + (用户坐标 - 图标内容包围盒原点) × 缩放比
 * 与 iconBounds.tightenIconSvg 收紧 viewBox 的口径完全一致，停转时两者严丝合缝。
 *
 * 非浏览器环境（单测/SSR）拿不到 SVG 测量能力，一律返回空数组，渲染侧自然不画可动件
 * ——不能靠猜坐标把滚筒画到机身外面去。坐标换算本身是纯函数（makeIconFrame/placeRotor），
 * 单测直接喂显式包围盒即可覆盖，不依赖浏览器。
 */

import type { ComponentInstance, MotionBelt, MotionRotor, ViewMode } from '@/types/scada'
import type { ElementLayout, FitRect } from './elementLayout'
import { fitIconRect } from './elementLayout'
import { getComponentDefinition } from '@/industrial/registry'
import { getIconBounds, tightenIconSvg, type IconBounds } from './iconBounds'
import { getIconImage } from './iconImage'

/** 角速度系数（度/秒 每单位速度值）：速度 1 时约 5 秒一圈 */
const ROTOR_DEG_PER_UNIT = 70
/** 角速度下限：只要判为运转就得看得出来在转 */
const ROTOR_MIN_DEG_PER_SEC = 110
/** 角速度上限：截齿转速过高会被显示器采样成静止或倒转（视觉频闪） */
const ROTOR_MAX_DEG_PER_SEC = 400

/** 带面流动速度系数（像素/秒 每单位速度值） */
const BELT_PX_PER_UNIT = 26
const BELT_MIN_PX_PER_SEC = 30
const BELT_MAX_PX_PER_SEC = 120

/**
 * 带面滚动标记的比例（相对带面厚度）。
 * 标记高度取 0.62 而不是更满：上下都要留出间隙，标记才读作「带面上的件」，
 * 同时给缩小时的线宽下限留余量（下限会往上顶，间隙太小就会穿出带面）。
 */
const BELT_MARK_HEIGHT_RATIO = 0.62
const BELT_MARK_WIDTH_RATIO = 0.2
const BELT_MARK_GAP_RATIO = 0.36

export interface MotionTiming {
  /** 角速度（度/秒） */
  degPerSec: number
  /** 带面流动速度（像素/秒） */
  beltPxPerSec: number
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/**
 * 驱动速度值 → 动画速率。
 * 上下限都是防「看起来坏掉」的：转速过高像静止，流速过高看不出方向。
 */
export function resolveMotionTiming(
  speed: number,
  degPerUnit?: number,
): MotionTiming {
  const s = Math.max(0, Number(speed) || 0)
  // 停机 ≠ 慢转：速度为 0 就不动，不靠「速率下限」硬撑出转动
  if (!(s > 0)) return { degPerSec: 0, beltPxPerSec: 0 }
  const unit =
    Number.isFinite(degPerUnit) && (degPerUnit as number) > 0
      ? (degPerUnit as number)
      : ROTOR_DEG_PER_UNIT
  return {
    degPerSec: clamp(unit * s, ROTOR_MIN_DEG_PER_SEC, ROTOR_MAX_DEG_PER_SEC),
    beltPxPerSec: clamp(BELT_PX_PER_UNIT * s, BELT_MIN_PX_PER_SEC, BELT_MAX_PX_PER_SEC),
  }
}

export interface IconFrame {
  /** 图标内容包围盒（用户坐标） */
  bounds: IconBounds
  /** 图标在元素内的矩形 */
  rect: FitRect
  /** 用户单位 → 元素像素的缩放比 */
  scale: number
  mapX: (ux: number) => number
  mapY: (uy: number) => number
}

/** 由图标包围盒与图形区构造坐标映射（与渲染图标时用的是同一套 contain 变换） */
export function makeIconFrame(bounds: IconBounds, layout: ElementLayout): IconFrame {
  const rect = fitIconRect(
    layout.contentX,
    layout.contentY,
    layout.contentWidth,
    layout.contentHeight,
    bounds.width / bounds.height,
  )
  const scale = rect.width / bounds.width
  return {
    bounds,
    rect,
    scale,
    mapX: (ux: number) => rect.x + (ux - bounds.x) * scale,
    mapY: (uy: number) => rect.y + (uy - bounds.y) * scale,
  }
}

/**
 * 旋转件在元素内的摆放（纯计算）。
 *
 * Konva 的节点变换是 translate(x,y) → rotate → translate(-offsetX,-offsetY)，
 * 因此把 x/y 指向旋转中心、offset 指向「旋转中心相对图片左上角」的偏移，
 * 旋转就严格发生在指定圆心上，而不是绕图片边框的角。
 */
export function placeRotor(
  frame: IconFrame,
  rotorBox: IconBounds,
  rotor: Pick<MotionRotor, 'cx' | 'cy' | 'direction'>,
  angleDeg: number,
  image: unknown,
): Record<string, any> | null {
  if (!(rotorBox.width > 0) || !(rotorBox.height > 0)) return null

  const left = frame.mapX(rotorBox.x)
  const top = frame.mapY(rotorBox.y)
  const centerX = frame.mapX(rotor.cx)
  const centerY = frame.mapY(rotor.cy)
  const direction = rotor.direction === -1 ? -1 : 1

  return {
    image,
    x: centerX,
    y: centerY,
    offsetX: centerX - left,
    offsetY: centerY - top,
    width: rotorBox.width * frame.scale,
    height: rotorBox.height * frame.scale,
    rotation: direction * angleDeg,
    listening: false,
  }
}

/**
 * 带面滚动标记的配置（纯计算）：竖线标记沿带面推进，表达输送方向与带速。
 *
 * 标记高度取带面厚度的一部分（而不是固定像素），因此缩放到任何尺寸都仍是「竖起来的
 * 标记」；线帽用 butt——圆头线帽会给每个短划两端各加半个线宽，短划被撑长后会首尾
 * 相连，带面就糊成一条实线，看不出在动。
 */
export function buildBeltConfig(
  frame: IconFrame,
  belt: MotionBelt,
  color: string,
  offsetPx: number,
): Record<string, any> {
  const direction = belt.direction === -1 ? -1 : 1
  const x1 = frame.mapX(Math.min(belt.x1, belt.x2))
  const x2 = frame.mapX(Math.max(belt.x1, belt.x2))
  // 斜置带面：两端高度都换算，标记才沿带面中线走；水平带面 y2 缺省等于 y
  const y1 = frame.mapY(belt.y)
  const y2 = frame.mapY(belt.y2 ?? belt.y)
  const band = Math.max(belt.bandHeight, 1) * frame.scale
  return {
    points: [x1, y1, x2, y2],
    stroke: color,
    strokeWidth: clamp(band * BELT_MARK_HEIGHT_RATIO, 3, 40),
    dash: [
      clamp(band * BELT_MARK_WIDTH_RATIO, 1.5, 12),
      clamp(band * BELT_MARK_GAP_RATIO, 2, 18),
    ],
    dashOffset: -direction * offsetPx,
    lineCap: 'butt' as const,
    opacity: 0.9,
    listening: false,
  }
}

/** 可动件片段 → 可独立测量/光栅化的 SVG（保持主图标的用户坐标系） */
function wrapFragment(fragment: string): string {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${fragment}</svg>`
}

/** 主图标在元素内的坐标映射；测量不可用时返回 null（放弃渲染可动件） */
function iconFrameOf(layout: ElementLayout, iconSvg: string): IconFrame | null {
  const bounds = getIconBounds(iconSvg)
  if (!bounds || !(bounds.width > 0) || !(bounds.height > 0)) return null
  return makeIconFrame(bounds, layout)
}

/** 旋转件位图配置（rotation 由调用方逐帧传入角度） */
export function getRotorConfigs(
  element: ComponentInstance,
  layout: ElementLayout,
  color: string,
  mode: ViewMode,
  angleDeg: number,
  onLoad?: () => void,
): Array<Record<string, any>> {
  const def = getComponentDefinition(element.type)
  const rotors = def?.motion?.rotors
  if (!def || !rotors?.length) return []

  const frame = iconFrameOf(layout, def.icon)
  if (!frame) return []

  const configs: Array<Record<string, any>> = []

  rotors.forEach((rotor, index) => {
    // 双源转子：2.5D 用面基稿（svg25d），2D 保持挖取自素材的原片段——与 icon/icon25d
    // 同构。两种片段各自的内容包围盒只决定自己位图的摆放，几何都在真坐标上，不会错位
    const fragment = mode === '25d' && rotor.svg25d ? rotor.svg25d : rotor.svg
    const wrapped = wrapFragment(fragment)
    const rotorBox = getIconBounds(wrapped)
    if (!rotorBox) return

    // 缓存键要带类型与序号：图集按 type|color|风格 缓存，不同可动件不能互相顶掉
    const img = getIconImage(
      `${element.type}#rotor${index}`,
      tightenIconSvg(wrapped),
      color,
      mode,
      onLoad,
    )
    if (!img) return

    const config = placeRotor(frame, rotorBox, rotor, angleDeg, img)
    if (config) configs.push(config)
  })

  return configs
}

/** 带面流动虚线配置（offsetPx 由调用方逐帧推进 = Σ 流速 × 时间） */
export function getBeltConfigs(
  element: ComponentInstance,
  layout: ElementLayout,
  color: string,
  offsetPx: number,
): Array<Record<string, any>> {
  const def = getComponentDefinition(element.type)
  const belts = def?.motion?.belts
  if (!def || !belts?.length) return []

  const frame = iconFrameOf(layout, def.icon)
  if (!frame) return []

  return belts.map(belt => buildBeltConfig(frame, belt, color, offsetPx))
}
