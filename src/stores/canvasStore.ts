import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { defaultCanvasConfig, type CanvasConfig } from '@/types/canvas'
import type { ComponentInstance } from '@/types/scada'

export const useCanvasStore = defineStore('canvas', () => {
  // 画布配置
  const canvasConfig = ref<CanvasConfig>({ ...defaultCanvasConfig })
  
  // 画布元素
  const elements = ref<ComponentInstance[]>([])

  // 选中的元素ID列表（支持多选，第一个为主选中元素）
  const selectedIds = ref<string[]>([])

  // 复制粘贴剪贴板（跨组件共享）
  const clipboard = ref<ComponentInstance[]>([])

  // 缩放比例
  const zoom = ref(1)

  // 偏移量
  const offset = ref({ x: 0, y: 0 })

  // 画布尺寸（响应式）
  const canvasSize = computed(() => ({
    width: canvasConfig.value.width,
    height: canvasConfig.value.height,
  }))

  // 主选中元素（多选时为第一个，属性面板展示用）
  const selectedElement = computed(() =>
    elements.value.find(el => selectedIds.value.includes(el.id))
  )

  // 全部选中元素
  const selectedElements = computed(() =>
    elements.value.filter(el => selectedIds.value.includes(el.id))
  )
  
  // 更新画布配置
  function updateCanvasConfig(config: Partial<CanvasConfig>) {
    Object.assign(canvasConfig.value, config)
  }
  
  // 重置画布配置
  function resetCanvasConfig() {
    canvasConfig.value = { ...defaultCanvasConfig }
  }
  
  // 添加元素
  function addElement(element: ComponentInstance) {
    elements.value.push(element)
  }
  
  // 更新元素
  function updateElement(id: string, updates: Partial<ComponentInstance>) {
    const index = elements.value.findIndex(el => el.id === id)
    if (index !== -1) {
      elements.value[index] = { ...elements.value[index], ...updates }
    }
  }
  
  // 删除元素
  function removeElement(id: string) {
    elements.value = elements.value.filter(el => el.id !== id)
    selectedIds.value = selectedIds.value.filter(sid => sid !== id)
  }

  // 批量删除元素
  function removeElements(ids: string[]) {
    elements.value = elements.value.filter(el => !ids.includes(el.id))
    selectedIds.value = selectedIds.value.filter(sid => !ids.includes(sid))
  }

  // 元素上移一层（朝顶层，视觉遮挡更靠前）：与数组中后一位交换；已在顶层则不变
  function moveElementForward(id: string) {
    const list = elements.value
    const idx = list.findIndex(el => el.id === id)
    if (idx < 0 || idx >= list.length - 1) return
    const [item] = list.splice(idx, 1)
    list.splice(idx + 1, 0, item)
  }

  // 元素下移一层（朝底层）：与数组中前一位交换；已在底层则不变
  function moveElementBackward(id: string) {
    const list = elements.value
    const idx = list.findIndex(el => el.id === id)
    if (idx <= 0) return
    const [item] = list.splice(idx, 1)
    list.splice(idx - 1, 0, item)
  }

  // 选择元素（单选；传 null 清空选择）
  function selectElement(id: string | null) {
    selectedIds.value = id ? [id] : []
  }

  // 设置多选
  function selectMany(ids: string[]) {
    selectedIds.value = [...ids]
  }

  // 切换元素选中状态（Shift+点击）
  function toggleElement(id: string) {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter(sid => sid !== id)
      : [...selectedIds.value, id]
  }

  // 清除选择
  function clearSelection() {
    selectedIds.value = []
  }
  
  // 设置缩放
  function setZoom(newZoom: number) {
    const { minZoom, maxZoom } = canvasConfig.value
    zoom.value = Math.max(minZoom, Math.min(maxZoom, newZoom))
  }
  
  // 设置偏移
  function setOffset(x: number, y: number) {
    offset.value = { x, y }
  }
  
  // 从JSON加载（序列化统一走 projectStore.buildProjectData，这里只负责恢复）
  function loadFromJSON(json: string) {
    try {
      const data = JSON.parse(json)
      canvasConfig.value = { ...defaultCanvasConfig, ...data.canvasConfig }
      elements.value = data.elements || []
      zoom.value = data.zoom || 1
      offset.value = data.offset || { x: 0, y: 0 }
      selectedIds.value = []
      return true
    } catch (e) {
      console.error('Failed to load canvas JSON:', e)
      return false
    }
  }
  
  // 清空画布
  function clearCanvas() {
    elements.value = []
    selectedIds.value = []
  }

  return {
    canvasConfig,
    elements,
    selectedIds,
    clipboard,
    selectedId: computed(() => selectedIds.value[0] ?? null),
    zoom,
    offset,
    canvasSize,
    selectedElement,
    selectedElements,
    updateCanvasConfig,
    resetCanvasConfig,
    addElement,
    updateElement,
    moveElementForward,
    moveElementBackward,
    removeElement,
    removeElements,
    selectElement,
    selectMany,
    toggleElement,
    clearSelection,
    setZoom,
    setOffset,
    loadFromJSON,
    clearCanvas,
  }
})
