<template>
  <div ref="containerRef" v-show="!emptyKind" class="chart-element"></div>
  <!--
    空态占位：趋势/柱状/雷达「一条绑定一个系列」，没绑变量时 ECharts 那边
    只剩坐标轴甚至全空，而 Konva 侧不画 overlay 类型图标、名称条也被关掉，
    不占位的话元素在画布上完全隐形。饼图原本有占位环兜底，统一改为 DOM 空态。
  -->
  <div v-if="emptyKind" class="chart-empty" :style="emptyBoxStyle">
    <span :style="emptyTitleStyle">{{ emptyKind === 'unbound' ? '未绑定数据' : '暂无数据' }}</span>
    <span :style="emptyHintStyle">{{
      emptyKind === 'unbound' ? unboundHint : '已绑定变量但还没收到数据，检查数据源是否已连接'
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart, RadarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, RadarComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useDeviceStore } from '@/stores/deviceStore'
import {
  buildTrendOption,
  buildBarOption,
  buildPieOption,
  buildRadarOption,
} from './options'
import type { ComponentInstance } from '@/types/scada'

// 按需注册：只打包折线/柱状/饼/雷达四种图与网格、图例、雷达坐标系，控制产物体积
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  GridComponent,
  LegendComponent,
  RadarComponent,
  CanvasRenderer,
])

const props = defineProps<{
  element: ComponentInstance
  /** 画布缩放，空态文案/边框随之缩放（与 WidgetElement 同一套换算） */
  zoom?: number
}>()

const z = computed(() => props.zoom ?? 1)

const deviceStore = useDeviceStore()
const containerRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

/**
 * 空态判定：
 * - unbound：一条绑定都没有 → ECharts 侧 trend/bar 的 series 为空、只剩坐标轴；
 * - nodata：绑了变量但从没收到过值（数据源未连接）→ 柱高为 0、折线无点，一样看不见。
 * 「收到过 0」不算 nodata：柱子 0 高但类目名/坐标轴可见，属于正常状态。
 */
const emptyKind = computed<'unbound' | 'nodata' | null>(() => {
  const el = props.element
  const bindings = el.dataBindings ?? []
  if (bindings.length === 0) return 'unbound'
  const deviceId = el.deviceId || el.id
  if (el.type === 'chart-trend') {
    const hasPoints = bindings.some(b => deviceStore.getHistory(deviceId, b.variable).length > 0)
    return hasPoints ? null : 'nodata'
  }
  const data = deviceStore.getDeviceData(deviceId)
  const received = bindings.some(b => data[b.variable] !== undefined)
  return received ? null : 'nodata'
})

/** unbound 引导文案按图型区分（一条变量一个系列/柱/维度/扇区） */
const unboundHint = computed(
  () =>
    ({
      'chart-trend': '在「数据绑定」里添加变量，一条变量一条曲线',
      'chart-bar': '在「数据绑定」里添加变量，一条变量一根柱',
      'chart-radar': '在「数据绑定」里添加变量，一条变量一个维度',
      'chart-pie': '在「数据绑定」里添加变量，一条变量一个扇区',
    })[props.element.type] ?? '在「数据绑定」里添加变量',
)

const emptyBoxStyle = computed(() => ({
  position: 'absolute' as const,
  inset: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: `${4 * z.value}px`,
  padding: `${8 * z.value}px`,
  border: `${Math.max(1, Math.min(z.value, 1))}px dashed rgba(120,140,170,0.45)`,
  borderRadius: `${4 * z.value}px`,
  color: '#8a9bb0',
  textAlign: 'center' as const,
}))

const emptyTitleStyle = computed(() => ({
  fontSize: `${Math.max(10, 12 * z.value)}px`,
}))

const emptyHintStyle = computed(() => ({
  fontSize: `${Math.max(10, 12 * z.value * 0.85)}px`,
  lineHeight: 1.4,
  opacity: 0.75,
}))

function seriesNames(): string[] {
  return (props.element.dataBindings ?? []).map(b => b.variable)
}

function buildOption() {
  const el = props.element
  const deviceId = el.deviceId || el.id
  const bindings = el.dataBindings ?? []

  if (el.type === 'chart-trend') {
    const maxPoints = Math.min(Math.max(Number(el.properties?.historyPoints) || 60, 10), 300)
    const series = bindings.map(b => ({
      name: b.variable,
      points: deviceStore.getHistory(deviceId, b.variable),
    }))
    return buildTrendOption(series, maxPoints)
  }

  if (el.type === 'chart-bar') {
    const data = deviceStore.getDeviceData(deviceId)
    const names = seriesNames()
    return buildBarOption(
      names,
      names.map(v => Number(data[v]) || 0),
    )
  }

  if (el.type === 'chart-radar') {
    const data = deviceStore.getDeviceData(deviceId)
    const max = Number(el.properties?.radarMax) > 0 ? Number(el.properties.radarMax) : undefined
    return buildRadarOption(
      seriesNames().map(v => ({ name: v, value: Number(data[v]) || 0 })),
      max,
    )
  }

  // 饼图
  const data = deviceStore.getDeviceData(deviceId)
  return buildPieOption(seriesNames().map(v => ({ name: v, value: Number(data[v]) || 0 })))
}

function render() {
  chart?.setOption(buildOption(), { notMerge: true })
}

/** 惰性初始化：空态期间容器被 v-show 隐藏（尺寸 0），此时 init ECharts 会拿到空画布 */
function ensureChart() {
  if (chart || !containerRef.value) return
  chart = echarts.init(containerRef.value)
  render()
}

onMounted(() => {
  resizeObserver = new ResizeObserver(() => chart?.resize())
  if (containerRef.value) resizeObserver.observe(containerRef.value)
  if (!emptyKind.value) ensureChart()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})

// 数据推送与绑定配置变化时重绘；trend 依赖历史缓冲，其他依赖实时值
watch(
  () => [
    deviceStore.lastUpdateTime,
    props.element.dataBindings,
    props.element.deviceId,
    props.element.properties?.historyPoints,
  ],
  render,
)

// 空态 → 有数据时容器恢复可见，等 DOM 更新后再初始化 ECharts
watch(emptyKind, kind => {
  if (!kind) nextTick(ensureChart)
})
</script>

<style scoped lang="scss">
.chart-element {
  width: 100%;
  height: 100%;
}
</style>
