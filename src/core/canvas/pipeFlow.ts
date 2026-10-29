import { ref } from 'vue'
import type { ComponentInstance, ViewMode } from '@/types/scada'
import { onFrame } from './animationClock'
import { CYLINDER_STOPS, EDGE_SPEC } from './faceLighting'

/**
 * 管道画布渲染与流动动画。
 *
 * 管道不走通用 SVG 图标：图标按方形等比缩放，横向管件在宽元素里会缩成
 * 居中一小块，与横贯元素的流动虚线严重失调。改为用原生线条按元素尺寸
 * 绘制管身（上下管壁 + 两端法兰 + 管内流动虚线），任意宽高都清晰对齐，
 * 编辑器与预览页共用本模块的几何计算。
 *
 * 流动动画交给全局动画时钟（animationClock.ts）推进共享 offset，与设备运转动效
 * 共用同一个 RAF；只有「流动中」的管道才订阅 offset，静止管道不参与每帧重绘。
 */

// —— 全局流动动画：由共享时钟推进的 offset ——
export const flowOffset = ref(0)
let flowUsers = 0
let stopClock: (() => void) | null = null

/** 流动中的管道注册动画；返回清理函数，最后一个订阅者释放后停掉共享时钟 */
export function registerFlowAnimation(): () => void {
  flowUsers++
  if (!stopClock) {
    // 时间基准而非帧计数：60Hz 下每帧约推进 1（沿用改造前的视觉速度），
    // 同时免除刷新率对流速的影响
    stopClock = onFrame(dt => {
      flowOffset.value = (flowOffset.value + dt * 0.06) % 10000
    })
  }
  let released = false
  return () => {
    if (released) return
    released = true
    flowUsers = Math.max(0, flowUsers - 1)
    if (flowUsers === 0 && stopClock) {
      stopClock()
      stopClock = null
    }
  }
}

/**
 * 管身几何：以元素左上角为原点（Konva group 内坐标系）。
 * labelH 由调用方传入（与底部标签条同一套计算），管身在标签条以上的区域居中。
 * 管径（10..500）映射为管身占可用高度的比例：缺省 50 → 一半，过细/过粗做钳制。
 */
export function pipeGeometry(element: ComponentInstance, labelH: number) {
  const boxH = Math.max(element.height - labelH - 10, 4)
  const diameter = Number(element.properties?.diameter) || 50
  const ratio = Math.min(0.72, Math.max(0.18, diameter / 100))
  const bodyH = Math.max(2, Math.min(boxH * ratio, boxH))
  // 两端留白，管口不顶到元素边缘
  const inset = 6
  return {
    midY: 4 + boxH / 2,
    bodyH,
    left: inset,
    right: Math.max(element.width - inset, inset + 4),
  }
}

/**
 * 管身静态图形，颜色跟随状态色。
 * 2D：上下管壁 + 两端法兰（法兰用圆头粗竖线）；2.5D：渐变圆柱，见 `cylinderConfigs`。
 */
export function pipeBodyConfigs(
  element: ComponentInstance,
  color: string,
  labelH: number,
  viewMode: ViewMode = '2d',
) {
  const geometry = pipeGeometry(element, labelH)
  const { midY, bodyH, left, right } = geometry
  if (viewMode === '25d') {
    const cylinder = cylinderConfigs(color, geometry)
    // 颜色不是 hex / rgb()（例如开发者传了 var(...)）时退回线条稿：宁可不立体，也不要一块没明暗的实心条
    if (cylinder) return cylinder
  }
  const wall = bodyH / 2
  const flange = wall + 4
  return [
    {
      points: [left, midY - wall, right, midY - wall],
      stroke: color,
      strokeWidth: 2,
      listening: false,
    },
    {
      points: [left, midY + wall, right, midY + wall],
      stroke: color,
      strokeWidth: 2,
      listening: false,
    },
    {
      points: [left, midY - flange, left, midY + flange],
      stroke: color,
      strokeWidth: 5,
      lineCap: 'round' as const,
      listening: false,
    },
    {
      points: [right, midY - flange, right, midY + flange],
      stroke: color,
      strokeWidth: 5,
      lineCap: 'round' as const,
      listening: false,
    },
  ]
}

/**
 * 状态色 → 描边渐变各档。Konva 的渐变只认颜色、没有 stop-opacity，所以把同一个状态色
 * 按 `CYLINDER_STOPS`（= FACE_STYLE.barrel）的不透明度写成 rgba 各档——管道与图标
 * 设备用的是同一组明暗数字。解析不了颜色时返回 null。
 */
function barrelStops(color: string): Array<number | string> | null {
  const rgb = parseRgb(color)
  if (!rgb) return null
  const stops: Array<number | string> = []
  for (const [offset, alpha] of CYLINDER_STOPS) {
    stops.push(offset, `rgba(${rgb},${alpha})`)
  }
  return stops
}

/** 解析 #rgb / #rrggbb / rgb() / rgba() 为 "r,g,b"；颜色通道一律按 0~255 取整 */
function parseRgb(color: string): string | null {
  const value = color.trim()
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1]
    return [0, 2, 4].map(i => parseInt(raw.slice(i, i + 2), 16)).join(',')
  }
  const fn = value.match(/^rgba?\(([^)]+)\)$/i)
  if (fn) {
    const parts = fn[1].split(',').map(s => s.trim())
    const channels = parts.slice(0, 3).map(p => Number.parseInt(p, 10))
    if (channels.length === 3 && channels.every(n => Number.isFinite(n))) return channels.join(',')
  }
  return null
}

/**
 * 2.5D 管身：横卧圆柱。整根管身是**一条带渐变描边的中心线**——渐变轴竖直穿过管壁，
 * 亮带压在天顶、向下逐档压暗，和图标里 `barrel` 面的光感一致；上下两条棱线收边，
 * 两端法兰用同一条渐变轴的竖带（越过管壁的部分被 clamp 成盘缘），内侧各压一道接缝。
 *
 * 几何全部取自 `pipeGeometry`，端点与 2D 的管壁 / 法兰完全重合：切换风格时管段长度、
 * 法兰位置都不动。
 */
function cylinderConfigs(color: string, geometry: ReturnType<typeof pipeGeometry>): any[] | null {
  const stops = barrelStops(color)
  if (!stops) return null
  const { midY, bodyH, left, right } = geometry
  const wall = bodyH / 2
  const flange = wall + 4
  // 法兰与管身共用同一条竖直渐变轴，接缝处才不会出现明暗断层
  const axis = {
    strokeLinearGradientStartPoint: { x: 0, y: midY - wall },
    strokeLinearGradientEndPoint: { x: 0, y: midY + wall },
    strokeLinearGradientColorStops: stops,
  }
  const seam = (x: number) => ({
    points: [x, midY - flange, x, midY + flange],
    stroke: '#000000',
    opacity: EDGE_SPEC.lo.opacity,
    strokeWidth: EDGE_SPEC.lo.width,
    lineCap: 'butt' as const,
    listening: false,
  })
  return [
    {
      points: [left, midY, right, midY],
      stroke: color,
      strokeWidth: bodyH,
      lineCap: 'butt' as const,
      ...axis,
      listening: false,
    },
    {
      points: [left, midY - wall, right, midY - wall],
      stroke: color,
      strokeWidth: EDGE_SPEC.hi.width,
      lineCap: 'butt' as const,
      listening: false,
    },
    {
      points: [left, midY + wall, right, midY + wall],
      stroke: '#000000',
      opacity: EDGE_SPEC.lo.opacity,
      strokeWidth: EDGE_SPEC.lo.width,
      lineCap: 'butt' as const,
      listening: false,
    },
    {
      points: [left, midY - flange, left, midY + flange],
      stroke: color,
      strokeWidth: 5,
      lineCap: 'round' as const,
      ...axis,
      listening: false,
    },
    {
      points: [right, midY - flange, right, midY + flange],
      stroke: color,
      strokeWidth: 5,
      lineCap: 'round' as const,
      ...axis,
      listening: false,
    },
    seam(left + 2.5),
    seam(right - 2.5),
  ]
}

/**
 * 管内流动虚线：流动时按流向/流速推进 dashOffset，静止时归零停住。
 * 颜色跟随状态色——静止状态不再被写死的青色流动虚线掩盖。
 */
export function pipeDashConfig(
  element: ComponentInstance,
  color: string,
  labelH: number,
  opts: { flowing: boolean; offset: number },
) {
  const props = element.properties || {}
  const { midY, bodyH, left, right } = pipeGeometry(element, labelH)
  const dir = props.flowDirection === 'reverse' ? -1 : 1
  const speed = Math.max(0, Number(props.flowSpeed) || 1)
  return {
    points: [left + 6, midY, right - 6, midY],
    stroke: color,
    // 圆头线帽会在两端各延伸半个线宽，间隙要留足余量才能看出流动方向
    strokeWidth: Math.max(2, Math.min(bodyH * 0.32, 14)),
    dash: [12, 16],
    dashOffset: opts.flowing ? -dir * opts.offset * speed * 0.6 : 0,
    lineCap: 'round' as const,
    visible: props.showFlow !== false,
    listening: false,
  }
}
