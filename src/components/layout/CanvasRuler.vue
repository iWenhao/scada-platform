<template>
  <canvas ref="canvasRef" class="canvas-ruler" :class="orientation" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  /** horizontal: 顶部水平标尺; vertical: 左侧垂直标尺 */
  orientation: 'horizontal' | 'vertical'
  /** 画布长度（canvas 配置的宽或高） */
  canvasLength: number
  /** 当前缩放 */
  zoom: number
  /** 舞台在该轴上的偏移 */
  offset: number
  /** 视口在该轴上的像素长度 */
  viewport: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | null = null

// 常用刻度步长，选择第一个在屏幕上间距 >= 48px 的
const STEPS = [5, 10, 20, 50, 100, 200, 500, 1000, 2000]

function draw() {
  const el = canvasRef.value
  if (!el) return

  const horizontal = props.orientation === 'horizontal'
  const w = el.clientWidth
  const h = el.clientHeight
  if (w === 0 || h === 0) return
  el.width = w
  el.height = h

  const ctx = el.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#151a28'
  ctx.fillRect(0, 0, w, h)

  const thick = horizontal ? h : w
  const step = STEPS.find(s => s * props.zoom >= 48) ?? 5000
  const minor = step / 5

  // 视口可见的画布坐标范围
  const start = Math.max(0, -props.offset / props.zoom)
  const end = Math.min(props.canvasLength, (props.viewport - props.offset) / props.zoom)

  ctx.strokeStyle = '#3d4658'
  ctx.fillStyle = '#8892a6'
  ctx.font = '10px sans-serif'
  ctx.lineWidth = 1

  const from = Math.floor(start / minor) * minor
  for (let pos = from; pos <= end + minor; pos += minor) {
    if (pos < 0) continue
    const screen = Math.round(pos * props.zoom + props.offset) + 0.5

    const isMajor = Math.abs(pos % step) < 1e-6 || Math.abs(pos % step) > step - 1e-6
    const tick = isMajor ? thick / 2 : thick / 4

    ctx.beginPath()
    if (horizontal) {
      ctx.moveTo(screen, thick - tick)
      ctx.lineTo(screen, thick)
    } else {
      ctx.moveTo(thick - tick, screen)
      ctx.lineTo(thick, screen)
    }
    ctx.stroke()

    if (isMajor) {
      ctx.fillText(String(pos), horizontal ? screen + 3 : 2, horizontal ? 11 : screen + 3)
    }
  }

  // 边缘线
  ctx.strokeStyle = '#2a3244'
  ctx.beginPath()
  if (horizontal) {
    ctx.moveTo(0, thick - 0.5)
    ctx.lineTo(w, thick - 0.5)
  } else {
    ctx.moveTo(thick - 0.5, 0)
    ctx.lineTo(thick - 0.5, h)
  }
  ctx.stroke()
}

watch(
  () => [props.canvasLength, props.zoom, props.offset, props.viewport],
  () => draw(),
)

onMounted(() => {
  draw()
  if (canvasRef.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => draw())
    resizeObserver.observe(canvasRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped lang="scss">
.canvas-ruler {
  display: block;

  &.horizontal {
    width: 100%;
    height: 20px;
  }

  &.vertical {
    width: 20px;
    height: 100%;
  }
}
</style>
