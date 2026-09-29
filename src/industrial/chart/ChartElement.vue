<template>
  <div ref="containerRef" class="chart-element"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useDeviceStore } from '@/stores/deviceStore'
import { buildTrendOption, buildBarOption, buildPieOption } from './options'
import type { ComponentInstance } from '@/types/scada'

// 按需注册：只打包折线/柱状/饼三种图与网格、图例，控制产物体积
echarts.use([LineChart, BarChart, PieChart, GridComponent, LegendComponent, CanvasRenderer])

const props = defineProps<{
  element: ComponentInstance
}>()

const deviceStore = useDeviceStore()
const containerRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

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

  // 饼图
  const data = deviceStore.getDeviceData(deviceId)
  return buildPieOption(seriesNames().map(v => ({ name: v, value: Number(data[v]) || 0 })))
}

function render() {
  chart?.setOption(buildOption(), { notMerge: true })
}

onMounted(() => {
  if (!containerRef.value) return
  chart = echarts.init(containerRef.value)
  render()

  // 画布缩放/元素变换改变容器尺寸时同步重排
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(containerRef.value)
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
</script>

<style scoped lang="scss">
.chart-element {
  width: 100%;
  height: 100%;
}
</style>
