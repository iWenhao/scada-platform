import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { defaultCanvasConfig, type CanvasConfig } from '@/types/canvas'
import type { ComponentInstance } from '@/types/scada'

export const useCanvasStore = defineStore('canvas', () => {
  // 画布配置
  const canvasConfig = ref<CanvasConfig>({ ...defaultCanvasConfig })
  
  // 画布元素
  const elements = ref<ComponentInstance[]>([])
  
  // 选中的元素ID
  const selectedId = ref<string | null>(null)
  
  // 缩放比例
  const zoom = ref(1)
  
  // 偏移量
  const offset = ref({ x: 0, y: 0 })
  
  // 画布尺寸（响应式）
  const canvasSize = computed(() => ({
    width: canvasConfig.value.width,
    height: canvasConfig.value.height,
  }))
  
  // 选中的元素
  const selectedElement = computed(() => 
    elements.value.find(el => el.id === selectedId.value)
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
    if (selectedId.value === id) {
      selectedId.value = null
    }
  }
  
  // 批量删除元素
  function removeElements(ids: string[]) {
    elements.value = elements.value.filter(el => !ids.includes(el.id))
    if (selectedId.value && ids.includes(selectedId.value)) {
      selectedId.value = null
    }
  }
  
  // 选择元素
  function selectElement(id: string | null) {
    selectedId.value = id
  }
  
  // 清除选择
  function clearSelection() {
    selectedId.value = null
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
  
  // 序列化为JSON
  function toJSON() {
    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      canvasConfig: canvasConfig.value,
      elements: elements.value,
      zoom: zoom.value,
      offset: offset.value,
    }, null, 2)
  }
  
  // 从JSON加载
  function loadFromJSON(json: string) {
    try {
      const data = JSON.parse(json)
      canvasConfig.value = data.canvasConfig || { ...defaultCanvasConfig }
      elements.value = data.elements || []
      zoom.value = data.zoom || 1
      offset.value = data.offset || { x: 0, y: 0 }
      selectedId.value = null
      return true
    } catch (e) {
      console.error('Failed to load canvas JSON:', e)
      return false
    }
  }
  
  // 清空画布
  function clearCanvas() {
    elements.value = []
    selectedId.value = null
  }
  
  return {
    canvasConfig,
    elements,
    selectedId,
    zoom,
    offset,
    canvasSize,
    selectedElement,
    updateCanvasConfig,
    resetCanvasConfig,
    addElement,
    updateElement,
    removeElement,
    removeElements,
    selectElement,
    clearSelection,
    setZoom,
    setOffset,
    toJSON,
    loadFromJSON,
    clearCanvas,
  }
})
