import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useUiStore } from '@/stores/uiStore'
import { useHistory } from '@/core/canvas/useHistory'
import { saveDeviceTemplate, templateFromElement } from '@/industrial/templateLibrary'
import type { ContextMenuItem } from '@/components/layout/ContextMenu.vue'
import type { ComponentInstance } from '@/types/scada'

/**
 * 画布右键菜单：复制 / 存为模板 / 删除 / 锁定。
 * 与工具栏剪贴板行为保持一致（复制进 canvasStore.clipboard）。
 */
export function useCanvasContextMenu() {
  const canvasStore = useCanvasStore()
  const connectionStore = useConnectionStore()
  const uiStore = useUiStore()
  const { saveState } = useHistory()

  const ctxMenuVisible = ref(false)
  const ctxMenuX = ref(0)
  const ctxMenuY = ref(0)
  const ctxMenuItems = ref<ContextMenuItem[]>([])

  function handleCopyFromCanvas() {
    const selected = canvasStore.selectedElements
    if (selected.length) {
      canvasStore.clipboard = JSON.parse(JSON.stringify(selected))
    }
  }

  function handleDeleteFromCanvas() {
    const ids = [...canvasStore.selectedIds]
    if (!ids.length) return
    canvasStore.removeElements(ids)
    ids.forEach(id => connectionStore.deleteConnectionsByElement(id))
    saveState()
  }

  async function handleSaveAsTemplate(element: ComponentInstance) {
    let name: string
    try {
      const result = await ElMessageBox.prompt('模板名称', '存为设备模板', {
        inputValue: `${element.name} 模板`,
        inputPattern: /\S+/,
        inputErrorMessage: '名称不能为空',
        confirmButtonText: '保存',
        cancelButtonText: '取消',
      })
      name = result.value
    } catch {
      return
    }
    const body = templateFromElement(element, name)
    const saved = await saveDeviceTemplate(body)
    canvasStore.updateElement(element.id, { templateId: saved.id })
    ElMessage.success(`已保存设备模板「${name}」`)
  }

  function onElementContextMenu(element: ComponentInstance, e: { evt: MouseEvent }) {
    e.evt.preventDefault()
    if (uiStore.activeTool === 'connect') return
    canvasStore.selectElement(element.id)
    ctxMenuX.value = e.evt.clientX
    ctxMenuY.value = e.evt.clientY
    const isLocked = !!element.locked
    ctxMenuItems.value = [
      {
        label: '复制',
        icon: 'CopyDocument',
        shortcut: 'Ctrl+C',
        action: () => handleCopyFromCanvas(),
      },
      {
        label: '存为模板',
        icon: 'Collection',
        action: () => void handleSaveAsTemplate(element),
      },
      {
        label: '删除',
        icon: 'Delete',
        shortcut: 'Del',
        danger: true,
        action: () => handleDeleteFromCanvas(),
      },
      {
        label: isLocked ? '解锁' : '锁定',
        icon: 'Lock',
        action: () => canvasStore.updateElement(element.id, { locked: !isLocked }),
      },
    ]
    ctxMenuVisible.value = true
  }

  return {
    ctxMenuVisible,
    ctxMenuX,
    ctxMenuY,
    ctxMenuItems,
    onElementContextMenu,
  }
}
