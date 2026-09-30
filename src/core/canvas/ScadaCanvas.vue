<template>
  <div
    class="scada-canvas"
    @dragover.prevent
    @drop="onDrop"
  >
    <div class="canvas-frame">
      <div v-if="uiStore.showRuler" class="ruler-row">
        <div class="ruler-corner"></div>
        <CanvasRuler
          orientation="horizontal"
          :canvas-length="canvasStore.canvasConfig.width"
          :zoom="canvasStore.zoom"
          :offset="canvasStore.offset.x"
          :viewport="stageSize.width"
        />
      </div>

      <div class="canvas-row">
        <CanvasRuler
          v-if="uiStore.showRuler"
          orientation="vertical"
          :canvas-length="canvasStore.canvasConfig.height"
          :zoom="canvasStore.zoom"
          :offset="canvasStore.offset.y"
          :viewport="stageSize.height"
        />

        <div ref="stageContainerRef" class="stage-container">
          <v-stage
            ref="stageRef"
            :config="stageConfig"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @wheel="onWheel"
          >
      <!-- 网格图层 -->
      <v-layer>
        <v-group :config="gridGroupConfig">
          <!-- 底色（必须在网格之下） -->
          <v-rect :config="canvasBackgroundConfig" />
          <!-- 小网格 -->
          <template v-if="canvasStore.canvasConfig.showGrid">
            <v-line
              v-for="line in smallGridLines"
              :key="line.id"
              :config="line.config"
            />
            <!-- 大网格 -->
            <v-line
              v-for="line in largeGridLines"
              :key="line.id"
              :config="line.config"
            />
          </template>

          <!-- 画布边界 -->
          <v-rect :config="canvasBorderConfig" />
        </v-group>
      </v-layer>

      <!-- 连线图层 -->
      <v-layer>
        <ConnectionLine
          v-for="conn in connectionStore.connections"
          :key="conn.id"
          :connection="conn"
          :selected="conn.id === connectionStore.selectedConnectionId"
          @click="selectConnection(conn.id)"
        />

        <!-- 正在绘制的连线 -->
        <v-line
          v-if="connectionStore.drawingConnection"
          :config="drawingLineConfig"
        />
      </v-layer>

      <!-- 组件图层（拆至 CanvasElements） -->
      <CanvasElements
        :elements="canvasStore.elements"
        :selected-ids="canvasStore.selectedIds"
        :active-tool="uiStore.activeTool"
        :snap-to-grid="!!canvasStore.canvasConfig.snapToGrid"
        :view-mode="uiStore.viewMode"
        :visuals="visuals"
        :pipe-flow-config="pipeFlowConfig"
        :grid-snap-func="gridSnapFunc"
        @element-click="onElementClick"
        @element-contextmenu="onElementContextMenu"
        @hover="setHovered"
        @drag-start="onDragStart"
        @drag-move="onDragMove"
        @drag-end="onDragEnd"
        @transform-end="onTransformEnd"
        @port-down="beginConnection"
      />

      <!-- 选中变换器与对齐参考线 -->
      <v-layer>
        <v-transformer
          v-if="canvasStore.selectedIds.length"
          ref="transformerRef"
          :config="transformerConfig"
        />
      </v-layer>
      <v-layer :config="{ listening: false }">
        <v-rect
          v-if="selectionRect"
          :config="{
            ...selectionRect,
            fill: 'rgba(0, 212, 170, 0.08)',
            stroke: '#00d4aa',
            strokeWidth: 1,
            dash: [4, 4],
          }"
        />
        <v-line
          v-for="(guide, index) in alignGuides"
          :key="index"
          :config="{
            points: guide,
            stroke: '#ff4bd8',
            strokeWidth: 1,
            dash: [4, 4],
            listening: false,
          }"
        />
      </v-layer>
    </v-stage>

      <!-- 空画布引导 -->
      <div
        v-if="!canvasStore.elements.length"
        class="empty-hint"
      >
        <div class="hint-icon">＋</div>
        <div class="hint-title">画布还是空的</div>
        <div class="hint-sub">从左侧组件库拖入设备，或导入示例工程快速体验</div>
        <div class="hint-keys">V 选择 · L 连线 · H 平移 · Ctrl+Z 撤销</div>
      </div>

      <ChartOverlay />


          <MiniMap
            v-if="uiStore.showMinimap"
            :elements="canvasStore.elements"
            :canvas-width="canvasStore.canvasConfig.width"
            :canvas-height="canvasStore.canvasConfig.height"
            :viewport-x="canvasStore.offset.x"
            :viewport-y="canvasStore.offset.y"
            :viewport-w="stageSize.width"
            :viewport-h="stageSize.height"
            :zoom="canvasStore.zoom"
            @navigate="navigateTo"
          />

          <!-- 画布信息 -->
          <div class="canvas-info">
            <span>{{ canvasStore.canvasConfig.width }} x {{ canvasStore.canvasConfig.height }}</span>
            <span>{{ Math.round(canvasStore.zoom * 100) }}%</span>
          </div>

          <!-- 右键菜单 -->
          <ContextMenu
            :visible="ctxMenuVisible"
            :x="ctxMenuX"
            :y="ctxMenuY"
            :items="ctxMenuItems"
            @close="ctxMenuVisible = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useProjectStore } from '@/stores/projectStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useLayerStore } from '@/stores/layerStore'
import { useUiStore } from '@/stores/uiStore'
import { useHistory } from '@/core/canvas/useHistory'
import { useCanvasViewport } from '@/core/canvas/useCanvasViewport'
import { useGridLines } from '@/core/canvas/useGridLines'
import { useElementVisuals } from '@/core/canvas/useElementVisuals'
import { useElementSelection } from '@/core/canvas/useElementSelection'
import { useConnectionDraw } from '@/core/canvas/useConnectionDraw'
import { useElementDrag } from '@/core/canvas/useElementDrag'
import { usePipeFlow } from '@/core/canvas/pipeFlow'
import CanvasRuler from '@/components/layout/CanvasRuler.vue'
import MiniMap from '@/components/layout/MiniMap.vue'
import ContextMenu from '@/components/layout/ContextMenu.vue'
import ConnectionLine from '@/core/connection/ConnectionLine.vue'
import ChartOverlay from '@/core/canvas/ChartOverlay.vue'
import CanvasElements from '@/core/canvas/CanvasElements.vue'
import { useCanvasContextMenu } from '@/core/canvas/useCanvasContextMenu'
import type { ComponentInstance } from '@/types/scada'

const canvasStore = useCanvasStore()
const deviceStore = useDeviceStore()
const projectStore = useProjectStore()
const connectionStore = useConnectionStore()
const layerStore = useLayerStore()
const uiStore = useUiStore()
const { saveState } = useHistory()

const stageRef = ref()
const transformerRef = ref()
const stageContainerRef = ref<HTMLElement | null>(null)

// 组合式函数装配：视口/网格/元素渲染/框选/连线/拖拽
const viewport = useCanvasViewport({ stageContainerRef, canvasStore })
const grid = useGridLines(canvasStore)
const visuals = useElementVisuals({ deviceStore, layerStore })
const selection = useElementSelection(canvasStore)
const connectionDraw = useConnectionDraw({ stageRef, canvasStore, connectionStore })
const drag = useElementDrag({
  stageRef,
  canvasStore,
  recalcElementConnections: connectionDraw.recalcElementConnections,
  saveState,
})

const { stageSize, stageConfig, beginPan, movePan, endPan, onWheel, navigateTo } = viewport
const { gridGroupConfig, canvasBackgroundConfig, canvasBorderConfig, smallGridLines, largeGridLines } = grid

const { pipeFlowConfig } = usePipeFlow()

// ---- 图表 overlay：ECharts 实体渲染在 DOM 层，坐标跟随画布平移缩放 ----
const { selectionRect, beginRubber, moveRubber, endRubber } = selection
const { setHovered, beginConnection, trackMove, finishOnMouseUp, drawingLineConfig } = connectionDraw
const { alignGuides, gridSnapFunc, onDragStart, onDragMove, onDragEnd, onTransformEnd } = drag

// 右键菜单（复制/模板/删除/锁定）
const { ctxMenuVisible, ctxMenuX, ctxMenuY, ctxMenuItems, onElementContextMenu } =
  useCanvasContextMenu()

// 变换器配置
const transformerConfig = {
  borderStroke: '#00d4aa',
  borderStrokeWidth: 2,
  anchorStroke: '#00d4aa',
  anchorFill: '#1a1a2e',
  anchorSize: 8,
  anchorCornerRadius: 2,
  rotateEnabled: true,
  boundBoxFunc: (oldBox: any, newBox: any) =>
    newBox.width < 10 || newBox.height < 10 ? oldBox : newBox,
}

// 选中变化时把变换器绑定到目标节点（支持多选）
watch(() => canvasStore.selectedIds, async (ids) => {
  await nextTick()
  const transformer = transformerRef.value?.getNode()
  if (!transformer) return

  const stage = stageRef.value.getNode()
  const nodes = (ids ?? [])
    .map(id => stage.findOne('#' + id))
    .filter(Boolean)
  transformer.nodes(nodes)
  transformer.getLayer()?.batchDraw()
}, { deep: true })

// 鼠标按下：分发给平移 / 框选
function onMouseDown(e: any) {
  const stage = stageRef.value.getNode()
  const isMiddleButton = e.evt?.button === 1

  // 中键或平移工具：拖拽平移
  if (isMiddleButton || uiStore.activeTool === 'hand') {
    beginPan(stage)
    return
  }

  if (e.target === stage) {
    // 选择工具：空白处按下开始框选
    if (uiStore.activeTool === 'select') {
      beginRubber(stage)
      return
    }

    // 其他工具：空白点击仅清除选择
    canvasStore.clearSelection()
    connectionStore.selectConnection(null)
  }
}

// 鼠标移动：平移 → 框选 → 连线，依次分发
function onMouseMove(_e: any) {
  const stage = stageRef.value.getNode()
  if (movePan(stage)) return
  if (moveRubber(stage)) return
  trackMove()
}

// 鼠标释放
function onMouseUp(_e: any) {
  endPan()

  // 隐藏右键菜单
  ctxMenuVisible.value = false

  const ids = endRubber()
  if (ids !== null) {
    if (ids.length) {
      canvasStore.selectMany(ids)
    } else {
      // 空白单击：清除选择
      canvasStore.clearSelection()
      connectionStore.selectConnection(null)
    }
    return
  }

  finishOnMouseUp()
}

// 点击元素：Shift+点击切换选中（多选），普通点击单选；连线选中清除
function onElementClick(element: ComponentInstance, e: any) {
  connectionStore.selectConnection(null)
  if (e.evt?.shiftKey) {
    canvasStore.toggleElement(element.id)
  } else {
    canvasStore.selectElement(element.id)
  }
}

// 选择连线：清除元素选中
function selectConnection(id: string) {
  canvasStore.clearSelection()
  connectionStore.selectConnection(id)
}

// 拖放处理
function onDrop(e: DragEvent) {
  e.preventDefault()
  const dataStr = e.dataTransfer!.getData('component')
  if (!dataStr) return

  const data = JSON.parse(dataStr)
  const stage = stageRef.value.getNode()

  // 设置Konva的指针位置
  stage.setPointersPositions(e)

  // 获取相对于当前变换的指针位置
  const pointerPosition = stage.getRelativePointerPosition()

  if (!pointerPosition) {
    console.warn('无法获取指针位置')
    return
  }

  // 设备模板：带出属性/绑定/规则；普通组件走注册表默认值
  if (data.kind === 'template' && data.template) {
    const tpl = data.template
    const fromTemplate: ComponentInstance = {
      id: `el_${Date.now()}`,
      type: tpl.baseType,
      templateId: tpl.id,
      deviceId: deviceStore.suggestDeviceId(tpl.baseType),
      x: pointerPosition.x - tpl.width / 2,
      y: pointerPosition.y - tpl.height / 2,
      width: tpl.width,
      height: tpl.height,
      rotation: 0,
      name: tpl.name,
      layerId: layerStore.activeLayerId,
      properties: JSON.parse(JSON.stringify(tpl.properties || {})),
      statusRules: JSON.parse(JSON.stringify(tpl.statusRules || [])),
      dataBindings: JSON.parse(JSON.stringify(tpl.dataBindings || [])),
      locked: tpl.locked,
    }
    canvasStore.addElement(fromTemplate)
    saveState()
    return
  }

  const newElement: ComponentInstance = {
    id: `el_${Date.now()}`,
    type: data.type,
    deviceId: deviceStore.suggestDeviceId(data.type),
    x: pointerPosition.x - data.defaultWidth / 2,
    y: pointerPosition.y - data.defaultHeight / 2,
    width: data.defaultWidth,
    height: data.defaultHeight,
    rotation: 0,
    name: data.name,
    layerId: layerStore.activeLayerId,
    properties: { ...data.defaultConfig },
    statusRules: [...data.statusRules],
    dataBindings: [...data.dataBindings],
  }

  canvasStore.addElement(newElement)
  saveState()
}

// 按工程保存的数据源配置连接；切换或加载工程时自动切到对应数据源
watch(
  () => projectStore.dataSourceConfig,
  (config) => {
    deviceStore.initDataSource(config)
  },
  { immediate: true },
)
</script>

<style src="./scada-canvas.scss" scoped lang="scss"></style>
