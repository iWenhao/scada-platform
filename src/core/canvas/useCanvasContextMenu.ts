import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCanvasStore } from '@/stores/canvasStore'
import { useHistory } from '@/core/canvas/useHistory'
import { useEditClipboard } from '@/core/canvas/useEditClipboard'
import { saveDeviceTemplate, templateFromElement } from '@/industrial/templateLibrary'
import type { ContextMenuItem } from '@/components/layout/ContextMenu.vue'
import type { ComponentInstance } from '@/types/scada'

/**
 * 画布右键菜单：复制 / 存为模板 / 上下移一层 / 删除 / 锁定。
 * 复制/删除复用工具栏剪贴板的共享实现（useEditClipboard），编辑语义一致。
 */
export function useCanvasContextMenu() {
  const canvasStore = useCanvasStore()
  const { handleCopy, handleDelete } = useEditClipboard()
  const { saveState } = useHistory()

  const ctxMenuVisible = ref(false)
  const ctxMenuX = ref(0)
  const ctxMenuY = ref(0)
  const ctxMenuItems = ref<ContextMenuItem[]>([])

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
    // 右键菜单任何工具下都可用（原先连线模式下静默忽略，会让人以为坏了）
    canvasStore.selectElement(element.id)
    ctxMenuX.value = e.evt.clientX
    ctxMenuY.value = e.evt.clientY
    const isLocked = !!element.locked
    // 元素在数组中的下标：0 = 最底层（最先绘制），length-1 = 最顶层
    const elementIndex = canvasStore.elements.findIndex(el => el.id === element.id)
    ctxMenuItems.value = [
      {
        label: '复制',
        icon: 'CopyDocument',
        shortcut: 'Ctrl+C',
        action: () => handleCopy(),
      },
      {
        label: '存为模板',
        icon: 'Collection',
        action: () => void handleSaveAsTemplate(element),
      },
      {
        // 元素在数组中的位置即渲染 z 序：上移一层 = 与后一位交换（视觉更靠前）
        label: '上移一层',
        icon: 'Top',
        disabled: elementIndex >= canvasStore.elements.length - 1,
        action: () => {
          canvasStore.moveElementForward(element.id)
          saveState()
        },
      },
      {
        label: '下移一层',
        icon: 'Bottom',
        disabled: elementIndex <= 0,
        action: () => {
          canvasStore.moveElementBackward(element.id)
          saveState()
        },
      },
      {
        label: '删除',
        icon: 'Delete',
        shortcut: 'Del',
        danger: true,
        action: () => handleDelete(),
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
