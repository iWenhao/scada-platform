<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="720px"
    :close-on-click-modal="false"
  >
    <div class="trend-body">
      <div class="trend-info" v-if="points.length">
        <span class="trend-label">数据点数</span>
        <span class="trend-value">{{ points.length }}</span>
        <span class="trend-label">当前值</span>
        <span class="trend-value current">{{ lastValue }}</span>
        <span class="trend-label">最小</span>
        <span class="trend-value">{{ minValue }}</span>
        <span class="trend-label">最大</span>
        <span class="trend-value">{{ maxValue }}</span>
      </div>

      <svg
        ref="svgRef"
        :width="chartW"
        :height="chartH"
        class="trend-svg"
      >
        <!-- 网格线 -->
        <line
          v-for="i in 5" :key="'h' + i"
          :x1="padL" :x2="chartW - padR"
          :y1="padT + (chartH - padT - padB) / 5 * (i - 1)"
          :y2="padT + (chartH - padT - padB) / 5 * (i - 1)"
          stroke="var(--border-primary)" stroke-width="0.5" opacity="0.4"
        />
        <!-- Y 轴标签 -->
        <text
          v-for="i in 6" :key="'yl' + i"
          :x="padL - 6" :y="padT + (chartH - padT - padB) / 5 * (i - 1) + 4"
          text-anchor="end" font-size="10" fill="var(--text-muted)"
        >
          {{ yLabels[i - 1] }}
        </text>
        <!-- 折线 -->
        <polyline
          v-if="svgPoints.length > 1"
          :points="svgPoints"
          fill="none"
          stroke="var(--accent-primary)"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <!-- 最后值标记 -->
        <circle
          v-if="svgPoints.length"
          :cx="lastPt.x" :cy="lastPt.y" r="4"
          fill="var(--accent-primary)"
        />
        <text
          v-if="svgPoints.length"
          :x="lastPt.x + 8" :y="lastPt.y - 6"
          font-size="11" font-weight="bold" fill="var(--accent-primary)"
        >
          {{ lastValue }}
        </text>
      </svg>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'

const props = defineProps<{
  modelValue: boolean
  deviceId: string
  variable: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const deviceStore = useDeviceStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const title = computed(() => `${props.deviceId}.${props.variable} - 趋势图`)

const chartW = 660
const chartH = 320
const padL = 50
const padR = 60
const padT = 20
const padB = 20

const svgRef = ref<SVGSVGElement>()
const tick = ref(0)
let timer: number | null = null

const points = computed(() => {
  void tick.value // 依赖 tick 以触发周期性刷新
  return deviceStore.getHistory(props.deviceId, props.variable)
})

const stats = computed(() => {
  const pts = points.value
  if (!pts.length) return { min: 0, max: 1, range: 1 }
  let min = Infinity, max = -Infinity
  for (const p of pts) {
    if (p.v < min) min = p.v
    if (p.v > max) max = p.v
  }
  const range = max - min || 1
  return { min, max, range }
})

const minValue = computed(() => {
  const v = stats.value.min
  return typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v)
})

const maxValue = computed(() => {
  const v = stats.value.max
  return typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v)
})

const lastValue = computed(() => {
  const pts = points.value
  if (!pts.length) return '-'
  const v = pts[pts.length - 1].v
  return typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v)
})

const yLabels = computed(() => {
  const { max, range } = stats.value
  return Array.from({ length: 6 }, (_, i) => {
    const val = max - (range / 5) * i
    return typeof val === 'number' ? String(Math.round(val * 100) / 100) : String(val)
  })
})

const svgPoints = computed(() => {
  const pts = points.value
  if (pts.length < 2) return ''
  const { max, range } = stats.value
  const innerW = chartW - padL - padR
  const innerH = chartH - padT - padB

  return pts
    .map((p, i) => {
      const x = padL + (i / (pts.length - 1)) * innerW
      const y = padT + innerH - ((p.v - (max - range)) / range) * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const lastPt = computed(() => {
  const pts = points.value
  if (!pts.length) return { x: 0, y: 0 }
  const { max, range } = stats.value
  const innerH = chartH - padT - padB
  const last = pts[pts.length - 1]
  return {
    x: padL + (pts.length > 1 ? (pts.length - 1) / (pts.length - 1) * (chartW - padL - padR) : 0),
    y: padT + innerH - ((last.v - (max - range)) / range) * innerH,
  }
})

watch(() => props.modelValue, (val) => {
  if (val) {
    timer = window.setInterval(() => { tick.value++ }, 1000)
  } else if (timer) {
    clearInterval(timer)
    timer = null
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped lang="scss">
.trend-body {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  padding: 12px;
}

.trend-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;

  .trend-label {
    color: var(--text-muted);
  }

  .trend-value {
    color: var(--text-primary);
    font-family: monospace;
    font-weight: 600;
    margin-right: 8px;
  }

  .trend-value.current {
    color: var(--accent-primary);
    font-size: 14px;
  }
}

.trend-svg {
  display: block;
  width: 100%;
}
</style>
