import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useHistory } from '@/core/canvas/useHistory'

/** 画布编辑命令：复制/粘贴/删除选中（元素或连线） */
export function useEditClipboard() {
  const canvasStore = useCanvasStore()
  const connectionStore = useConnectionStore()
  const { saveState } = useHistory()

  function handleCopy() {
    const selected = canvasStore.selectedElements
    if (selected.length) {
      canvasStore.clipboard = JSON.parse(JSON.stringify(selected))
    }
  }

  function handlePaste() {
    if (!canvasStore.clipboard.length) return

    const stamp = Date.now()
    const pasted = canvasStore.clipboard.map((el, i) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: `el_${stamp}_${i}`,
      x: el.x + 20,
      y: el.y + 20,
      name: `${el.name} 副本`,
    }))
    pasted.forEach(p => canvasStore.addElement(p))
    canvasStore.selectMany(pasted.map(p => p.id))
    saveState()
  }

  function handleDelete() {
    const ids = [...canvasStore.selectedIds]

    if (ids.length) {
      canvasStore.removeElements(ids)
      ids.forEach(id => connectionStore.deleteConnectionsByElement(id))
      saveState()
    } else if (connectionStore.selectedConnectionId) {
      connectionStore.deleteConnection(connectionStore.selectedConnectionId)
      saveState()
    }
  }

  return { handleCopy, handlePaste, handleDelete }
}
