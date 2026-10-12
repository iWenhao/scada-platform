<template>
  <!--
    HTML overlay：需要 DOM 才能呈现的元素按画布变换叠在 Konva 之上。
    分两路——ECharts 那批（chart-trend/bar/pie/radar）进 ChartElement，
    其余挂件（进度条/报表/网格图/表格/日期/时间/视频/网页/超文本）进 WidgetElement。
    容器统一 pointer-events:none，拖拽/选中/缩放仍由 Konva 的命中层承担；
    只有挂件内部主动开启交互（如表格搜索框）才会吃到事件。
  -->
  <div class="html-overlay">
    <div
      v-for="element in chartElements"
      :key="element.id"
      class="html-slot"
      :style="slotStyle(element)"
    >
      <ChartElement :element="element" />
    </div>
    <div
      v-for="element in widgetElements"
      :key="element.id"
      class="html-slot"
      :style="slotStyle(element)"
    >
      <WidgetElement :element="element" :zoom="canvasStore.zoom" :readonly="readonly" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChartElement from '@/industrial/chart/ChartElement.vue'
import WidgetElement from '@/industrial/widget/WidgetElement.vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementVisuals } from '@/core/canvas/useElementVisuals'
// overlay 类型清单的唯一来源：Konva 侧的 useElementVisuals 也用它判断是否画图标，
// 两边必须同一份，否则新增 DOM 组件时会出现「图标重影」或「元素不显示」
import { CHART_TYPES, WIDGET_TYPES } from '@/core/canvas/overlayTypes'
import type { ComponentInstance } from '@/types/scada'

defineProps<{
  /** 运行端（预览页）为 true：挂件内部禁用输入类交互 */
  readonly?: boolean
}>()

const canvasStore = useCanvasStore()
const deviceStore = useDeviceStore()
const layerStore = useLayerStore()

const { isLayerVisible } = useElementVisuals({ deviceStore, layerStore })

const chartElements = computed(() =>
  canvasStore.elements.filter(el => CHART_TYPES.includes(el.type)),
)

const widgetElements = computed(() =>
  canvasStore.elements.filter(el => WIDGET_TYPES.includes(el.type)),
)

function slotStyle(element: ComponentInstance) {
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
.html-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.html-slot {
  position: absolute;
  pointer-events: none;
  overflow: hidden;
}
</style>
