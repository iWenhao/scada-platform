import { ref } from 'vue'
import type { useCanvasStore } from '@/stores/canvasStore'
import { computeAlignment } from './alignment'
import type { ComponentInstance } from '@/types/scada'

type CanvasStore = ReturnType<typeof useCanvasStore>

/**
 * 元素拖拽与变换：网格吸附、多选整体位移、对齐参考线、批量写回与变换固化。
 */
export function useElementDrag(options: {
  stageRef: any
  canvasStore: CanvasStore
  recalcElementConnections: (elementId: string) => void
  saveState: () => void
}) {
  const { stageRef, canvasStore, recalcElementConnections, saveState } = options

  // 对齐参考线（画布坐标 [x1,y1,x2,y2]）
  const alignGuides = ref<number[][]>([])

  // 拖拽开始：未选中的元素单独选中；记录多选拖动的起始位置
  let dragStartPos: { x: number; y: number } | null = null
  let multiDragStarts: Array<{ node: any; x: number; y: number }> = []

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

  return {
    alignGuides,
    gridSnapFunc,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformEnd,
  }
}
