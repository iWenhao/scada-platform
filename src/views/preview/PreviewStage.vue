<template>
  <div class="preview-canvas" :style="canvasGridStyle">
    <v-stage :config="stageConfig">
      <v-layer>
        <ConnectionLine
          v-for="conn in connectionStore.connections"
          :key="conn.id"
          :connection="conn"
        />
      </v-layer>

      <v-layer>
        <template v-for="element in canvasStore.elements" :key="element.id">
          <v-group
            :config="{
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              rotation: element.rotation,
              visible: isLayerVisible(element.layerId),
            }"
            @click="emit('element-click', element)"
          >
            <v-ellipse
              v-if="depthShadowConfig(element, uiStore.viewMode === '25d')"
              :config="depthShadowConfig(element, uiStore.viewMode === '25d')!"
            />
            <v-rect
              v-if="depthSideConfig(element, getElementColor(element), uiStore.viewMode === '25d')"
              :config="depthSideConfig(element, getElementColor(element), uiStore.viewMode === '25d')!"
            />
            <v-rect :config="bodyShadowConfig(element)" />
            <v-rect :config="bodyFillConfig(element, getElementColor(element), false)" />
            <v-rect :config="bodyTopGlowConfig(element)" />
            <v-rect
              v-if="depthHighlightConfig(element, uiStore.viewMode === '25d')"
              :config="depthHighlightConfig(element, uiStore.viewMode === '25d')!"
            />
            <v-image
              v-if="getIconImageConfig(element)"
              :config="getIconImageConfig(element)"
            />
            <v-image
              v-if="getUserImageConfig(element)"
              :config="getUserImageConfig(element)"
            />
            <v-line
              v-if="element.type === 'pipe'"
              :config="pipeFlowConfig(element)"
            />
            <v-rect :config="labelBarConfig(element, getLabelHeight(element))" />
            <v-text :config="labelTextConfig(element, getLabelHeight(element))" />
            <v-text
              :config="{
                text: element.name,
                fontSize: 11,
                fill: '#e0e0e0',
                width: element.width,
                align: 'center',
                y: element.height - getLabelHeight(element) + 2,
              }"
            />
            <v-text
              v-if="isDisplayElement(element)"
              :config="{
                text: getDisplayValueText(element),
                fontSize: 18,
                fontStyle: 'bold',
                fill: '#8fe6d3',
                width: element.width,
                align: 'center',
                y: (element.height - getLabelHeight(element)) / 2 - 9,
              }"
            />
            <v-text
              v-else-if="getElementValueText(element)"
              :config="{
                text: getElementValueText(element),
                fontSize: 9,
                fill: '#8fe6d3',
                width: element.width,
                align: 'center',
                y: element.height - 11,
              }"
            />
          </v-group>
        </template>
      </v-layer>
    </v-stage>

    <!-- 图表 overlay：与编辑器一致的 ECharts 实体渲染 -->
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementVisuals } from '@/core/canvas/useElementVisuals'
import { usePipeFlow } from '@/core/canvas/pipeFlow'
import {
  bodyShadowConfig,
  bodyFillConfig,
  bodyTopGlowConfig,
  labelBarConfig,
  labelTextConfig,
} from '@/core/canvas/elementChrome'
import { depthShadowConfig, depthSideConfig, depthHighlightConfig } from '@/core/canvas/depthLayers'
import { useUiStore } from '@/stores/uiStore'
import ConnectionLine from '@/core/connection/ConnectionLine.vue'
import ChartElement from '@/industrial/chart/ChartElement.vue'
import type { ComponentInstance } from '@/types/scada'

const emit = defineEmits<{
  'element-click': [element: ComponentInstance]
}>()

const canvasStore = useCanvasStore()
const uiStore = useUiStore()
const connectionStore = useConnectionStore()
const deviceStore = useDeviceStore()
const layerStore = useLayerStore()

/** 画布配置 → CSS 网格变量（与编辑器共用） */
const canvasGridStyle = computed(() => {
  const cfg = canvasStore.canvasConfig
  const style: Record<string, string> = {}
  if (cfg.gridColor) style['--ws-grid-color'] = cfg.gridColor
  if (cfg.gridSize) style['--ws-grid-size'] = `${cfg.gridSize}px`
  if (cfg.backgroundColor) style['background-color'] = cfg.backgroundColor
  return style
})

const {
  getElementColor,
  getElementValueText,
  isDisplayElement,
  getDisplayValueText,
  getLabelHeight,
  getIconImageConfig,
  getUserImageConfig,
  isLayerVisible,
} = useElementVisuals({ deviceStore, layerStore })

const { pipeFlowConfig } = usePipeFlow()

const CHART_TYPES = ['chart-trend', 'chart-bar', 'chart-pie']

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

const stageConfig = computed(() => ({
  width: window.innerWidth,
  height: window.innerHeight - 60,
  scaleX: canvasStore.zoom,
  scaleY: canvasStore.zoom,
  x: canvasStore.offset.x,
  y: canvasStore.offset.y,
}))
</script>

<style scoped lang="scss">
.preview-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg-canvas);

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

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(var(--ws-grid-color, var(--grid-color)) 1px, transparent 1px),
      linear-gradient(90deg, var(--ws-grid-color, var(--grid-color)) 1px, transparent 1px);
    background-size: var(--ws-grid-size, 20px) var(--ws-grid-size, 20px);
    opacity: 0.5;
    pointer-events: none;
  }
}
</style>
