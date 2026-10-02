import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useHistory } from '@/core/canvas/useHistory'
import { createElementId } from '@/utils/id'

/**
 * 画布编辑命令：复制/粘贴/删除选中（元素或连线）。
 * 工具栏快捷键、右键菜单、浮动工具条共用这一份实现，保证编辑语义一致。
 */
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

    const pasted = canvasStore.clipboard.map(el => ({
      ...JSON.parse(JSON.stringify(el)),
      id: createElementId(),
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
