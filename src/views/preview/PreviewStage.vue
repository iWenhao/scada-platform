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
            <v-rect :config="hitAreaConfig(element)" />
            <v-ellipse
              v-if="depthShadowConfig(element, uiStore.viewMode === '25d')"
              :config="depthShadowConfig(element, uiStore.viewMode === '25d')!"
            />
            <v-rect
              v-if="depthSideConfig(element, getElementColor(element), uiStore.viewMode === '25d')"
              :config="depthSideConfig(element, getElementColor(element), uiStore.viewMode === '25d')!"
            />
            <!-- 阴影 + 主体卡片（纯图形模式下不渲染，与编辑器一致） -->
            <v-rect v-if="!isPureShapeMode(element)" :config="bodyShadowConfig(element)" />
            <v-rect
              v-if="!isPureShapeMode(element) || !hasIntrinsicGraphic(element)"
              :config="bodyFillConfig(element, getElementColor(element), false)"
            />
            <!-- 顶部高光与数值胶囊位置重合，数值隐藏时一并隐藏（与编辑器一致） -->
            <v-rect v-if="isValueShown(element)" :config="bodyTopGlowConfig(element)" />
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
            <!-- 管道：原生管身图形 + 流动虚线（与编辑器渲染保持一致） -->
            <template v-if="element.type === 'pipe'">
              <v-line
                v-for="(cfg, i) in pipeBodyConfigs(element, getElementColor(element), getLabelHeight(element))"
                :key="`pipe-body-${i}`"
                :config="cfg"
              />
              <PipeFlowLine
                :element="element"
                :color="getElementColor(element)"
                :label-height="getLabelHeight(element)"
                :flowing="isPipeFlowing(element)"
              />
            </template>
            <!-- 名称标签条（showName 开关，与编辑器渲染保持一致） -->
            <template v-if="isNameShown(element)">
              <v-rect :config="labelBarConfig(element, getLabelHeight(element))" />
              <v-text :config="labelTextConfig(element, getLabelHeight(element))" />
            </template>
            <!-- 数值显示图元与实时值胶囊（与编辑器共用 elementChrome 配置，口径一致） -->
            <v-text
              v-if="isDisplayElement(element) && isValueShown(element)"
              :config="{
                text: getDisplayValueText(element),
                fontSize: 18,
                fontStyle: 'bold',
                fill: '#8fe6d3',
                width: element.width,
                align: 'center',
                y: (element.height - getLabelHeight(element)) / 2 - 9,
                listening: false,
              }"
            />
            <template v-else-if="isValueShown(element) && getElementValueText(element)">
              <v-rect :config="valuePillConfig(element, getElementValueText(element))" />
              <v-text :config="valueTextConfig(element, getElementValueText(element))" />
            </template>
          </v-group>
        </template>
      </v-layer>
    </v-stage>

    <!-- 图表 overlay：与编辑器共用同一组件 -->
    <ChartOverlay />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementVisuals } from '@/core/canvas/useElementVisuals'
import { pipeBodyConfigs } from '@/core/canvas/pipeFlow'
import PipeFlowLine from '@/core/canvas/PipeFlowLine.vue'
import {
  hitAreaConfig,
  bodyShadowConfig,
  bodyFillConfig,
  bodyTopGlowConfig,
  labelBarConfig,
  labelTextConfig,
  valuePillConfig,
  valueTextConfig,
  isNameShown,
  isValueShown,
  isPureShapeMode,
  hasIntrinsicGraphic,
} from '@/core/canvas/elementChrome'
import { depthShadowConfig, depthSideConfig, depthHighlightConfig } from '@/core/canvas/depthLayers'
import { useUiStore } from '@/stores/uiStore'
import ConnectionLine from '@/core/connection/ConnectionLine.vue'
import ChartOverlay from '@/core/canvas/ChartOverlay.vue'
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
  isPipeFlowing,
  isLayerVisible,
} = useElementVisuals({ deviceStore, layerStore })

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
