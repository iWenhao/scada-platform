import { onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useUiStore } from '@/stores/uiStore'
import { useHistory } from '@/core/canvas/useHistory'

interface EditCommands {
  handleCopy: () => void
  handlePaste: () => void
  handleDelete: () => void
}

interface ProjectCommands {
  handleSave: () => void | Promise<void>
}

/** 工具栏键盘快捷键（输入框聚焦时不拦截） */
export function useToolbarShortcuts(edit: EditCommands, project: ProjectCommands) {
  const canvasStore = useCanvasStore()
  const connectionStore = useConnectionStore()
  const uiStore = useUiStore()
  const { undo, redo } = useHistory()

  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    )) {
      return
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault()
        undo()
      } else if (e.key === 'y') {
        e.preventDefault()
        redo()
      } else if (e.key === 's') {
        e.preventDefault()
        void project.handleSave()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        edit.handleCopy()
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        edit.handlePaste()
      }
      return
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      edit.handleDelete()
    } else if (e.key === 'Escape') {
      canvasStore.clearSelection()
      connectionStore.selectConnection(null)
    } else if (e.key === 'v' || e.key === 'V') {
      uiStore.setActiveTool('select')
    } else if (e.key === 'l' || e.key === 'L') {
      uiStore.setActiveTool('connect')
    } else if (e.key === 'h' || e.key === 'H') {
      uiStore.setActiveTool('hand')
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
