<template>
  <div
    class="scada-canvas"
    @dragover.prevent
    @drop="onDrop"
  >
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
            }"
            @click="selectElement(element.id)"
            @mouseenter="hoveredElementId = element.id"
            @mouseleave="hoveredElementId = null"
            @dragstart="onDragStart(element.id)"
            @dragend="(e: any) => updatePosition(element.id, e)"
            @transformend="onTransformEnd(element.id)"
          >
            <!-- 组件主体 -->
            <v-rect
              :config="{
                width: element.width,
                height: element.height,
                fill: getElementColor(element),
                stroke: element.id === canvasStore.selectedId ? '#00d4aa' : '#444',
                strokeWidth: element.id === canvasStore.selectedId ? 2 : 1,
                cornerRadius: 4,
              }"
            />
            
            <!-- 组件名称 -->
            <v-text
              :config="{
                text: element.name,
                fontSize: 12,
                fill: '#e0e0e0',
                width: element.width,
                align: 'center',
                y: element.height / 2 - (getElementValueText(element) ? 12 : 6),
                listening: false,
              }"
            />

            <!-- 实时数值 -->
            <v-text
              v-if="getElementValueText(element)"
              :config="{
                text: getElementValueText(element),
                fontSize: 10,
                fill: '#00d4aa',
                width: element.width,
                align: 'center',
                y: element.height / 2 + 4,
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
          v-if="canvasStore.selectedId"
          ref="transformerRef"
          :config="transformerConfig"
        />
      </v-layer>
    </v-stage>
    
    <!-- 画布信息 -->
    <div class="canvas-info">
      <span>{{ canvasStore.canvasConfig.width }} x {{ canvasStore.canvasConfig.height }}</span>
      <span>{{ Math.round(canvasStore.zoom * 100) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useLayerStore } from '@/stores/layerStore'
import { useUiStore } from '@/stores/uiStore'
import { statusEngine } from '@/status/StatusEngine'
import { pathCalculator } from '@/core/connection/PathCalculator'
import { useHistory } from '@/core/canvas/useHistory'
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

// 连线模式下鼠标悬停的元素ID
const hoveredElementId = ref<string | null>(null)

// 画布Stage配置
const stageConfig = computed(() => ({
  width: window.innerWidth - 520,
  height: window.innerHeight - 250,
  scaleX: canvasStore.zoom,
  scaleY: canvasStore.zoom,
  x: canvasStore.offset.x,
  y: canvasStore.offset.y,
}))

// 画布网格组配置
const gridGroupConfig = computed(() => ({
  x: 0,
  y: 0,
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

// 选中变化时把变换器绑定到目标节点
watch(() => canvasStore.selectedId, async (id) => {
  await nextTick()
  const transformer = transformerRef.value?.getNode()
  if (!transformer) return

  if (id) {
    const stage = stageRef.value.getNode()
    const node = stage.findOne('#' + id)
    transformer.nodes(node ? [node] : [])
  } else {
    transformer.nodes([])
  }
  transformer.getLayer()?.batchDraw()
})

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

// 选择元素
function selectElement(id: string) {
  canvasStore.selectElement(id)
}

// 选择连线
function selectConnection(id: string) {
  connectionStore.selectConnection(id)
}

// 开始拖拽
function onDragStart(id: string) {
  canvasStore.selectElement(id)
}

// 更新位置
function updatePosition(id: string, e: any) {
  canvasStore.updateElement(id, {
    x: e.target.x(),
    y: e.target.y(),
  })
  recalcElementConnections(id)
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
  const clickedOnEmpty = e.target === e.target.getStage()
  if (clickedOnEmpty) {
    canvasStore.clearSelection()
    connectionStore.selectConnection(null)
  }
}

// 鼠标移动
function onMouseMove(_e: any) {
  if (connectionStore.drawingConnection) {
    const stage = stageRef.value.getNode()
    const point = stage.getPointerPosition()
    
    connectionStore.updateDrawingConnection({
      x: point.x / canvasStore.zoom,
      y: point.y / canvasStore.zoom,
    })
  }
}

// 鼠标释放
function onMouseUp(_e: any) {
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

// 滚轮缩放
function onWheel(e: any) {
  e.evt.preventDefault()
  const scaleBy = 1.1
  const stage = stageRef.value.getNode()
  const oldScale = stage.scaleX()
  const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy
  canvasStore.setZoom(newScale)
}

// 初始化
onMounted(() => {
  deviceStore.initDataSource({ type: 'mock' })
})
</script>

<style scoped lang="scss">
.scada-canvas {
  width: 100%;
  height: 100%;
  background: var(--bg-canvas);
  position: relative;
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
