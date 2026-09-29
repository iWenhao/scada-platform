<template>
  <!-- 图表 overlay：ECharts 需要 DOM 容器，按画布变换叠在 Konva 之上 -->
  <div class="chart-overlay">
    <div
      v-for="element in chartElements"
      :key="element.id"
      class="chart-slot"
      :style="chartSlotStyle(element)"
    >
      <ChartElement :element="element" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChartElement from '@/industrial/chart/ChartElement.vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementVisuals } from '@/core/canvas/useElementVisuals'
import type { ComponentInstance } from '@/types/scada'

const CHART_TYPES = ['chart-trend', 'chart-bar', 'chart-pie']

const canvasStore = useCanvasStore()
const deviceStore = useDeviceStore()
const layerStore = useLayerStore()

const { isLayerVisible } = useElementVisuals({ deviceStore, layerStore })

const chartElements = computed(() =>
  canvasStore.elements.filter(el => CHART_TYPES.includes(el.type)),
)

function chartSlotStyle(element: ComponentInstance) {
  const { zoom, offset } = canvasStore
  return {
    left: `${element.x * zoom + offset.x}px`,
    top: `${element.y * zoom + offset.y}px`,
    width: `${element.width * zoom}px`,
    height: `${element.height * zoom}px`,
    visibility: isLayerVisible(element.layerId) ? ('visible' as const) : ('hidden' as const),
  }
}
</script>

<style scoped>
.chart-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.chart-slot {
  position: absolute;
  pointer-events: none;
}
</style>
