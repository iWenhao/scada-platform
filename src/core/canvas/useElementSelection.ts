import { ref } from 'vue'
import type { useCanvasStore } from '@/stores/canvasStore'
import type { ComponentInstance } from '@/types/scada'

type CanvasStore = ReturnType<typeof useCanvasStore>

interface RubberRect {
  x: number
  y: number
  width: number
  height: number
}

/** 元素矩形与框选矩形是否相交 */
function rectsIntersect(el: ComponentInstance, r: RubberRect) {
  return (
    el.x < r.x + r.width &&
    el.x + el.width > r.x &&
    el.y < r.y + r.height &&
    el.y + el.height > r.y
  )
}

/**
 * 框选橡皮筋：空白处拖出矩形选区，命中元素全选。
 */
export function useElementSelection(canvasStore: CanvasStore) {
  let rubberActive = false
  let rubberStart = { x: 0, y: 0 }
  const selectionRect = ref<RubberRect | null>(null)

  /** 空白处按下：开始框选 */
  function beginRubber(stage: any) {
    const pos = stage.getPointerPosition()
    if (!pos) return
    rubberActive = true
    rubberStart = {
      x: (pos.x - canvasStore.offset.x) / canvasStore.zoom,
      y: (pos.y - canvasStore.offset.y) / canvasStore.zoom,
    }
    selectionRect.value = { x: rubberStart.x, y: rubberStart.y, width: 0, height: 0 }
  }

  /** 移动中更新选区；返回是否处于框选状态 */
  function moveRubber(stage: any): boolean {
    if (!rubberActive) return false
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
    return true
  }

  /**
   * 完成框选。返回命中的元素ID列表（可能是空数组＝空白单击）；
   * 若框选未激活返回 null（调用方不应清除选择）。
   */
  function endRubber(): string[] | null {
    if (!rubberActive) return null

    const rect = selectionRect.value
    let ids: string[] = []
    if (rect && (rect.width > 2 || rect.height > 2)) {
      ids = canvasStore.elements
        .filter(el => rectsIntersect(el, rect))
        .map(el => el.id)
    }
    rubberActive = false
    selectionRect.value = null
    return ids
  }

  return {
    selectionRect,
    beginRubber,
    moveRubber,
    endRubber,
  }
}
