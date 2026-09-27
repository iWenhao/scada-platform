import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCanvasStore } from './canvasStore'
import { useConnectionStore } from './connectionStore'
import { useLayerStore } from './layerStore'
import { getStorage } from '@/storage'

export const useProjectStore = defineStore('project', () => {
  // 项目名称
  const projectName = ref<string>('未命名项目')
  
  // 项目描述
  const projectDescription = ref<string>('')
  
  // 最后保存时间
  const lastSaveTime = ref<number | null>(null)
  
  // 是否有未保存的更改
  const hasUnsavedChanges = ref<boolean>(false)

  /**
   * 保存项目到localStorage
   */
  function saveProject(name?: string) {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    const layerStore = useLayerStore()
    
    if (name) {
      projectName.value = name
    }
    
    const projectData = {
      version: '1.0',
      name: projectName.value,
      description: projectDescription.value,
      timestamp: Date.now(),
      canvas: canvasStore.toJSON(),
      connections: connectionStore.toJSON(),
      layers: layerStore.toJSON(),
    }
    
    const json = JSON.stringify(projectData)
    getStorage().set(`scada_project_${projectName.value}`, json)
    
    lastSaveTime.value = Date.now()
    hasUnsavedChanges.value = false
    
    return true
  }

  /**
   * 从localStorage加载项目
   */
  function loadProject(name: string): boolean {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    const layerStore = useLayerStore()
    
    const json = getStorage().get(`scada_project_${name}`)
    if (!json) {
      console.error(`Project not found: ${name}`)
      return false
    }
    
    try {
      const projectData = JSON.parse(json)
      
      projectName.value = projectData.name || name
      projectDescription.value = projectData.description || ''
      lastSaveTime.value = projectData.timestamp
      
      canvasStore.loadFromJSON(projectData.canvas)
      connectionStore.loadFromJSON(projectData.connections)
      layerStore.loadFromJSON(projectData.layers)
      
      hasUnsavedChanges.value = false
      
      return true
    } catch (e) {
      console.error('Failed to load project:', e)
      return false
    }
  }

  /**
   * 导出项目为JSON文件
   */
  function exportProject(): string {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    const layerStore = useLayerStore()
    
    const projectData = {
      version: '1.0',
      name: projectName.value,
      description: projectDescription.value,
      timestamp: Date.now(),
      canvas: canvasStore.toJSON(),
      connections: connectionStore.toJSON(),
      layers: layerStore.toJSON(),
    }
    
    return JSON.stringify(projectData, null, 2)
  }

  /**
   * 从JSON文件导入项目
   */
  function importProject(json: string): boolean {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    const layerStore = useLayerStore()
    
    try {
      const projectData = JSON.parse(json)
      
      projectName.value = projectData.name || '导入的项目'
      projectDescription.value = projectData.description || ''
      lastSaveTime.value = projectData.timestamp
      
      canvasStore.loadFromJSON(projectData.canvas)
      connectionStore.loadFromJSON(projectData.connections)
      layerStore.loadFromJSON(projectData.layers)
      
      hasUnsavedChanges.value = false
      
      return true
    } catch (e) {
      console.error('Failed to import project:', e)
      return false
    }
  }

  /**
   * 重命名当前项目：未保存过的仅改名称并标记未保存；
   * 已保存的迁移存储键到新名称。重名或空名返回 false。
   */
  function renameProject(newName: string): boolean {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === projectName.value) return false

    const storage = getStorage()
    // 与已有项目重名时拒绝，避免覆盖别人的数据
    if (storage.get(`scada_project_${trimmed}`) !== null) return false

    const oldKey = `scada_project_${projectName.value}`
    const wasSaved = storage.get(oldKey) !== null
    if (wasSaved) {
      storage.set(`scada_project_${trimmed}`, storage.get(oldKey)!)
      storage.remove(oldKey)
    }
    projectName.value = trimmed
    hasUnsavedChanges.value = !wasSaved
    return true
  }

  /**
   * 重命名任意一个已保存的项目（首页列表用）。
   * 若它恰好是当前打开的项目，同步当前名称。重名/不存在返回 false。
   */
  function renameSavedProject(oldName: string, newName: string): boolean {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return false

    const storage = getStorage()
    const oldKey = `scada_project_${oldName}`
    const newKey = `scada_project_${trimmed}`
    if (storage.get(oldKey) === null || storage.get(newKey) !== null) return false

    storage.set(newKey, storage.get(oldKey)!)
    storage.remove(oldKey)
    if (projectName.value === oldName) {
      projectName.value = trimmed
    }
    return true
  }

  /**
   * 获取已保存的项目列表
   */
  function getSavedProjects(): string[] {
    return getStorage()
      .keys()
      .filter(key => key.startsWith('scada_project_'))
      .map(key => key.replace('scada_project_', ''))
  }

  /**
   * 删除项目
   */
  function deleteProject(name: string) {
    getStorage().remove(`scada_project_${name}`)
  }

  /**
   * 标记有未保存的更改
   */
  function markDirty() {
    hasUnsavedChanges.value = true
  }

  /**
   * 重置项目
   */
  function resetProject() {
    projectName.value = '未命名项目'
    projectDescription.value = ''
    lastSaveTime.value = null
    hasUnsavedChanges.value = false
  }

  return {
    projectName,
    projectDescription,
    lastSaveTime,
    hasUnsavedChanges,
    saveProject,
    loadProject,
    exportProject,
    importProject,
    renameProject,
    renameSavedProject,
    getSavedProjects,
    deleteProject,
    markDirty,
    resetProject,
  }
})
