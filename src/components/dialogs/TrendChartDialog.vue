<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="720px"
    :close-on-click-modal="false"
  >
    <div class="trend-body">
      <div class="trend-range">
        <span class="trend-range-label">时间范围</span>
        <el-radio-group v-model="range" size="small">
          <el-radio-button value="live">实时</el-radio-button>
          <el-radio-button value="1h">1 小时</el-radio-button>
          <el-radio-button value="24h">24 小时</el-radio-button>
          <el-radio-button value="7d">7 天</el-radio-button>
        </el-radio-group>
        <span v-if="range !== 'live' && loadingRemote" class="trend-range-hint">加载中…</span>
        <span v-else-if="range !== 'live' && loadError" class="trend-range-hint error">{{ loadError }}</span>
        <span v-else-if="range !== 'live'" class="trend-range-hint">
          {{ historyBackend === 'remote' ? '来自服务端历史存储' : '后端离线，历史暂存本机（按用户隔离）' }}
        </span>

        <div class="spacer" />
        <el-select v-if="range !== 'live'" v-model="aggChoice" size="small" class="agg-select" title="长跨度查询按窗口聚合，点数更平滑">
          <el-option label="聚合: 自动" value="auto" />
          <el-option label="聚合: 原始" value="none" />
          <el-option label="聚合: 按分钟" value="minute" />
          <el-option label="聚合: 按小时" value="hour" />
        </el-select>
        <el-button size="small" :disabled="!points.length" @click="exportCsv">
          <el-icon><Download /></el-icon>
          导出 CSV
        </el-button>
      </div>

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

      <div v-if="!points.length" class="trend-empty">
        <template v-if="range === 'live'">
          暂无历史数据，等待数据源推送后自动采集
        </template>
        <template v-else-if="!loadingRemote">
          该时间范围内没有历史数据；确认存储后端在线且已积累采样后再试
        </template>
      </div>

      <template v-else>
        <!-- viewBox 与 width/height 保持一致：丢掉 viewBox 时 CSS 的 width:100% 会横向拉伸、
             纵向不变，导致折线与坐标轴错位 -->
        <svg
          ref="svgRef"
          :viewBox="`0 0 ${chartW} ${chartH}`"
          :width="chartW"
          :height="chartH"
          preserveAspectRatio="xMidYMid meet"
          class="trend-svg"
        >
          <!-- 网格线 -->
          <line
            v-for="i in 5" :key="'h' + i"
            :x1="padL" :x2="chartW - padR"
            :y1="padT + innerH / 5 * (i - 1)"
            :y2="padT + innerH / 5 * (i - 1)"
            stroke="var(--border-primary)" stroke-width="0.5" opacity="0.4"
          />
          <!-- Y 轴标签 -->
          <text
            v-for="i in 6" :key="'yl' + i"
            :x="padL - 6" :y="padT + innerH / 5 * (i - 1) + 4"
            text-anchor="end" font-size="10" fill="var(--text-muted)"
          >
            {{ yLabels[i - 1] }}
          </text>
          <!-- X 轴时间刻度 -->
          <text
            v-for="label in xLabels" :key="'xl' + label.x"
            :x="label.x" :y="chartH - padB + 14"
            text-anchor="middle" font-size="10" fill="var(--text-muted)"
          >
            {{ label.text }}
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
      </template>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { queryHistory, historianBackend, type SamplePoint, type HistoryAgg } from '@/history/historian'
import { historyToCsv, downloadCsv } from '@/export/csv'

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
const padB = 24
const innerW = chartW - padL - padR
const innerH = chartH - padT - padB

const svgRef = ref<SVGSVGElement>()
const tick = ref(0)
let timer: number | null = null

// ---- 时间范围：live 用内存缓冲实时刷新，其余从服务端历史存储查询 ----
type TrendRange = 'live' | '1h' | '24h' | '7d'
const RANGE_MS: Record<Exclude<TrendRange, 'live'>, number> = {
  '1h': 3600_000,
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
}

const range = ref<TrendRange>('live')
const historyBackend = ref<'remote' | 'local'>(historianBackend())
const remotePoints = ref<SamplePoint[]>([])
const loadingRemote = ref(false)
const loadError = ref('')
let remoteTimer: number | null = null

/**
 * 聚合方式：'auto' 按范围自动（1h 原始 / 24h 按分钟 / 7d 按小时），
 * 也可手动固定。聚合后曲线更平滑、点数可控，长跨度查询不卡。
 */
type AggChoice = 'auto' | 'none' | 'minute' | 'hour'
const aggChoice = ref<AggChoice>('auto')

function resolveAgg(ms: number): { agg?: HistoryAgg; windowMs?: number } {
  if (aggChoice.value === 'none') return {}
  if (aggChoice.value === 'minute') return { agg: 'avg', windowMs: 60_000 }
  if (aggChoice.value === 'hour') return { agg: 'avg', windowMs: 3_600_000 }
  // auto
  if (ms <= 3_600_000) return {}
  if (ms <= 24 * 3_600_000) return { agg: 'avg', windowMs: 60_000 }
  return { agg: 'avg', windowMs: 3_600_000 }
}

const points = computed(() => {
  void tick.value // 依赖 tick 以触发周期性刷新
  if (range.value === 'live') {
    return deviceStore.getHistory(props.deviceId, props.variable)
  }
  return remotePoints.value
})

async function loadRemote() {
  const ms = RANGE_MS[range.value as Exclude<TrendRange, 'live'>]
  if (!ms) return
  loadingRemote.value = true
  loadError.value = ''
  try {
    const now = Date.now()
    remotePoints.value = await queryHistory(
      `${props.deviceId}.${props.variable}`,
      now - ms,
      now,
      { maxPoints: 600, ...resolveAgg(ms) },
    )
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '查询失败'
  } finally {
    loadingRemote.value = false
  }
}

/** 导出当前显示的数据为 CSV */
function exportCsv() {
  const points = range.value === 'live'
    ? deviceStore.getHistory(props.deviceId, props.variable)
    : remotePoints.value
  downloadCsv(
    `${props.deviceId}-${props.variable}-历史.csv`,
    historyToCsv(points),
  )
}

function stopRemoteTimer() {
  if (remoteTimer !== null) {
    clearInterval(remoteTimer)
    remoteTimer = null
  }
}

watch([visible, range, () => props.deviceId, () => props.variable], ([open, r]) => {
  stopRemoteTimer()
  if (!open || r === 'live') return
  void loadRemote()
  // 历史区间每 30 秒重拉一次，追加最新数据
  remoteTimer = window.setInterval(() => void loadRemote(), 30_000)
})

const stats = computed(() => {
  const pts = points.value
  if (!pts.length) return { min: 0, max: 1, range: 1, base: 0 }
  let min = Infinity, max = -Infinity
  for (const p of pts) {
    if (p.v < min) min = p.v
    if (p.v > max) max = p.v
  }
  // 值域为 0 时兜底展宽，避免除零导致所有点堆在一条线上
  const range = max - min || Math.abs(max) || 1
  return { min, max, range, base: max - range }
})

/** 时间跨度（X 轴按真实时间而非数组下标映射，采样不均时才不会失真） */
const timeRange = computed(() => {
  const pts = points.value
  if (pts.length < 2) return { t0: pts[0]?.t ?? 0, span: 1 }
  const span = pts[pts.length - 1].t - pts[0].t
  return { t0: pts[0].t, span: span || 1 }
})

function round(v: number): string {
  return String(Math.round(v * 100) / 100)
}

const minValue = computed(() => round(stats.value.min))
const maxValue = computed(() => round(stats.value.max))

const lastValue = computed(() => {
  const pts = points.value
  if (!pts.length) return '-'
  return round(pts[pts.length - 1].v)
})

const yLabels = computed(() => {
  const { max, range } = stats.value
  return Array.from({ length: 6 }, (_, i) => round(max - (range / 5) * i))
})

const xLabels = computed(() => {
  const pts = points.value
  if (pts.length < 2) return []
  const { t0, span } = timeRange.value
  return [0, 0.25, 0.5, 0.75, 1].map(r => ({
    x: padL + r * innerW,
    text: formatClock(t0 + span * r),
  }))
})

const svgPoints = computed(() => {
  const pts = points.value
  if (pts.length < 2) return ''
  const { range, base } = stats.value
  const { t0, span } = timeRange.value

  return pts
    .map(p => {
      const x = padL + ((p.t - t0) / span) * innerW
      const y = padT + innerH - ((p.v - base) / range) * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const lastPt = computed(() => {
  const pts = points.value
  if (!pts.length) return { x: padL, y: padT + innerH }
  const { range, base } = stats.value
  const { t0, span } = timeRange.value
  const last = pts[pts.length - 1]
  return {
    x: padL + (pts.length > 1 ? ((last.t - t0) / span) * innerW : 0),
    y: padT + innerH - ((last.v - base) / range) * innerH,
  }
})

function formatClock(t: number): string {
  return new Date(t).toLocaleTimeString('zh-CN', { hour12: false })
}

function startTimer() {
  stopTimer()
  timer = window.setInterval(() => { tick.value++ }, 1000)
}

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

watch(() => props.modelValue, (val) => {
  if (val) startTimer()
  else stopTimer()
})

onUnmounted(() => {
  stopTimer()
  stopRemoteTimer()
})
</script>

<style src="./trend-chart.scss" scoped lang="scss"></style>
