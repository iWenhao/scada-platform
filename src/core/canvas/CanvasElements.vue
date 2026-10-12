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

        <!-- 设备图形：立体感由图标内部的面基图元 + 光照承担（faceLighting），
             不在元素背后铺背景色块 -->
        <v-image
          v-if="getIconImageConfig(element)"
          :config="getIconImageConfig(element)"
        />
        <v-image
          v-if="getUserImageConfig(element)"
          :config="getUserImageConfig(element)"
        />
        <!-- 运转动效：可动件独立渲染（整张位图无法局部旋转），静止设备不订阅帧回调 -->
        <ElementMotion
          v-if="getElementMotion(element)"
          :element="element"
          :layout="getElementLayout(element)"
          :color="getIconStrokeColor(element)"
          :view-mode="viewMode"
          :state="getElementMotion(element)"
        />
        <!-- 管道：原生管身图形 + 流动虚线（图标方案画不出任意长度的管段） -->
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

        <!-- 纯文本图元：内容/字号/加粗/对齐由属性面板配置，颜色随元素状态 -->
        <v-text
          v-if="element.type === 'text'"
          :config="plainTextConfig(element, textContent(element), getElementColor(element))"
        />

        <!-- 名称：素文本（无底条） -->
        <v-text
          v-if="getElementLayout(element).showName"
          :config="labelTextConfig(element, getElementLayout(element))"
        />

        <!-- 数值显示图元：数值即图形，居中大字 -->
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
        <!-- 实时值：素文本（无胶囊底色） -->
        <v-text
          v-else-if="getElementLayout(element).showValue && getElementValueText(element)"
          :config="valueTextConfig(element, getElementLayout(element), getElementValueText(element))"
        />

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
import type { ComponentInstance, ViewMode } from '@/types/scada'
import {
  hitAreaConfig,
  labelTextConfig,
  valueTextConfig,
  displayTextConfig,
  plainTextConfig,
} from '@/core/canvas/elementChrome'
import type { ElementLayout } from '@/core/canvas/elementLayout'
import { pipeBodyConfigs } from '@/core/canvas/pipeFlow'
import PipeFlowLine from '@/core/canvas/PipeFlowLine.vue'
import ElementMotion from '@/core/canvas/ElementMotion.vue'

type Visuals = {
  getElementColor: (e: ComponentInstance) => string
  getIconStrokeColor: (e: ComponentInstance) => string
  getElementLayout: (e: ComponentInstance) => ElementLayout
  getLabelHeight: (e: ComponentInstance) => number
  getIconImageConfig: (e: ComponentInstance) => any
  getUserImageConfig: (e: ComponentInstance) => any
  getElementMotion: (e: ComponentInstance) => { running: boolean; speed: number } | null
  isDisplayElement: (e: ComponentInstance) => boolean
  getDisplayValueText: (e: ComponentInstance) => string
  getElementValueText: (e: ComponentInstance) => string
  isPipeFlowing: (e: ComponentInstance) => boolean
  getElementPorts: (e: ComponentInstance) => Array<{ id: string; x: number; y: number; position: string }>
  isLayerVisible: (id: string) => boolean
  isLayerLocked: (id: string) => boolean
}

const props = defineProps<{
  elements: ComponentInstance[]
  selectedIds: string[]
  activeTool: string
  snapToGrid: boolean
  /** 渲染风格：只用于可动件片段与主图标保持一致（图标本身由 visuals 内部按风格产出） */
  viewMode: ViewMode
  visuals: Visuals
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

const {
  getElementColor,
  getIconStrokeColor,
  getElementLayout,
  getLabelHeight,
  getIconImageConfig,
  getUserImageConfig,
  getElementMotion,
  isDisplayElement,
  getDisplayValueText,
  getElementValueText,
  isPipeFlowing,
  getElementPorts,
  isLayerVisible,
  isLayerLocked,
} = props.visuals

/** 纯文本图元的显示内容：属性面板可改，缺省给个占位避免拖进来是空白 */
function textContent(element: ComponentInstance): string {
  const raw = element.properties?.text
  const text = typeof raw === 'string' ? raw : String(raw ?? '')
  return text.length > 0 ? text : '文本'
}

void props.gridSnapFunc
</script>
