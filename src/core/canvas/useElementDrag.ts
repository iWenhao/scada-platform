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

  // 参考线的响应式写回合并到每帧一次：dragmove 每鼠标事件触发，逐次写回
  // 会放大 Vue 更新压力；吸附调整（node.x/y）仍保持同步，拖拽手感不变
  let pendingGuides: number[][] | null = null
  let guidesFrame: number | null = null

  function flushGuides() {
    guidesFrame = null
    if (pendingGuides !== null) {
      alignGuides.value = pendingGuides
      pendingGuides = null
    }
  }

  function scheduleGuides(guides: number[][]) {
    pendingGuides = guides
    if (guidesFrame === null) guidesFrame = requestAnimationFrame(flushGuides)
  }

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

  /** 对齐参考框：除被拖元素外的所有元素的位置尺寸 */
  function buildAlignOthers(element: ComponentInstance) {
    return canvasStore.elements
      .filter(el => el.id !== element.id)
      .map(o => ({ x: o.x, y: o.y, width: o.width, height: o.height }))
  }

  /**
   * 拖拽期间的对齐参考元素快照。
   *
   * 拖拽过程中元素集合不会变，但 mousemove 每帧都会 filter+map 重建一次全量数组
   * （上千元素时每帧几千次迭代，且后面还要对这批元素算对齐）——没必要，开拖时算一次就够。
   * 只有单选才需要参考线（多选时下面那条分支不计算对齐），多选就不构建。
   */
  let alignOthers: ReturnType<typeof buildAlignOthers> | null = null

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

    alignOthers = canvasStore.selectedIds.length <= 1 ? buildAlignOthers(element) : null
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
      // 正常路径复用开拖时的快照；拿不到（未走 onDragStart）就当帧现算，行为不变
      const others = alignOthers ?? buildAlignOthers(element)

      const result = computeAlignment(
        { x: node.x(), y: node.y(), width: element.width, height: element.height },
        others,
        6 / canvasStore.zoom,
      )

      if (result.x !== null) node.x(result.x)
      if (result.y !== null) node.y(result.y)
      scheduleGuides(result.guides)
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
    if (guidesFrame !== null) {
      cancelAnimationFrame(guidesFrame)
      guidesFrame = null
    }
    pendingGuides = null
    alignGuides.value = []
    alignOthers = null
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
