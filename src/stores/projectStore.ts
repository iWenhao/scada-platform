import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCanvasStore } from './canvasStore'
import { useConnectionStore } from './connectionStore'
import { useLayerStore } from './layerStore'

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
    localStorage.setItem(`scada_project_${projectName.value}`, json)
    
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
    
    const json = localStorage.getItem(`scada_project_${name}`)
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
   * 获取已保存的项目列表
   */
  function getSavedProjects(): string[] {
    const projects: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('scada_project_')) {
        projects.push(key.replace('scada_project_', ''))
      }
    }
    return projects
  }

  /**
   * 删除项目
   */
  function deleteProject(name: string) {
    localStorage.removeItem(`scada_project_${name}`)
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
    getSavedProjects,
    deleteProject,
    markDirty,
    resetProject,
  }
})
