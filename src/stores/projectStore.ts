import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCanvasStore } from './canvasStore'
import { useConnectionStore } from './connectionStore'
import { useLayerStore } from './layerStore'
import { usePageStore } from './pageStore'
import { getStorage } from '@/storage'
import type { DataSourceConfig } from '@/datasource/types'
import type { AlarmDefinition } from '@/types/alarm'
import { normalizeAlarmDef } from '@/types/alarm'
import { createPageId, type ScadaPage } from '@/types/page'

export const useProjectStore = defineStore('project', () => {
  // 项目名称
  const projectName = ref<string>('未命名项目')
  
  // 项目描述
  const projectDescription = ref<string>('')
  
  // 最后保存时间
  const lastSaveTime = ref<number | null>(null)
  
  // 是否有未保存的更改
  const hasUnsavedChanges = ref<boolean>(false)

  // 数据源配置：属于工程的一部分，必须随工程一起持久化，
  // 否则保存后重开就没有数据源可用，预览只能退回 mock。
  const dataSourceConfig = ref<DataSourceConfig>({ type: 'mock', name: 'default' })

  // 独立报警定义：与元素状态规则解耦的工程级报警表，随工程持久化
  const alarmDefs = ref<AlarmDefinition[]>([])

  /** 草稿存储键：独立于正式工程前缀 */
  const draftKey = (name: string) => `scada_draft_${name}`

  /**
   * 组装完整的工程数据（保存 / 导出共用，避免两处结构漂移）
   * 多画面：pages[] 每项一张画面；同时写出顶层 canvas/connections/layers
   * 作为「当前页」兼容快照，旧版本工具链仍可读取。
   */
  function buildProjectData() {
    const pageStore = usePageStore()
    pageStore.captureActivePage()

    const active = pageStore.activePage
    return {
      version: '1.1',
      name: projectName.value,
      description: projectDescription.value,
      timestamp: Date.now(),
      pages: pageStore.pages,
      activePageId: pageStore.activePageId,
      // 兼容字段：当前编辑页（旧读者用）
      canvas: active ? JSON.stringify({
        version: '1.0',
        canvasConfig: active.canvasConfig,
        elements: active.elements,
      }) : null,
      connections: active ? JSON.stringify(active.connections) : null,
      layers: active ? JSON.stringify({ layers: active.layers }) : null,
      dataSource: dataSourceConfig.value,
      alarmDefs: alarmDefs.value,
    }
  }

  /**
   * 旧工程（单画面）包成一张「主页」
   */
  function migrateLegacyToPages(projectData: Record<string, any>): ScadaPage[] {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    const layerStore = useLayerStore()

    // 先装入旧数据再抓快照，复用各 store 的解析逻辑
    if (projectData.canvas) canvasStore.loadFromJSON(projectData.canvas)
    if (projectData.connections) connectionStore.loadFromJSON(projectData.connections)
    if (projectData.layers) layerStore.loadFromJSON(projectData.layers)

    const pageStore = usePageStore()
    return [{
      id: createPageId(),
      name: '主页',
      ...pageStore.captureWorkingSet(),
    }]
  }

  /**
   * 应用加载到的工程数据（加载 / 导入共用）
   */
  function applyProjectData(projectData: Record<string, any>) {
    const pageStore = usePageStore()

    if (Array.isArray(projectData.pages) && projectData.pages.length > 0) {
      pageStore.setPages(projectData.pages as ScadaPage[], projectData.activePageId)
    } else {
      // 旧工程：单画布结构迁移到「主页」
      const pages = migrateLegacyToPages(projectData)
      pageStore.setPages(pages)
    }

    // 旧工程没有 dataSource 字段，回落 mock 以保证向后兼容
    dataSourceConfig.value = projectData.dataSource || { type: 'mock', name: 'default' }

    // 旧工程没有 alarmDefs 字段；逐条 normalize，坏数据（如手改 JSON）不进运行时
    alarmDefs.value = Array.isArray(projectData.alarmDefs)
      ? projectData.alarmDefs.map(normalizeAlarmDef).filter((d): d is AlarmDefinition => d !== null)
      : []
  }

  /**
   * 保存项目到存储
   */
  async function saveProject(name?: string) {
    if (name) {
      projectName.value = name
    }

    const json = JSON.stringify(buildProjectData())
    await getStorage().set(`scada_project_${projectName.value}`, json)

    // 已正式落盘，自动草稿不再需要
    await clearDraft()

    lastSaveTime.value = Date.now()
    hasUnsavedChanges.value = false
    
    return true
  }

  /**
   * 从存储加载项目
   */
  async function loadProject(name: string): Promise<boolean> {
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
      
      applyProjectData(projectData)
      
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
    return JSON.stringify(buildProjectData(), null, 2)
  }

  /**
   * 从JSON文件导入项目
   */
  function importProject(json: string): boolean {
    try {
      const projectData = JSON.parse(json)
      
      projectName.value = projectData.name || '导入的项目'
      projectDescription.value = projectData.description || ''
      lastSaveTime.value = projectData.timestamp
      
      applyProjectData(projectData)
      
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
   * 自动保存草稿。用独立前缀，不会被工程列表误当成正式项目。
   */
  async function saveDraft() {
    await getStorage().set(draftKey(projectName.value), JSON.stringify(buildProjectData()))
  }

  /**
   * 当前工程是否存在草稿
   */
  async function hasDraft(): Promise<boolean> {
    return (await getStorage().get(draftKey(projectName.value))) !== null
  }

  /**
   * 从草稿恢复。恢复的内容尚未写回正式工程，所以仍然标记为未保存。
   */
  async function restoreDraft(): Promise<boolean> {
    const json = await getStorage().get(draftKey(projectName.value))
    if (!json) return false

    try {
      const projectData = JSON.parse(json)
      applyProjectData(projectData)
      lastSaveTime.value = null
      hasUnsavedChanges.value = true
      return true
    } catch (e) {
      console.error('Failed to restore draft:', e)
      return false
    }
  }

  /**
   * 丢弃草稿
   */
  async function clearDraft() {
    await getStorage().remove(draftKey(projectName.value))
  }

  /**
   * 设置数据源配置。改数据源属于改动工程本身，要标记脏状态。
   */
  function setDataSource(config: DataSourceConfig) {
    dataSourceConfig.value = config
    hasUnsavedChanges.value = true
  }

  /**
   * 保存报警定义（整体替换，配置对话框一次性提交）。
   * 属于工程内容变更，标记脏状态。
   */
  function setAlarmDefs(defs: AlarmDefinition[]) {
    alarmDefs.value = defs
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
    dataSourceConfig.value = { type: 'mock', name: 'default' }
    alarmDefs.value = []

    // 新建项目必须连同画布内容一起清空：残留的旧元素/连线会让人以为还在编辑上一个工程，
    // 一保存就把原工程覆盖掉了。多画面下重置为单张「主页」。
    const pageStore = usePageStore()
    pageStore.reset()
  }

  return {
    projectName,
    projectDescription,
    lastSaveTime,
    hasUnsavedChanges,
    dataSourceConfig,
    alarmDefs,
    setAlarmDefs,
    saveProject,
    loadProject,
    exportProject,
    importProject,
    renameProject,
    renameSavedProject,
    getSavedProjects,
    deleteProject,
    setDataSource,
    saveDraft,
    hasDraft,
    restoreDraft,
    clearDraft,
    markDirty,
    resetProject,
  }
})
