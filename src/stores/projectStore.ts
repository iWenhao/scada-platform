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
   * 保存项目到存储
   */
  async function saveProject(name?: string) {
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
    await getStorage().set(`scada_project_${projectName.value}`, json)
    
    lastSaveTime.value = Date.now()
    hasUnsavedChanges.value = false
    
    return true
  }

  /**
   * 从存储加载项目
   */
  async function loadProject(name: string): Promise<boolean> {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    const layerStore = useLayerStore()
    
    const json = await getStorage().get(`scada_project_${name}`)
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
  async function renameProject(newName: string): Promise<boolean> {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === projectName.value) return false

    const storage = getStorage()
    // 与已有项目重名时拒绝，避免覆盖别人的数据
    if ((await storage.get(`scada_project_${trimmed}`)) !== null) return false

    const oldKey = `scada_project_${projectName.value}`
    const wasSaved = (await storage.get(oldKey)) !== null
    if (wasSaved) {
      await storage.set(`scada_project_${trimmed}`, (await storage.get(oldKey))!)
      await storage.remove(oldKey)
    }
    projectName.value = trimmed
    hasUnsavedChanges.value = !wasSaved
    return true
  }

  /**
   * 重命名任意一个已保存的项目（首页列表用）。
   * 若它恰好是当前打开的项目，同步当前名称。重名/不存在返回 false。
   */
  async function renameSavedProject(oldName: string, newName: string): Promise<boolean> {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return false

    const storage = getStorage()
    const oldKey = `scada_project_${oldName}`
    const newKey = `scada_project_${trimmed}`
    if ((await storage.get(oldKey)) === null || (await storage.get(newKey)) !== null) return false

    await storage.set(newKey, (await storage.get(oldKey))!)
    await storage.remove(oldKey)
    if (projectName.value === oldName) {
      projectName.value = trimmed
    }
    return true
  }

  /**
   * 获取已保存的项目列表
   */
  async function getSavedProjects(): Promise<string[]> {
    const keys = await getStorage().keys()
    return keys
      .filter(key => key.startsWith('scada_project_'))
      .map(key => key.replace('scada_project_', ''))
  }

  /**
   * 删除项目
   */
  async function deleteProject(name: string) {
    await getStorage().remove(`scada_project_${name}`)
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
