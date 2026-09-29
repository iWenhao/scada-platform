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
import { createTagId, type TagDef, type WritePolicy } from '@/types/tag'
import { publishedKey as pubKey, parsePublishedAt } from './projectPublish'

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

  // 点表：设备.变量 的元数据档案（单位/量程/可写），随工程持久化
  const tagTable = ref<TagDef[]>([])

  // 未登记点位的写值策略：allow 放行（默认，兼容旧行为）/ warn 提示后允许 / deny 禁止
  const writePolicy = ref<WritePolicy>('allow')

  /** 草稿存储键：独立于正式工程前缀 */
  const draftKey = (name: string) => `scada_draft_${name}`
  /** 发布快照：与草稿/工作副本分离，预览默认读发布版 */
  const publishedKey = pubKey

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
      tagTable: tagTable.value,
      writePolicy: writePolicy.value,
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

    // 点表：过滤缺 deviceId/name 的坏行
    tagTable.value = Array.isArray(projectData.tagTable)
      ? projectData.tagTable
          .filter((t: any) => t && t.deviceId && t.name)
          .map((t: any) => ({
            id: t.id || createTagId(),
            deviceId: String(t.deviceId),
            name: String(t.name),
            description: t.description || undefined,
            unit: t.unit || undefined,
            dataType: t.dataType === 'string' || t.dataType === 'boolean' ? t.dataType : 'number',
            min: typeof t.min === 'number' ? t.min : undefined,
            max: typeof t.max === 'number' ? t.max : undefined,
            writable: t.writable === undefined ? undefined : !!t.writable,
            deadband: typeof t.deadband === 'number' && t.deadband > 0 ? t.deadband : undefined,
            note: t.note || undefined,
          }))
      : []

    // 旧工程没有 writePolicy 字段，回落 allow 保持原行为
    writePolicy.value =
      projectData.writePolicy === 'warn' || projectData.writePolicy === 'deny'
        ? projectData.writePolicy
        : 'allow'
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
   * 发布当前工程：把工作副本快照为发布版。
   * 发布后编辑草稿不影响预览，直到再次发布。
   */
  async function publishProject(name?: string): Promise<boolean> {
    if (name) projectName.value = name
    const data = {
      ...buildProjectData(),
      publishedAt: Date.now(),
    }
    await getStorage().set(publishedKey(projectName.value), JSON.stringify(data))
    return true
  }

  /** 取消发布（删除发布快照，预览回落到草稿） */
  async function unpublishProject(name: string): Promise<void> {
    await getStorage().remove(publishedKey(name))
  }

  /** 是否存在发布版 */
  async function hasPublished(name: string): Promise<boolean> {
    return (await getStorage().get(publishedKey(name))) !== null
  }

  /** 发布时间；无发布版返回 null */
  async function getPublishedAt(name: string): Promise<number | null> {
    return parsePublishedAt(await getStorage().get(publishedKey(name)))
  }

  /**
   * 加载发布版供预览；无发布版时回落草稿（保证运行端始终有画面可看）。
   */
  async function loadPublishedProject(name: string): Promise<boolean> {
    const raw = await getStorage().get(publishedKey(name))
    if (!raw) {
      return loadProject(name)
    }
    try {
      const projectData = JSON.parse(raw)
      projectName.value = projectData.name || name
      projectDescription.value = projectData.description || ''
      lastSaveTime.value = projectData.publishedAt || projectData.timestamp || null
      applyProjectData(projectData)
      hasUnsavedChanges.value = false
      return true
    } catch (e) {
      console.error('Failed to load published project:', e)
      return loadProject(name)
    }
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
    // 发布快照跟随重命名，避免预览找不到
    const oldPub = publishedKey(projectName.value)
    const newPub = publishedKey(trimmed)
    const pub = await storage.get(oldPub)
    if (pub !== null) {
      await storage.set(newPub, pub)
      await storage.remove(oldPub)
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
    const oldPub = publishedKey(oldName)
    const newPub = publishedKey(trimmed)
    const pub = await storage.get(oldPub)
    if (pub !== null) {
      await storage.set(newPub, pub)
      await storage.remove(oldPub)
    }
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
    await getStorage().remove(publishedKey(name))
    await getStorage().remove(draftKey(name))
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
   * 整体替换点表（对话框一次性提交）。
   * 属于工程内容变更，标记脏状态。
   */
  function setTagTable(tags: TagDef[]) {
    tagTable.value = tags
    hasUnsavedChanges.value = true
  }

  /** 设置未登记点位的写值策略（随工程保存） */
  function setWritePolicy(policy: WritePolicy) {
    writePolicy.value = policy
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
    writePolicy.value = 'allow'
    tagTable.value = []

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
    tagTable,
    writePolicy,
    setWritePolicy,
    setAlarmDefs,
    setTagTable,
    saveProject,
    loadProject,
    publishProject,
    unpublishProject,
    hasPublished,
    getPublishedAt,
    loadPublishedProject,
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
