import { computed, ref } from 'vue'
import type { useCanvasStore } from '@/stores/canvasStore'
import type { useConnectionStore } from '@/stores/connectionStore'
import { pathCalculator } from '@/core/connection/PathCalculator'
import type { ComponentInstance } from '@/types/scada'
import type { ConnectionType, PortPosition } from '@/types/connection'

type CanvasStore = ReturnType<typeof useCanvasStore>
type ConnectionStore = ReturnType<typeof useConnectionStore>

/**
 * 连线绘制：从端口按下开始、移动中更新虚线、释放时吸附目标最近端口完成。
 * 并提供端口坐标计算与元素移动后的连线重算。
 */
export function useConnectionDraw(options: {
  stageRef: any
  canvasStore: CanvasStore
  connectionStore: ConnectionStore
}) {
  const { stageRef, canvasStore, connectionStore } = options

  // 连线模式下鼠标悬停的元素ID
  const hoveredElementId = ref<string | null>(null)

  function setHovered(id: string | null) {
    hoveredElementId.value = id
  }

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

  // 从端口开始连线
  function beginConnection(elementId: string, port: PortPosition) {
    const stage = stageRef.value.getNode()
    const point = stage.getPointerPosition()

    connectionStore.startConnection(elementId, port, {
      x: point.x / canvasStore.zoom,
      y: point.y / canvasStore.zoom,
    })
  }

  /** 移动中更新绘制中的连线；返回是否有连线在绘制 */
  function trackMove(): boolean {
    if (!connectionStore.drawingConnection) return false
    const stage = stageRef.value.getNode()
    const point = stage.getPointerPosition()

    connectionStore.updateDrawingConnection({
      x: point.x / canvasStore.zoom,
      y: point.y / canvasStore.zoom,
    })
    return true
  }

  /** 释放：落在目标组件上则完成连线，否则取消。返回是否处理了连线。 */
  function finishOnMouseUp(): boolean {
    const drawing = connectionStore.drawingConnection
    if (!drawing) {
      setHovered(null)
      return false
    }

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
    } else {
      connectionStore.cancelConnection()
    }
    setHovered(null)
    return true
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

  return {
    setHovered,
    beginConnection,
    trackMove,
    finishOnMouseUp,
    recalcElementConnections,
    drawingLineConfig,
  }
}
