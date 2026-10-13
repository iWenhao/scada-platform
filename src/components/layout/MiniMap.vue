<template>
  <div ref="boxRef" class="minimap" title="点击或拖动以移动视图" @mousedown="startNavigate">
    <canvas ref="canvasRef" :width="box.width" :height="box.height" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import type { ComponentInstance } from '@/types/scada'
import { readThemeVar, useThemeTick } from '@/composables/useThemeCssVars'

const props = defineProps<{
  elements: ComponentInstance[]
  /** 画布尺寸 */
  canvasWidth: number
  canvasHeight: number
  /** 视口信息（舞台像素） */
  viewportX: number
  viewportY: number
  viewportW: number
  viewportH: number
  zoom: number
}>()

const emit = defineEmits<{
  /** 导航：请求把画布坐标 (x, y) 居中显示 */
  navigate: [x: number, y: number]
}>()

const boxRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const box = reactive({ width: 180, height: 110 })

// 等比适配并留边
let scale = 0.05
let letterX = 0
let letterY = 0

function computeScale() {
  const pad = 6
  const availW = box.width - pad * 2
  const availH = box.height - pad * 2
  if (props.canvasWidth <= 0 || props.canvasHeight <= 0) return
  scale = Math.min(availW / props.canvasWidth, availH / props.canvasHeight)
  letterX = (box.width - props.canvasWidth * scale) / 2
  letterY = (box.height - props.canvasHeight * scale) / 2
}

function draw() {
  const el = canvasRef.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return

  // 调色板跟随主题（fallback 与暗色变量一致，保证变量缺失时行为不变）
  const colorBg = readThemeVar('--minimap-bg', '#10141f')
  const colorBorder = readThemeVar('--minimap-border', '#2a3244')
  const colorElement = readThemeVar('--minimap-element', 'rgba(0, 212, 170, 0.45)')
  const colorViewport = readThemeVar('--minimap-viewport', '#ff4bd8')

  computeScale()
  ctx.clearRect(0, 0, box.width, box.height)

  // 画布范围
  ctx.fillStyle = colorBg
  ctx.fillRect(letterX, letterY, props.canvasWidth * scale, props.canvasHeight * scale)
  ctx.strokeStyle = colorBorder
  ctx.strokeRect(letterX, letterY, props.canvasWidth * scale, props.canvasHeight * scale)

  // 元素
  for (const el2 of props.elements) {
    ctx.fillStyle = colorElement
    ctx.fillRect(
      letterX + el2.x * scale,
      letterY + el2.y * scale,
      Math.max(el2.width * scale, 1),
      Math.max(el2.height * scale, 1),
    )
  }

  // 视口框（视口在画布坐标系中的位置: -offset/zoom, 尺寸: stage/zoom）
  const vx = letterX - (props.viewportX / props.zoom) * scale
  const vy = letterY - (props.viewportY / props.zoom) * scale
  const vw = (props.viewportW / props.zoom) * scale
  const vh = (props.viewportH / props.zoom) * scale
  ctx.strokeStyle = colorViewport
  ctx.lineWidth = 1.5
  ctx.strokeRect(vx, vy, vw, vh)
  ctx.lineWidth = 1
}

watch(
  () => [
    props.elements,
    props.canvasWidth,
    props.canvasHeight,
    props.viewportX,
    props.viewportY,
    props.viewportW,
    props.viewportH,
    props.zoom,
  ],
  () => draw(),
  { deep: true },
)

// 主题切换后变量值变化，需要重取颜色重绘
const themeTick = useThemeTick()
watch(themeTick, () => draw())

// 点击 / 拖动导航
let dragging = false

function pointToCanvas(e: MouseEvent): { x: number; y: number } | null {
  const boxEl = boxRef.value
  if (!boxEl) return null
  const rect = boxEl.getBoundingClientRect()
  const x = (e.clientX - rect.left - letterX) / scale
  const y = (e.clientY - rect.top - letterY) / scale
  return { x, y }
}

function startNavigate(e: MouseEvent) {
  const point = pointToCanvas(e)
  if (!point) return
  dragging = true
  emit('navigate', point.x, point.y)
  e.preventDefault()
}

function onMove(e: MouseEvent) {
  if (!dragging) return
  const point = pointToCanvas(e)
  if (point) emit('navigate', point.x, point.y)
}

function stopNavigate() {
  dragging = false
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  draw()
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', stopNavigate)
  if (boxRef.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => draw())
    resizeObserver.observe(boxRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', stopNavigate)
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style scoped lang="scss">
.minimap {
  position: absolute;
  right: 12px;
  bottom: 34px;
  background: var(--minimap-shell-bg, rgba(10, 14, 26, 0.85));
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  padding: 4px;
  z-index: 5;
  cursor: crosshair;

  canvas {
    display: block;
  }
}
</style>
