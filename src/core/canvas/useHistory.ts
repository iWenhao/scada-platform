import { ref, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useProjectStore } from '@/stores/projectStore'

interface HistoryState {
  elements: any[]
  connections: any[]
  /**
   * 与内容对应的序列化串，只用于「与栈顶比内容是否相同」。
   * 存下来是为了避免每次保存都把栈顶再 stringify 一遍——原来一次 saveState
   * 要跑两轮全量序列化（栈顶一次、新状态一次），元素上千时这一笔不便宜。
   */
  json: string
}

// 模块级共享状态：编辑器内所有调用方共享同一份历史栈
const historyStack = ref<HistoryState[]>([])
const currentIndex = ref(-1)

// 最大历史记录数
const maxHistory = 50

// 是否已建立基线：编辑器挂载时的第一次 saveState 只是记录初始状态，
// 不能被当成用户改动，否则一进页面就显示「未保存」
let baselineEstablished = false

/**
 * 深拷贝。元素与连线都是纯数据（无函数、无 Date/Map 等），走 JSON 一轮即可。
 * 存栈与出栈都必须过这一层：store 侧存在就地改写（connectionStore 直接赋 `conn.points`、
 * pageStore 直接 `delete el.navigateTo`），若历史与 store 共享同一批对象引用，
 * 后续编辑会穿透回栈里已存的状态，撤销拿到的是被改过的内容。
 */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

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
    const state = {
      elements: deepClone(canvasStore.elements),
      connections: deepClone(connectionStore.connections),
    }
    return { ...state, json: JSON.stringify(state) }
  }

  /**
   * 保存当前状态（内容与栈顶相同则跳过，避免空操作产生冗余记录）
   */
  function saveState() {
    const state = serializeState()
    const top = historyStack.value[currentIndex.value]
    if (top && top.json === state.json) {
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

    // 恢复元素（克隆：栈里的快照对象要原样留着供二次撤销/重做使用）
    state.elements.forEach((element: any) => {
      canvasStore.addElement(deepClone(element))
    })

    // 恢复连线
    state.connections.forEach((connection: any) => {
      connectionStore.connections.push(deepClone(connection))
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

  /**
   * 编辑会话入口：丢弃上一个会话的撤销栈后，用当前内容重新建立基线。
   *
   * 不能只 saveState()：baselineEstablished 是模块级的，跨路由不会复位。
   * 新建工程时栈顶还是上一个工程的内容，内容比对不同会直接 markDirty，
   * 表现为「刚点新建项目就显示未保存」；撤销还会把上一个工程的元素倒回新工程。
   */
  function startSession() {
    clearHistory()
    saveState()
  }

  return {
    canUndo,
    canRedo,
    saveState,
    undo,
    redo,
    clearHistory,
    startSession,
  }
}
