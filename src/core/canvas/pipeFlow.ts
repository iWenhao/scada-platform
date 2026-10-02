import { ref } from 'vue'
import type { ComponentInstance } from '@/types/scada'

/**
 * 管道画布渲染与流动动画。
 *
 * 管道不走通用 SVG 图标：图标按方形等比缩放，横向管件在宽元素里会缩成
 * 居中一小块，与横贯元素的流动虚线严重失调。改为用原生线条按元素尺寸
 * 绘制管身（上下管壁 + 两端法兰 + 管内流动虚线），任意宽高都清晰对齐，
 * 编辑器与预览页共用本模块的几何计算。
 *
 * 流动动画由全局 RAF 推进共享 offset，避免每根管道各开定时器；
 * 只有「流动中」的管道才订阅 offset，静止管道不参与每帧重绘。
 */

// —— 全局流动动画 ticker ——
export const flowOffset = ref(0)
let raf = 0
let running = false
let flowUsers = 0

function tick() {
  flowOffset.value = (flowOffset.value + 1) % 10000
  raf = requestAnimationFrame(tick)
}

function ensureTicker() {
  if (running) return
  running = true
  raf = requestAnimationFrame(tick)
}

/** 流动中的管道注册动画；返回清理函数，最后一个订阅者释放后停掉 RAF */
export function registerFlowAnimation(): () => void {
  flowUsers++
  ensureTicker()
  let released = false
  return () => {
    if (released) return
    released = true
    flowUsers = Math.max(0, flowUsers - 1)
    if (flowUsers === 0 && running) {
      running = false
      cancelAnimationFrame(raf)
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

/** 管身静态图形：上下管壁 + 两端法兰（法兰用圆头粗竖线），颜色跟随状态色 */
export function pipeBodyConfigs(element: ComponentInstance, color: string, labelH: number) {
  const { midY, bodyH, left, right } = pipeGeometry(element, labelH)
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
