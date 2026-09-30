import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useHistory } from '@/core/canvas/useHistory'

/**
 * 选中后的浮动工具条动作：复制/删除/锁定/层级。
 * 与工具栏、右键菜单保持一致的编辑语义。
 */
export function useFloatingActions() {
  const canvasStore = useCanvasStore()
  const connectionStore = useConnectionStore()
  const { saveState } = useHistory()

  function handleCopyFromCanvas() {
    const selected = canvasStore.selectedElements
    if (selected.length) canvasStore.clipboard = JSON.parse(JSON.stringify(selected))
  }

  function handleDeleteFromCanvas() {
    const ids = [...canvasStore.selectedIds]
    if (!ids.length) return
    canvasStore.removeElements(ids)
    ids.forEach(id => connectionStore.deleteConnectionsByElement(id))
    saveState()
  }

  function toggleLockSelected() {
    const el = canvasStore.selectedElement
    if (!el) return
    canvasStore.updateElement(el.id, { locked: !el.locked })
    saveState()
  }

  function bringFront() {
    const el = canvasStore.selectedElement
    if (!el) return
    const list = [...canvasStore.elements]
    const idx = list.findIndex(e => e.id === el.id)
    if (idx >= 0 && idx < list.length - 1) {
      const [item] = list.splice(idx, 1)
      list.push(item)
      canvasStore.elements = list
      saveState()
    }
  }

  function sendBack() {
    const el = canvasStore.selectedElement
    if (!el) return
    const list = [...canvasStore.elements]
    const idx = list.findIndex(e => e.id === el.id)
    if (idx > 0) {
      const [item] = list.splice(idx, 1)
      list.unshift(item)
      canvasStore.elements = list
      saveState()
    }
  }

  const floatPos = computed(() => {
    const el = canvasStore.selectedElement
    if (!el) return { x: 0, y: 0 }
    const { zoom, offset } = canvasStore
    return {
      x: el.x * zoom + offset.x + (el.width * zoom) / 2,
      y: el.y * zoom + offset.y - 12,
    }
  })

  return {
    floatPos,
    handleCopyFromCanvas,
    handleDeleteFromCanvas,
    toggleLockSelected,
    bringFront,
    sendBack,
  }
}
