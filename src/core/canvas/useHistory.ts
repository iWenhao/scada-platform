import { ref, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useProjectStore } from '@/stores/projectStore'

interface HistoryState {
  elements: any[]
  connections: any[]
}

// 模块级共享状态：编辑器内所有调用方共享同一份历史栈
const historyStack = ref<HistoryState[]>([])
const currentIndex = ref(-1)

// 最大历史记录数
const maxHistory = 50

// 是否已建立基线：编辑器挂载时的第一次 saveState 只是记录初始状态，
// 不能被当成用户改动，否则一进页面就显示「未保存」
let baselineEstablished = false

// 是否可以撤销
const canUndo = computed(() => currentIndex.value > 0)

// 是否可以重做
const canRedo = computed(() => currentIndex.value < historyStack.value.length - 1)

/**
 * 撤销/重做功能（单例：跨组件共享历史栈）
 */
export function useHistory() {
  const canvasStore = useCanvasStore()
  const connectionStore = useConnectionStore()

  /**
   * 序列化当前画布状态
   */
  function serializeState(): HistoryState {
    return {
      elements: JSON.parse(JSON.stringify(canvasStore.elements)),
      connections: JSON.parse(JSON.stringify(connectionStore.connections)),
    }
  }

  /**
   * 保存当前状态（内容与栈顶相同则跳过，避免空操作产生冗余记录）
   */
  function saveState() {
    const state = serializeState()
    const top = historyStack.value[currentIndex.value]
    if (top &&
        JSON.stringify(top) === JSON.stringify(state)) {
      return
    }

    // 移除当前位置之后的历史
    historyStack.value = historyStack.value.slice(0, currentIndex.value + 1)

    // 添加新状态
    historyStack.value.push(state)

    // 限制历史记录数量
    if (historyStack.value.length > maxHistory) {
      historyStack.value.shift()
    } else {
      currentIndex.value++
    }

    if (baselineEstablished) {
      useProjectStore().markDirty()
    } else {
      baselineEstablished = true
    }
  }

  /**
   * 撤销
   */
  function undo() {
    if (!canUndo.value) return

    currentIndex.value--
    restoreState(historyStack.value[currentIndex.value])
    // 撤销改变了内容，同样要提醒尚未保存回工程文件
    useProjectStore().markDirty()
  }

  /**
   * 重做
   */
  function redo() {
    if (!canRedo.value) return

    currentIndex.value++
    restoreState(historyStack.value[currentIndex.value])
    useProjectStore().markDirty()
  }

  /**
   * 恢复状态
   */
  function restoreState(state: HistoryState) {
    // 清空当前状态
    canvasStore.clearCanvas()
    connectionStore.connections = []

    // 恢复元素
    state.elements.forEach((element: any) => {
      canvasStore.addElement(element)
    })

    // 恢复连线
    state.connections.forEach((connection: any) => {
      connectionStore.connections.push(connection)
    })
  }

  /**
   * 清空历史
   */
  function clearHistory() {
    historyStack.value = []
    currentIndex.value = -1
    // 下次 saveState 重新建立基线
    baselineEstablished = false
  }

  return {
    canUndo,
    canRedo,
    saveState,
    undo,
    redo,
    clearHistory,
  }
}
