import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Connection, ConnectionStyle, PortPosition } from '@/types/connection'
import { defaultConnectionStyle } from '@/types/connection'
import { computeConnectionPoints } from '@/core/connection/portPoints'
import { useCanvasStore } from './canvasStore'

export const useConnectionStore = defineStore('connection', () => {
  // 连线列表
  const connections = ref<Connection[]>([])
  
  // 正在绘制的连线
  const drawingConnection = ref<Partial<Connection> | null>(null)
  
  // 选中的连线ID
  const selectedConnectionId = ref<string | null>(null)

  /**
   * 开始绘制连线
   */
  function startConnection(
    sourceId: string,
    sourcePort: PortPosition,
    point: { x: number; y: number }
  ) {
    drawingConnection.value = {
      sourceId,
      sourcePort,
      points: [point.x, point.y],
      type: 'polyline',
    }
  }

  /**
   * 更新绘制中的连线
   */
  function updateDrawingConnection(point: { x: number; y: number }) {
    if (!drawingConnection.value) return
    const points = drawingConnection.value.points || []
    drawingConnection.value.points = [...points.slice(0, 2), point.x, point.y]
  }

  /**
   * 完成连线
   */
  function finishConnection(
    targetId: string,
    targetPort: PortPosition,
    points: number[]
  ): Connection | null {
    if (!drawingConnection.value) return null
    
    const newConnection: Connection = {
      id: `conn_${Date.now()}`,
      type: drawingConnection.value.type || 'polyline',
      sourceId: drawingConnection.value.sourceId!,
      sourcePort: drawingConnection.value.sourcePort!,
      targetId,
      targetPort,
      points,
      style: { ...defaultConnectionStyle },
    }
    
    connections.value.push(newConnection)
    drawingConnection.value = null
    
    return newConnection
  }

  /**
   * 取消绘制连线
   */
  function cancelConnection() {
    drawingConnection.value = null
  }

  /**
   * 删除连线
   */
  function deleteConnection(id: string) {
    connections.value = connections.value.filter(c => c.id !== id)
    if (selectedConnectionId.value === id) {
      selectedConnectionId.value = null
    }
  }

  /**
   * 删除与指定组件相关的所有连线
   */
  function deleteConnectionsByElement(elementId: string) {
    connections.value = connections.value.filter(
      c => c.sourceId !== elementId && c.targetId !== elementId
    )
  }

  /**
   * 更新连线
   */
  function updateConnection(id: string, updates: Partial<Connection>) {
    const index = connections.value.findIndex(c => c.id === id)
    if (index !== -1) {
      connections.value[index] = { ...connections.value[index], ...updates }
    }
  }

  /**
   * 按连线当前类型重算路径点（类型切换后调用）
   */
  function recalcConnection(id: string) {
    const canvasStore = useCanvasStore()
    const conn = connections.value.find(c => c.id === id)
    if (!conn) return
    const source = canvasStore.elements.find(el => el.id === conn.sourceId)
    const target = canvasStore.elements.find(el => el.id === conn.targetId)
    if (!source || !target) return
    conn.points = computeConnectionPoints(source, conn.sourcePort, target, conn.targetPort, conn.type)
  }

  /**
   * 更新连线样式
   */
  function updateConnectionStyle(id: string, style: Partial<ConnectionStyle>) {
    const index = connections.value.findIndex(c => c.id === id)
    if (index !== -1) {
      connections.value[index].style = {
        ...connections.value[index].style,
        ...style,
      }
    }
  }

  /**
   * 选择连线
   */
  function selectConnection(id: string | null) {
    selectedConnectionId.value = id
  }

  /**
   * 获取与指定组件相关的连线
   */
  function getConnectionsByElement(elementId: string): Connection[] {
    return connections.value.filter(
      c => c.sourceId === elementId || c.targetId === elementId
    )
  }

  /**
   * 从JSON加载（序列化统一走 projectStore.buildProjectData，这里只负责恢复）
   */
  function loadFromJSON(json: string) {
    try {
      connections.value = JSON.parse(json)
      selectedConnectionId.value = null
      return true
    } catch (e) {
      console.error('Failed to load connections JSON:', e)
      return false
    }
  }

  return {
    connections,
    drawingConnection,
    selectedConnectionId,
    startConnection,
    updateDrawingConnection,
    finishConnection,
    cancelConnection,
    deleteConnection,
    deleteConnectionsByElement,
    updateConnection,
    updateConnectionStyle,
    recalcConnection,
    selectConnection,
    getConnectionsByElement,
    loadFromJSON,
  }
})
