import { ref } from 'vue'
import type { ComponentInstance } from '@/types/scada'

/**
 * 管道内液体流动：中心虚线 + dashOffset 动画。
 * 用全局 RAF 推进 offset，避免每个管道各开一个定时器。
 */
const offset = ref(0)
let raf = 0
let running = false
const listeners = new Set<() => void>()

function tick() {
  offset.value = (offset.value + 1) % 10000
  listeners.forEach(fn => fn())
  raf = requestAnimationFrame(tick)
}

function ensureTicker() {
  if (running) return
  running = true
  raf = requestAnimationFrame(tick)
}

export function usePipeFlow() {
  function pipeFlowConfig(element: ComponentInstance) {
    const props = element.properties || {}
    const show = props.showFlow !== false
    const direction = props.flowDirection === 'reverse' ? 'reverse' : 'forward'
    const speed = Math.max(0, Number(props.flowSpeed) || 1)
    // 方向决定 dash 推进方向
    const dir = direction === 'reverse' ? -1 : 1
    const dashOffset = -dir * offset.value * speed * 0.6

    return {
      points: [8, element.height / 2, element.width - 8, element.height / 2],
      stroke: 'rgba(0, 212, 170, 0.85)',
      strokeWidth: 3,
      dash: [10, 8],
      dashOffset,
      lineCap: 'round' as const,
      visible: show,
      listening: false,
    }
  }

  /** 需要在动画帧重绘的组件里调用 */
  function bind() {
    const noop = () => {}
    listeners.add(noop)
    ensureTicker()
    return () => {
      listeners.delete(noop)
      if (listeners.size === 0 && running) {
        running = false
        cancelAnimationFrame(raf)
      }
    }
  }

  return { pipeFlowConfig, bind }
}
