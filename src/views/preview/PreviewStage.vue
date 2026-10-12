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
            <!-- 设备图形：立体感由图标内部的面基图元 + 光照承担（与编辑器一致） -->
            <v-image
              v-if="getIconImageConfig(element)"
              :config="getIconImageConfig(element)"
            />
            <v-image
              v-if="getUserImageConfig(element)"
              :config="getUserImageConfig(element)"
            />
            <!-- 运转动效：可动件独立渲染，与编辑器渲染保持一致 -->
            <ElementMotion
              v-if="getElementMotion(element)"
              :element="element"
              :layout="getElementLayout(element)"
              :color="getIconStrokeColor(element)"
              :view-mode="projectStore.viewMode"
              :state="getElementMotion(element)"
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
            <!-- 名称：素文本（无底条，与编辑器一致） -->
            <v-text
              v-if="getElementLayout(element).showName"
              :config="labelTextConfig(element, getElementLayout(element))"
            />
            <!-- 数值显示图元与实时值（与编辑器共用 elementChrome 配置，口径一致） -->
            <v-text
              v-if="isDisplayElement(element) && getElementLayout(element).showValue"
              :config="
                displayTextConfig(
                  element,
                  getElementLayout(element),
                  getDisplayValueText(element),
                  getElementColor(element),
                )
              "
            />
            <v-text
              v-else-if="getElementLayout(element).showValue && getElementValueText(element)"
              :config="valueTextConfig(element, getElementLayout(element), getElementValueText(element))"
            />
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
import ElementMotion from '@/core/canvas/ElementMotion.vue'
import {
  hitAreaConfig,
  labelTextConfig,
  valueTextConfig,
  displayTextConfig,
} from '@/core/canvas/elementChrome'
import { useProjectStore } from '@/stores/projectStore'
import ConnectionLine from '@/core/connection/ConnectionLine.vue'
import ChartOverlay from '@/core/canvas/ChartOverlay.vue'
import type { ComponentInstance } from '@/types/scada'

const emit = defineEmits<{
  'element-click': [element: ComponentInstance]
}>()

const canvasStore = useCanvasStore()
const projectStore = useProjectStore()
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
  getIconStrokeColor,
  getElementValueText,
  isDisplayElement,
  getDisplayValueText,
  getElementLayout,
  getLabelHeight,
  getIconImageConfig,
  getUserImageConfig,
  getElementMotion,
  isPipeFlowing,
  isLayerVisible,
} = useElementVisuals({
  deviceStore,
  layerStore,
  // 渲染风格由编辑器确定的工程级设置驱动（只读跟随），运行端不提供切换入口
  viewMode: () => projectStore.viewMode,
})

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
