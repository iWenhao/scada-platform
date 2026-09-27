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
      
      <!-- 组件图层 -->
      <v-layer>
        <template v-for="element in canvasStore.elements" :key="element.id">
          <v-group
            :config="{
              id: element.id,
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              rotation: element.rotation,
              visible: isLayerVisible(element.layerId),
              // 连线模式下禁用组件拖拽，避免端口拖拽被组件拖动劫持
              draggable: !isLayerLocked(element.layerId) && uiStore.activeTool !== 'connect',
              dragBoundFunc: canvasStore.canvasConfig.snapToGrid ? gridSnapFunc : undefined,
            }"
            @click="onElementClick(element, $event)"
            @mouseenter="hoveredElementId = element.id"
            @mouseleave="hoveredElementId = null"
            @dragstart="onDragStart(element, $event)"
            @dragmove="onDragMove(element, $event)"
            @dragend="onDragEnd(element, $event)"
            @transformend="onTransformEnd(element.id)"
          >
            <!-- 组件主体 -->
            <v-rect
              :config="{
                width: element.width,
                height: element.height,
                fill: getElementColor(element),
                stroke: canvasStore.selectedIds.includes(element.id) ? '#00d4aa' : '#444',
                strokeWidth: canvasStore.selectedIds.includes(element.id) ? 2 : 1,
                cornerRadius: 4,
              }"
            />
            
            <!-- 组件图形 -->
            <v-image
              v-if="getIconImageConfig(element)"
              :config="getIconImageConfig(element)"
            />

            <!-- 底部标签条 -->
            <v-rect
              :config="{
                y: element.height - getLabelHeight(element),
                width: element.width,
                height: getLabelHeight(element),
                fill: 'rgba(10,14,26,0.55)',
                cornerRadius: [0, 0, 4, 4],
                listening: false,
              }"
            />

            <!-- 组件名称 -->
            <v-text
              :config="{
                text: element.name,
                fontSize: 11,
                fill: '#e0e0e0',
                width: element.width,
                align: 'center',
                y: element.height - getLabelHeight(element) + 2,
                listening: false,
              }"
            />

            <!-- 实时数值 -->
            <v-text
              v-if="getElementValueText(element)"
              :config="{
                text: getElementValueText(element),
                fontSize: 9,
                fill: '#8fe6d3',
                width: element.width,
                align: 'center',
                y: element.height - 11,
                listening: false,
              }"
            />
            
            <!-- 端口（连线模式下显示） -->
            <template v-if="uiStore.activeTool === 'connect'">
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
                @mousedown="(e: any) => startConnection(element.id, port.position, e)"
              />
            </template>
          </v-group>
        </template>
        
        <!-- 选中变换器 -->
        <v-transformer
          v-if="canvasStore.selectedIds.length"
          ref="transformerRef"
          :config="transformerConfig"
        />
      </v-layer>

      <!-- 对齐参考线与框选框 -->
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
            @navigate="onMinimapNavigate"
          />

          <!-- 画布信息 -->
          <div class="canvas-info">
            <span>{{ canvasStore.canvasConfig.width }} x {{ canvasStore.canvasConfig.height }}</span>
            <span>{{ Math.round(canvasStore.zoom * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useLayerStore } from '@/stores/layerStore'
import { useUiStore } from '@/stores/uiStore'
import { statusEngine } from '@/status/StatusEngine'
import { pathCalculator } from '@/core/connection/PathCalculator'
import { useHistory } from '@/core/canvas/useHistory'
import { getIconImage } from '@/core/canvas/iconImage'
import { computeAlignment } from '@/core/canvas/alignment'
import { getComponentDefinition } from '@/industrial/registry'
import CanvasRuler from '@/components/layout/CanvasRuler.vue'
import MiniMap from '@/components/layout/MiniMap.vue'
import ConnectionLine from '@/core/connection/ConnectionLine.vue'
import type { ComponentInstance } from '@/types/scada'
import type { PortPosition, ConnectionType } from '@/types/connection'

const canvasStore = useCanvasStore()
const deviceStore = useDeviceStore()
const connectionStore = useConnectionStore()
const layerStore = useLayerStore()
const uiStore = useUiStore()
const { saveState } = useHistory()

const stageRef = ref()
const transformerRef = ref()
const stageContainerRef = ref<HTMLElement | null>(null)

// 舞台实际尺寸（随容器尺寸自适应）
const stageSize = ref({ width: 800, height: 400 })
let containerObserver: ResizeObserver | null = null

// 连线模式下鼠标悬停的元素ID
const hoveredElementId = ref<string | null>(null)

// 空白处拖拽平移状态（平移工具/中键）
let panning = false
const panStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 }

// 框选橡皮筋状态
let rubberActive = false
let rubberStart = { x: 0, y: 0 }
const selectionRect = ref<{ x: number; y: number; width: number; height: number } | null>(null)

// 对齐参考线（画布坐标 [x1,y1,x2,y2]）
const alignGuides = ref<number[][]>([])

// 元素矩形与框选矩形是否相交
function rectsIntersect(el: ComponentInstance, r: { x: number; y: number; width: number; height: number }) {
  return (
    el.x < r.x + r.width &&
    el.x + el.width > r.x &&
    el.y < r.y + r.height &&
    el.y + el.height > r.y
  )
}

// 网格吸附：Konva dragBoundFunc 收到的是舞台绝对坐标，需换算到画布坐标取整
function gridSnapFunc(pos: { x: number; y: number }) {
  const gridSize = canvasStore.canvasConfig.gridSize || 20
  const zoom = canvasStore.zoom
  const offsetX = canvasStore.offset.x
  const offsetY = canvasStore.offset.y
  const cx = Math.round((pos.x - offsetX) / zoom / gridSize) * gridSize
  const cy = Math.round((pos.y - offsetY) / zoom / gridSize) * gridSize
  return { x: cx * zoom + offsetX, y: cy * zoom + offsetY }
}

// 画布Stage配置
const stageConfig = computed(() => ({
  width: stageSize.value.width,
  height: stageSize.value.height,
  scaleX: canvasStore.zoom,
  scaleY: canvasStore.zoom,
  x: canvasStore.offset.x,
  y: canvasStore.offset.y,
}))

// 画布网格组配置
const gridGroupConfig = computed(() => ({
  x: 0,
  y: 0,
  listening: false,
}))

// 画布边界配置
const canvasBorderConfig = computed(() => ({
  x: 0,
  y: 0,
  width: canvasStore.canvasConfig.width,
  height: canvasStore.canvasConfig.height,
  stroke: '#444',
  strokeWidth: 2,
  fill: 'transparent',
  listening: false,
}))

// 小网格线
const smallGridLines = computed(() => {
  const lines = []
  const { width, height, gridSize } = canvasStore.canvasConfig
  const gridColor = canvasStore.canvasConfig.gridColor || '#2a2a2a'
  
  // 垂直线
  for (let x = 0; x <= width; x += gridSize) {
    lines.push({
      id: `v_${x}`,
      config: {
        points: [x, 0, x, height],
        stroke: gridColor,
        strokeWidth: 0.5,
        opacity: 0.5,
      },
    })
  }
  
  // 水平线
  for (let y = 0; y <= height; y += gridSize) {
    lines.push({
      id: `h_${y}`,
      config: {
        points: [0, y, width, y],
        stroke: gridColor,
        strokeWidth: 0.5,
        opacity: 0.5,
      },
    })
  }
  
  return lines
})

// 大网格线（每5个小网格）
const largeGridLines = computed(() => {
  const lines = []
  const { width, height, gridSize } = canvasStore.canvasConfig
  const majorGridSize = gridSize * 5
  const gridColor = canvasStore.canvasConfig.gridColor || '#333333'
  
  // 垂直线
  for (let x = 0; x <= width; x += majorGridSize) {
    lines.push({
      id: `mv_${x}`,
      config: {
        points: [x, 0, x, height],
        stroke: gridColor,
        strokeWidth: 1,
        opacity: 0.7,
      },
    })
  }
  
  // 水平线
  for (let y = 0; y <= height; y += majorGridSize) {
    lines.push({
      id: `mh_${y}`,
      config: {
        points: [0, y, width, y],
        stroke: gridColor,
        strokeWidth: 1,
        opacity: 0.7,
      },
    })
  }
  
  return lines
})

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

// 正在绘制的连线配置
const drawingLineConfig = computed(() => {
  const conn = connectionStore.drawingConnection
  if (!conn || !conn.points) return {}
  
  return {
    points: conn.points,
    stroke: '#00d4aa',
    strokeWidth: 2,
    dash: [10, 5],
  }
})

// 获取元素颜色
function getElementColor(element: ComponentInstance): string {
  const data = deviceStore.getDeviceData(element.deviceId || element.id)
  const status = statusEngine.evaluate(element.statusRules, data)
  return status?.color || '#2a2a2a'
}

// 元素上展示的实时数值（取第一个数据绑定变量）
function getElementValueText(element: ComponentInstance): string {
  const binding = element.dataBindings?.[0]
  if (!binding) return ''

  const data = deviceStore.getDeviceData(element.deviceId || element.id)
  const value = data[binding.variable]
  if (value === undefined) return ''

  const formatted = typeof value === 'number' ? Math.round(value * 10) / 10 : value
  return `${binding.variable}: ${formatted}`
}

// 底部标签条高度（有实时数值时更高）
function getLabelHeight(element: ComponentInstance): number {
  return getElementValueText(element) ? 26 : 16
}

// 图标加载完成后递增以触发画布重绘
const iconVersion = ref(0)

// 组件图形（SVG 图标按比例适配到元素内部）
function getIconImageConfig(element: ComponentInstance) {
  const def = getComponentDefinition(element.type)
  if (!def?.icon) return null

  const img = getIconImage(element.type, def.icon, '#e8f0ef', () => {
    iconVersion.value++
  })
  if (!img) return null

  const labelH = getLabelHeight(element)
  const boxW = Math.max(element.width - 12, 4)
  const boxH = Math.max(element.height - labelH - 10, 4)
  const scale = Math.min(boxW / 100, boxH / 100)
  const iconW = 100 * scale
  const iconH = 100 * scale

  return {
    image: img,
    x: (element.width - iconW) / 2,
    y: 4 + (boxH - iconH) / 2,
    width: iconW,
    height: iconH,
    listening: false,
  }
}

// 检查图层是否锁定
function isLayerLocked(layerId: string): boolean {
  const layer = layerStore.getLayer(layerId)
  return layer?.locked ?? false
}

// 检查图层是否可见
function isLayerVisible(layerId: string): boolean {
  const layer = layerStore.getLayer(layerId)
  return layer?.visible ?? true
}

// 获取元素端口
function getElementPorts(element: ComponentInstance) {
  return [
    { id: 'top', position: 'top' as PortPosition, x: element.width / 2, y: 0 },
    { id: 'bottom', position: 'bottom' as PortPosition, x: element.width / 2, y: element.height },
    { id: 'left', position: 'left' as PortPosition, x: 0, y: element.height / 2 },
    { id: 'right', position: 'right' as PortPosition, x: element.width, y: element.height / 2 },
  ]
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

// 点击元素：Shift+点击切换选中（多选），普通点击单选
function onElementClick(element: ComponentInstance, e: any) {
  if (e.evt?.shiftKey) {
    canvasStore.toggleElement(element.id)
  } else {
    canvasStore.selectElement(element.id)
  }
}

// 选择连线
function selectConnection(id: string) {
  connectionStore.selectConnection(id)
}

// 拖拽开始：未选中的元素单独选中；记录多选拖动的起始位置
let dragStartPos: { x: number; y: number } | null = null
let multiDragStarts: Array<{ node: any; x: number; y: number }> = []

function onDragStart(element: ComponentInstance, e: any) {
  if (!canvasStore.selectedIds.includes(element.id)) {
    canvasStore.selectElement(element.id)
  }
  dragStartPos = { x: e.target.x(), y: e.target.y() }
  const stage = stageRef.value.getNode()
  multiDragStarts = canvasStore.selectedIds
    .filter(id => id !== element.id)
    .map(id => {
      const node = stage.findOne('#' + id)
      return node ? { node, x: node.x(), y: node.y() } : null
    })
    .filter((entry): entry is { node: any; x: number; y: number } => entry !== null)
}

// 拖动中：多选整体位移 + 对齐吸附（仅单选时计算参考线）
function onDragMove(element: ComponentInstance, e: any) {
  const node = e.target
  const dx = node.x() - (dragStartPos?.x ?? node.x())
  const dy = node.y() - (dragStartPos?.y ?? node.y())

  for (const entry of multiDragStarts) {
    entry.node.position({ x: entry.x + dx, y: entry.y + dy })
  }

  if (canvasStore.selectedIds.length <= 1) {
    const others = canvasStore.elements
      .filter(el => el.id !== element.id)
      .map(o => ({ x: o.x, y: o.y, width: o.width, height: o.height }))

    const result = computeAlignment(
      { x: node.x(), y: node.y(), width: element.width, height: element.height },
      others,
      6 / canvasStore.zoom,
    )

    if (result.x !== null) node.x(result.x)
    if (result.y !== null) node.y(result.y)
    alignGuides.value = result.guides
  }
}

// 拖动结束：批量写回所有选中元素的位置
function onDragEnd(element: ComponentInstance, e: any) {
  const movedIds = canvasStore.selectedIds.includes(element.id)
    ? [...canvasStore.selectedIds]
    : [element.id]
  const stage = stageRef.value.getNode()

  for (const id of movedIds) {
    const node = id === element.id ? e.target : stage.findOne('#' + id)
    if (!node) continue
    canvasStore.updateElement(id, {
      x: node.x(),
      y: node.y(),
    })
    recalcElementConnections(id)
  }
  alignGuides.value = []
  saveState()
}

// 变换结束：把缩放固化为宽高，旋转写入元素
function onTransformEnd(id: string) {
  const stage = stageRef.value.getNode()
  const node = stage.findOne('#' + id)
  const element = canvasStore.elements.find(el => el.id === id)
  if (!node || !element) return

  canvasStore.updateElement(id, {
    x: node.x(),
    y: node.y(),
    rotation: Math.round(node.rotation() * 10) / 10,
    width: Math.max(10, Math.round(element.width * node.scaleX())),
    height: Math.max(10, Math.round(element.height * node.scaleY())),
  })

  // 尺寸已固化到宽高，重置节点缩放避免叠加
  node.scaleX(1)
  node.scaleY(1)

  recalcElementConnections(id)
  saveState()
}

// 获取元素指定端口的画布绝对坐标
function getElementPortPoint(element: ComponentInstance, port: PortPosition) {
  switch (port) {
    case 'top': return { x: element.x + element.width / 2, y: element.y }
    case 'bottom': return { x: element.x + element.width / 2, y: element.y + element.height }
    case 'left': return { x: element.x, y: element.y + element.height / 2 }
    case 'right': return { x: element.x + element.width, y: element.y + element.height / 2 }
  }
}

// 找出元素上距离指针最近的端口
function getNearestPort(element: ComponentInstance, px: number, py: number): PortPosition {
  const ports: PortPosition[] = ['top', 'bottom', 'left', 'right']
  let nearest: PortPosition = 'top'
  let minDist = Infinity
  for (const port of ports) {
    const pt = getElementPortPoint(element, port)
    const dist = (pt.x - px) ** 2 + (pt.y - py) ** 2
    if (dist < minDist) {
      minDist = dist
      nearest = port
    }
  }
  return nearest
}

// 根据连线类型计算两端端口间的路径点
function computeConnectionPoints(
  source: ComponentInstance, sourcePort: PortPosition,
  target: ComponentInstance, targetPort: PortPosition,
  type: ConnectionType
): number[] {
  const s = getElementPortPoint(source, sourcePort)
  const t = getElementPortPoint(target, targetPort)
  const sourceInfo = { position: sourcePort, x: s.x, y: s.y }
  const targetInfo = { position: targetPort, x: t.x, y: t.y }

  if (type === 'straight') return pathCalculator.calculateStraightPath(sourceInfo, targetInfo)
  if (type === 'curve') return pathCalculator.calculateCurvePath(sourceInfo, targetInfo)
  return pathCalculator.calculatePolylinePath(sourceInfo, targetInfo)
}

// 元素移动后重算与它相连的所有连线
function recalcElementConnections(elementId: string) {
  const moved = canvasStore.elements.find(el => el.id === elementId)
  if (!moved) return

  for (const conn of connectionStore.getConnectionsByElement(elementId)) {
    const source = canvasStore.elements.find(el => el.id === conn.sourceId)
    const target = canvasStore.elements.find(el => el.id === conn.targetId)
    if (!source || !target) continue
    connectionStore.updateConnection(conn.id, {
      points: computeConnectionPoints(source, conn.sourcePort, target, conn.targetPort, conn.type),
    })
  }
}

// 开始连线
function startConnection(elementId: string, port: PortPosition, _e: any) {
  const stage = stageRef.value.getNode()
  const point = stage.getPointerPosition()
  
  connectionStore.startConnection(elementId, port, {
    x: point.x / canvasStore.zoom,
    y: point.y / canvasStore.zoom,
  })
}

// 鼠标按下
function onMouseDown(e: any) {
  const stage = stageRef.value.getNode()
  const clickedOnEmpty = e.target === stage
  const isMiddleButton = e.evt?.button === 1

  // 中键或平移工具：拖拽平移
  if (isMiddleButton || uiStore.activeTool === 'hand') {
    const pos = stage.getPointerPosition()
    if (pos) {
      panning = true
      panStart.x = pos.x
      panStart.y = pos.y
      panStart.offsetX = canvasStore.offset.x
      panStart.offsetY = canvasStore.offset.y
    }
    return
  }

  if (clickedOnEmpty) {
    // 选择工具：空白处按下开始框选
    if (uiStore.activeTool === 'select') {
      const pos = stage.getPointerPosition()
      if (pos) {
        rubberActive = true
        rubberStart = {
          x: (pos.x - canvasStore.offset.x) / canvasStore.zoom,
          y: (pos.y - canvasStore.offset.y) / canvasStore.zoom,
        }
        selectionRect.value = { x: rubberStart.x, y: rubberStart.y, width: 0, height: 0 }
      }
      return
    }

    // 其他工具：空白点击仅清除选择
    canvasStore.clearSelection()
    connectionStore.selectConnection(null)
  }
}

// 鼠标移动
function onMouseMove(_e: any) {
  const stage = stageRef.value.getNode()

  // 拖拽平移
  if (panning) {
    const pos = stage.getPointerPosition()
    if (pos) {
      canvasStore.setOffset(
        panStart.offsetX + (pos.x - panStart.x),
        panStart.offsetY + (pos.y - panStart.y),
      )
    }
    return
  }

  // 框选中：更新橡皮筋矩形
  if (rubberActive) {
    const pos = stage.getPointerPosition()
    if (pos) {
      const cx = (pos.x - canvasStore.offset.x) / canvasStore.zoom
      const cy = (pos.y - canvasStore.offset.y) / canvasStore.zoom
      selectionRect.value = {
        x: Math.min(rubberStart.x, cx),
        y: Math.min(rubberStart.y, cy),
        width: Math.abs(cx - rubberStart.x),
        height: Math.abs(cy - rubberStart.y),
      }
    }
    return
  }

  if (connectionStore.drawingConnection) {
    const point = stage.getPointerPosition()

    connectionStore.updateDrawingConnection({
      x: point.x / canvasStore.zoom,
      y: point.y / canvasStore.zoom,
    })
  }
}

// 鼠标释放
function onMouseUp(_e: any) {
  panning = false

  // 完成框选
  if (rubberActive) {
    const rect = selectionRect.value
    if (rect && (rect.width > 2 || rect.height > 2)) {
      const ids = canvasStore.elements
        .filter(el => rectsIntersect(el, rect))
        .map(el => el.id)
      canvasStore.selectMany(ids)
    } else {
      // 空白单击：清除选择
      canvasStore.clearSelection()
      connectionStore.selectConnection(null)
    }
    rubberActive = false
    selectionRect.value = null
    return
  }

  const drawing = connectionStore.drawingConnection
  if (!drawing) return

  const stage = stageRef.value.getNode()
  const pointer = stage.getPointerPosition()
  const point = pointer
    ? { x: pointer.x / canvasStore.zoom, y: pointer.y / canvasStore.zoom }
    : { x: 0, y: 0 }

  const sourceId = drawing.sourceId
  const targetId = hoveredElementId.value
  const sourceElement = sourceId
    ? canvasStore.elements.find(el => el.id === sourceId)
    : null
  const targetElement = targetId
    ? canvasStore.elements.find(el => el.id === targetId)
    : null

  // 释放位置在另一个组件上时完成连线，否则取消
  if (sourceElement && targetElement && targetId && targetId !== sourceId) {
    const targetPort = getNearestPort(targetElement, point.x, point.y)
    const type: ConnectionType = drawing.type || 'polyline'
    const points = computeConnectionPoints(sourceElement, drawing.sourcePort!, targetElement, targetPort, type)
    connectionStore.finishConnection(targetId, targetPort, points)
    saveState()
  } else {
    connectionStore.cancelConnection()
  }
  hoveredElementId.value = null
}

// 滚轮缩放（以指针为中心）
function onWheel(e: any) {
  e.evt.preventDefault()
  const scaleBy = 1.1
  const stage = stageRef.value.getNode()
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()
  if (!pointer) return

  const rawScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
  canvasStore.setZoom(rawScale)
  const newScale = canvasStore.zoom

  // 保持指针下的画布点不动：pointer = point * scale + offset
  const pointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }
  canvasStore.setOffset(
    pointer.x - pointTo.x * newScale,
    pointer.y - pointTo.y * newScale,
  )
}

// 初始化
onMounted(() => {
  deviceStore.initDataSource({ type: 'mock' })

  // 监听舞台容器尺寸，舞台自适应并支持窗口缩放
  if (stageContainerRef.value && 'ResizeObserver' in window) {
    containerObserver = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      stageSize.value = {
        width: Math.max(rect.width, 100),
        height: Math.max(rect.height, 100),
      }
    })
    containerObserver.observe(stageContainerRef.value)
  }
})

onUnmounted(() => {
  containerObserver?.disconnect()
})

// 小地图导航：把画布坐标居中显示
function onMinimapNavigate(x: number, y: number) {
  canvasStore.setOffset(
    stageSize.value.width / 2 - x * canvasStore.zoom,
    stageSize.value.height / 2 - y * canvasStore.zoom,
  )
}
</script>

<style scoped lang="scss">
.scada-canvas {
  width: 100%;
  height: 100%;
  background: var(--bg-canvas);
  position: relative;
  overflow: hidden;
}

.canvas-frame {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ruler-row {
  height: 20px;
  display: flex;
  flex: 0 0 auto;

  .ruler-corner {
    width: 20px;
    background: #151a28;
    border-bottom: 1px solid #2a3244;
    border-right: 1px solid #2a3244;
  }

  > .canvas-ruler.horizontal {
    flex: 1;
    min-width: 0;
  }
}

.canvas-row {
  flex: 1;
  display: flex;
  min-height: 0;

  > .canvas-ruler.vertical {
    flex: 0 0 20px;
  }
}

.stage-container {
  flex: 1;
  position: relative;
  min-width: 0;
  overflow: hidden;
}

.canvas-info {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 12px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-muted);
  pointer-events: none;
}
</style>
