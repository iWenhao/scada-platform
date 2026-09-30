<template>
  <v-layer>
    <template v-for="element in elements" :key="element.id">
      <v-group
        :config="{
          id: element.id,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          rotation: element.rotation,
          visible: isLayerVisible(element.layerId),
          draggable: !isLayerLocked(element.layerId) && !element.locked && activeTool !== 'connect',
          dragBoundFunc: snapToGrid ? gridSnapFunc : undefined,
        }"
        @click="emit('element-click', element, $event)"
        @contextmenu="emit('element-contextmenu', element, $event)"
        @mouseenter="emit('hover', element.id)"
        @mouseleave="emit('hover', null)"
        @dragstart="emit('drag-start', element, $event)"
        @dragmove="emit('drag-move', element, $event)"
        @dragend="emit('drag-end', element, $event)"
        @transformend="emit('transform-end', element.id)"
      >
        <!-- 命中层（不可见，保证可选中/拖拽/缩放/右键） -->
        <v-rect
          :config="hitAreaConfig(element)"
          @click="emit('element-click', element, $event)"
          @contextmenu="emit('element-contextmenu', element, $event)"
        />

        <!-- 2.5D 体积 -->
        <v-ellipse
          v-if="depthShadowConfig(element, viewMode25d)"
          :config="depthShadowConfig(element, viewMode25d)!"
        />
        <v-rect
          v-if="depthSideConfig(element, getElementColor(element), viewMode25d)"
          :config="depthSideConfig(element, getElementColor(element), viewMode25d)!"
        />

        <!-- 阴影 + 主体卡片（纯图形模式下不渲染，只留组件自身图形） -->
        <v-rect v-if="!isPureShapeMode(element)" :config="bodyShadowConfig(element)" />
        <v-rect
          v-if="!isPureShapeMode(element) || !hasIntrinsicGraphic(element)"
          :config="bodyFillConfig(element, getElementColor(element), selectedIds.includes(element.id))"
        />
        <!-- 顶部高光与数值胶囊位置重合，数值隐藏时一并隐藏，避免残留浅色胶囊底 -->
        <v-rect v-if="isValueShown(element)" :config="bodyTopGlowConfig(element)" />

        <v-rect
          v-if="depthHighlightConfig(element, viewMode25d)"
          :config="depthHighlightConfig(element, viewMode25d)!"
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

        <!-- 名称标签条（showName 开关，旧数据回退 showLabel） -->
        <template v-if="isNameShown(element)">
          <v-rect :config="labelBarConfig(element, getLabelHeight(element))" />
          <v-text :config="labelTextConfig(element, getLabelHeight(element))" />
        </template>

        <!-- 数值显示图元 -->
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
        <!-- 实时值胶囊 -->
        <template v-else-if="isValueShown(element) && getElementValueText(element)">
          <v-rect :config="valuePillConfig(element, getElementValueText(element))" />
          <v-text :config="valueTextConfig(element, getElementValueText(element))" />
        </template>

        <!-- 连线端口 -->
        <template v-if="activeTool === 'connect'">
          <v-circle
            v-for="port in getElementPorts(element)"
            :key="port.id"
            :config="{
              x: port.x,
              y: port.y,
              radius: 6,
              fill: '#1a1a2e',
              stroke: '#00d4aa',
              strokeWidth: 2,
            }"
            @mousedown="emit('port-down', element.id, port.position)"
          />
        </template>
      </v-group>
    </template>
  </v-layer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/scada'
import { depthShadowConfig, depthSideConfig, depthHighlightConfig } from '@/core/canvas/depthLayers'
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

type Visuals = {
  getElementColor: (e: ComponentInstance) => string
  getLabelHeight: (e: ComponentInstance) => number
  getIconImageConfig: (e: ComponentInstance) => any
  getUserImageConfig: (e: ComponentInstance) => any
  isDisplayElement: (e: ComponentInstance) => boolean
  getDisplayValueText: (e: ComponentInstance) => string
  getElementValueText: (e: ComponentInstance) => string
  getElementPorts: (e: ComponentInstance) => Array<{ id: string; x: number; y: number; position: string }>
  isLayerVisible: (id: string) => boolean
  isLayerLocked: (id: string) => boolean
}

const props = defineProps<{
  elements: ComponentInstance[]
  selectedIds: string[]
  activeTool: string
  snapToGrid: boolean
  viewMode: string
  visuals: Visuals
  pipeFlowConfig: (e: ComponentInstance) => any
  gridSnapFunc: any
}>()

const emit = defineEmits<{
  'element-click': [e: ComponentInstance, evt: any]
  'element-contextmenu': [e: ComponentInstance, evt: any]
  hover: [id: string | null]
  'drag-start': [e: ComponentInstance, evt: any]
  'drag-move': [e: ComponentInstance, evt: any]
  'drag-end': [e: ComponentInstance, evt: any]
  'transform-end': [id: string]
  'port-down': [id: string, port: any]
}>()

const viewMode25d = computed(() => props.viewMode === '25d')

const {
  getElementColor,
  getLabelHeight,
  getIconImageConfig,
  getUserImageConfig,
  isDisplayElement,
  getDisplayValueText,
  getElementValueText,
  getElementPorts,
  isLayerVisible,
  isLayerLocked,
} = props.visuals

void props.gridSnapFunc
</script>
