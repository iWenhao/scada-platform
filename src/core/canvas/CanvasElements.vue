<template>
  <v-layer>
    <template v-for="item in renderItems" :key="item.element.id">
      <v-group :config="item.group">
        <!-- 命中层（不可见，保证可选中/拖拽/缩放/右键） -->
        <v-rect
          :config="item.hit"
          @click="emit('element-click', item.element, $event)"
          @contextmenu="emit('element-contextmenu', item.element, $event)"
        />

        <!-- 设备图形：立体感由图标内部的面基图元 + 光照承担（faceLighting），
             不在元素背后铺背景色块 -->
        <v-image
          v-if="item.icon"
          :config="item.icon"
        />
        <v-image
          v-if="item.userImage"
          :config="item.userImage"
        />
        <!-- 运转动效：可动件独立渲染（整张位图无法局部旋转），静止设备不订阅帧回调 -->
        <ElementMotion
          v-if="item.motion"
          :element="item.element"
          :layout="item.layout"
          :color="item.stroke"
          :view-mode="viewMode"
          :state="item.motion"
        />
        <!-- 管道：原生管身图形 + 流动虚线（图标方案画不出任意长度的管段） -->
        <template v-if="item.element.type === 'pipe'">
          <v-line
            v-for="(cfg, i) in item.pipeBodies"
            :key="`pipe-body-${i}`"
            :config="cfg"
          />
          <PipeFlowLine
            :element="item.element"
            :color="item.color"
            :label-height="item.labelHeight"
            :flowing="item.flowing"
          />
        </template>

        <!-- 操作按钮：原生圆角矩形 + 可配置指令文字（图标是整张位图，画不出文字） -->
        <CommandButtonNode
          v-if="item.button"
          :element="item.element"
          :layout="item.layout"
          :color="item.color"
        />

        <!-- 纯文本图元：内容/字号/加粗/对齐由属性面板配置，颜色随元素状态 -->
        <v-text
          v-if="item.element.type === 'text'"
          :config="plainTextConfig(item.element, item.text, item.color)"
        />

        <!-- 名称：素文本（无底条） -->
        <v-text
          v-if="item.layout.showName"
          :config="labelTextConfig(item.element, item.layout)"
        />

        <!-- 数值显示图元：数值即图形，居中大字 -->
        <v-text
          v-if="item.display && item.layout.showValue"
          :config="
            displayTextConfig(
              item.element,
              item.layout,
              item.displayText,
              item.color,
            )
          "
        />
        <!-- 实时值：素文本（无胶囊底色） -->
        <v-text
          v-else-if="item.layout.showValue && item.valueText"
          :config="valueTextConfig(item.element, item.layout, item.valueText)"
        />

        <!-- 连线端口 -->
        <template v-if="activeTool === 'connect'">
          <v-circle
            v-for="port in item.ports"
            :key="port.id"
            :config="{
              x: port.x,
              y: port.y,
              radius: 6,
              fill: '#1a1a2e',
              stroke: '#00d4aa',
              strokeWidth: 2,
            }"
            @mousedown="emit('port-down', item.element.id, port.position)"
          />
        </template>
      </v-group>
    </template>
  </v-layer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
import CommandButtonNode from '@/core/canvas/CommandButtonNode.vue'

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
} = props.visuals

/** 纯文本图元的显示内容：属性面板可改，缺省给个占位避免拖进来是空白 */
function textContent(element: ComponentInstance): string {
  const raw = element.properties?.text
  const text = typeof raw === 'string' ? raw : String(raw ?? '')
  return text.length > 0 ? text : '文本'
}

/**
 * 分组节点的完整配置（含事件监听）。
 *
 * ⚠️ 事件必须写进 config，不能写成模板上的 `@click`：vue-konva 的容器节点
 * （Group / Layer / Label / FastLayer）返回的是插槽片段，根节点不是元素，
 * 模板上的监听无法被"自动继承"，Vue dev 下会给每个元素刷一条
 * `Extraneous non-emits event listeners` 警告。applyNodeProps 对 config 里
 * `on` 前缀的键做同样的处理（`onClick` → `node.on('click')`），功能一致。
 */
function groupConfig(element: ComponentInstance) {
  return {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    draggable: !element.locked && props.activeTool !== 'connect',
    dragBoundFunc: props.snapToGrid ? props.gridSnapFunc : undefined,
    onClick: (e: any) => emit('element-click', element, e),
    onContextmenu: (e: any) => emit('element-contextmenu', element, e),
    onMouseenter: () => emit('hover', element.id),
    onMouseleave: () => emit('hover', null),
    onDragstart: (e: any) => emit('drag-start', element, e),
    onDragmove: (e: any) => emit('drag-move', element, e),
    onDragend: (e: any) => emit('drag-end', element, e),
    onTransformend: () => emit('transform-end', element.id),
  }
}

/**
 * 每个元素的渲染数据预计算。
 *
 * 原来模板里同一项要重复求值多次——`getElementLayout` 一处就出现 7 次、
 * `getElementColor` 4 次、`getIconImageConfig` / `getElementMotion` 各 2 次，
 * 而 Konva 每帧重绘都会重跑整个渲染函数，元素一多就是几十倍的重复调用。
 * 这里按元素各算一次，模板直接读字段。
 *
 * 条件分支刻意保持与模板一致：管道配置只对 pipe 算、端口只在连线工具下算，
 * 否则「省掉重复调用」会变成「给所有元素多算一堆用不上的东西」，反而更慢。
 */
const renderItems = computed(() => props.elements.map((element) => {
  const layout = getElementLayout(element)
  const display = isDisplayElement(element)
  const item = {
    element,
    group: groupConfig(element),
    hit: hitAreaConfig(element),
    icon: getIconImageConfig(element),
    userImage: getUserImageConfig(element),
    motion: getElementMotion(element),
    layout,
    display,
    stroke: '',
    color: '',
    labelHeight: 0,
    text: '',
    valueText: '',
    displayText: '',
    button: false,
    pipeBodies: [] as any[],
    flowing: false,
    ports: [] as Array<{ id: string; x: number; y: number; position: string }>,
  }

  // 运转动效：可动件才需要描边色
  if (item.motion) item.stroke = getIconStrokeColor(element)

  if (element.type === 'pipe') {
    item.color = getElementColor(element)
    item.labelHeight = getLabelHeight(element)
    item.pipeBodies = pipeBodyConfigs(element, item.color, item.labelHeight, props.viewMode)
    item.flowing = isPipeFlowing(element)
  }

  if (element.type === 'text') {
    if (!item.color) item.color = getElementColor(element)
    item.text = textContent(element)
  }

  if (element.type === 'command-button') {
    if (!item.color) item.color = getElementColor(element)
    item.button = true
  }

  // 数值显示图元：数值即图形；其余元素走素文本实时值
  if (display && layout.showValue) {
    if (!item.color) item.color = getElementColor(element)
    item.displayText = getDisplayValueText(element)
  } else if (layout.showValue) {
    item.valueText = getElementValueText(element)
  }

  if (props.activeTool === 'connect') {
    item.ports = getElementPorts(element)
  }

  return item
}))
</script>
