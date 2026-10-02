import { defineStore } from 'pinia'
import { ref } from 'vue'
import { defaultLayers, type Layer } from '@/types/layer'
import { createLayerId } from '@/utils/id'

export const useLayerStore = defineStore('layer', () => {
  // 图层列表
  const layers = ref<Layer[]>([...defaultLayers])
  
  // 当前激活的图层ID
  const activeLayerId = ref<string>('device')

  /**
   * 获取图层
   */
  function getLayer(id: string): Layer | undefined {
    return layers.value.find(l => l.id === id)
  }

  /**
   * 切换图层可见性
   */
  function toggleVisibility(layerId: string) {
    const layer = layers.value.find(l => l.id === layerId)
    if (layer && layer.type !== 'background') {
      layer.visible = !layer.visible
    }
  }

  /**
   * 切换图层锁定状态
   */
  function toggleLock(layerId: string) {
    const layer = layers.value.find(l => l.id === layerId)
    if (layer && layer.type !== 'background') {
      layer.locked = !layer.locked
    }
  }

  /**
   * 设置激活图层
   */
  function setActiveLayer(layerId: string) {
    activeLayerId.value = layerId
  }

  /**
   * 添加图层
   */
  function addLayer(layer: Omit<Layer, 'id' | 'order'>): Layer {
    const newLayer: Layer = {
      ...layer,
      id: createLayerId(),
      order: layers.value.length,
    }
    layers.value.push(newLayer)
    return newLayer
  }

  /**
   * 删除图层
   */
  function removeLayer(layerId: string) {
    const layer = layers.value.find(l => l.id === layerId)
    if (!layer || layer.type === 'background') {
      throw new Error('Cannot delete background layer')
    }
    layers.value = layers.value.filter(l => l.id !== layerId)
    if (activeLayerId.value === layerId) {
      activeLayerId.value = 'device'
    }
  }

  /**
   * 上移图层
   */
  function moveUp(layerId: string) {
    const index = layers.value.findIndex(l => l.id === layerId)
    if (index < layers.value.length - 1) {
      const current = layers.value[index]
      const next = layers.value[index + 1]
      const tempOrder = current.order
      current.order = next.order
      next.order = tempOrder
      layers.value.sort((a, b) => a.order - b.order)
    }
  }

  /**
   * 下移图层
   */
  function moveDown(layerId: string) {
    const index = layers.value.findIndex(l => l.id === layerId)
    if (index > 0) {
      const current = layers.value[index]
      const prev = layers.value[index - 1]
      const tempOrder = current.order
      current.order = prev.order
      prev.order = tempOrder
      layers.value.sort((a, b) => a.order - b.order)
    }
  }

  /**
   * 重命名图层
   */
  function renameLayer(layerId: string, newName: string) {
    const layer = layers.value.find(l => l.id === layerId)
    if (layer) {
      layer.name = newName
    }
  }

  /**
   * 从JSON加载（序列化统一走 projectStore.buildProjectData，这里只负责恢复）
   */
  function loadFromJSON(json: string) {
    try {
      const data = JSON.parse(json)
      layers.value = data.layers || [...defaultLayers]
      activeLayerId.value = data.activeLayerId || 'device'
      return true
    } catch (e) {
      console.error('Failed to load layers JSON:', e)
      return false
    }
  }

  return {
    layers,
    activeLayerId,
    getLayer,
    toggleVisibility,
    toggleLock,
    setActiveLayer,
    addLayer,
    removeLayer,
    moveUp,
    moveDown,
    renameLayer,
    loadFromJSON,
  }
})
