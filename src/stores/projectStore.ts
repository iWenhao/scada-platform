import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePageStore } from './pageStore'
import type { DataSourceConfig } from '@/datasource/types'
import type { AlarmDefinition } from '@/types/alarm'
import type { ScadaPage } from '@/types/page'
import type { TagDef, WritePolicy } from '@/types/tag'
import type { ViewMode } from '@/types/scada'
import { migrateLegacyToPages, normalizeProjectExtras } from './projectLoad'
import {
  isProjectTaken,
  renameProjectKeys,
  listSavedProjects,
  getProjectSummaries,
  deleteProjectKeys,
} from './projectStorage'
import { createProjectPersistence } from './projectPersistence'

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
   * 本会话已「认领」的工程名：loadProject 打开过、或 saveProject/publishProject
   * 成功后置位；resetProject / 导入时清除。保存查重（projectPersistence 的
   * saveProject）靠它区分「覆盖自己的旧版本」与「新建撞名」。
   */
  const ownedProjectName = ref<string | null>(null)

  // 数据源配置：属于工程的一部分，必须随工程一起持久化，
  // 否则保存后重开就没有数据源可用，预览只能退回 mock。
  const dataSourceConfig = ref<DataSourceConfig>({ type: 'mock', name: 'default' })

  // 独立报警定义：与元素状态规则解耦的工程级报警表，随工程持久化
  const alarmDefs = ref<AlarmDefinition[]>([])

  // 点表：设备.变量 的元数据档案（单位/量程/可写），随工程持久化
  const tagTable = ref<TagDef[]>([])

  // 未登记点位的写值策略：allow 放行（默认，兼容旧行为）/ warn 提示后允许 / deny 禁止
  const writePolicy = ref<WritePolicy>('allow')

  /**
   * 画布元素渲染风格（2d 平面 / 25d 立体感）。
   *
   * 属于工程级显示设置，随工程持久化——「编辑页确定以 2.5D 展示」这个意图必须
   * 跟着工程走到运行端，否则刷新/分享出去的预览页会丢失展示风格。运行端只读。
   */
  const viewMode = ref<ViewMode>('2d')

  /** 存储键命名与键级操作集中在 projectStorage.ts（便于独立单测） */

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
      viewMode: viewMode.value,
    }
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

    // 附属配置（数据源/报警/点表/写值策略）归一化在 projectLoad.ts
    const extras = normalizeProjectExtras(projectData)
    dataSourceConfig.value = extras.dataSource
    alarmDefs.value = extras.alarmDefs
    tagTable.value = extras.tagTable
    writePolicy.value = extras.writePolicy
    viewMode.value = extras.viewMode
  }

  /** 应用已解析的工程数据并复位脏状态（加载草稿/发布版/导入三条路径共用） */
  function applyLoadedProject(
    projectData: Record<string, any>,
    fallbackName: string,
    savedAt: number | null,
  ) {
    projectName.value = projectData.name || fallbackName
    projectDescription.value = projectData.description || ''
    lastSaveTime.value = savedAt
    applyProjectData(projectData)
    hasUnsavedChanges.value = false
  }

  /**
   * 编辑会话现场快照 / 还原。
   *
   * 为什么要这一对：预览页在同一标签页里被路由进来，Pinia store 不会重建，
   * 而它要把「发布版」整表灌进 pageStore（setPages 是替换不是合并）。编辑器里新增但尚未
   * 再保存的画面、以及未保存标记，都会在这一步被旧快照顶掉——用户看到的症状是
   * 「加了画面 2/画面 3，去预览再回来只剩主页」。预览页卸载时还原即可。
   * 快照走深拷贝：applyProjectData 会改写 store，不能和还原用的数据共享引用。
   */
  function snapshotEditorSession() {
    return {
      projectData: JSON.parse(JSON.stringify(buildProjectData())) as Record<string, any>,
      projectName: projectName.value,
      projectDescription: projectDescription.value,
      lastSaveTime: lastSaveTime.value,
      hasUnsavedChanges: hasUnsavedChanges.value,
      ownedProjectName: ownedProjectName.value,
    }
  }

  /** 还原现场：先回填名称与脏标记，再整表装回画面与工程级配置 */
  function restoreEditorSession(snapshot: ReturnType<typeof snapshotEditorSession>) {
    projectName.value = snapshot.projectName
    projectDescription.value = snapshot.projectDescription
    applyProjectData(snapshot.projectData)
    lastSaveTime.value = snapshot.lastSaveTime
    hasUnsavedChanges.value = snapshot.hasUnsavedChanges
    // 认领标志也要还原：否则预览页往返后「自己的工程」会被当成新建工程拒存
    ownedProjectName.value = snapshot.ownedProjectName
  }

  // 正式保存 / 发布 / 加载 / 导入 / 自动草稿：都只是「工程数据 ↔ 存储」的往返，
  // 拆到 projectPersistence.ts，靠注入的 state 与三个数据动作拿到所需依赖
  const persistence = createProjectPersistence({
    state: { projectName, lastSaveTime, hasUnsavedChanges, ownedProjectName },
    buildProjectData,
    applyProjectData,
    applyLoadedProject,
  })
  const {
    saveProject,
    publishProject,
    unpublishProject,
    hasPublished,
    getPublishedAt,
    loadPublishedProject,
    loadProject,
    exportProject,
    importProject,
    saveDraft,
    hasDraft,
    restoreDraft,
    clearDraft,
  } = persistence

  /**
   * 重命名当前项目：未保存过的仅改名称并标记未保存；
   * 已保存的迁移存储键到新名称。重名或空名返回 false。
   */
  async function renameProject(newName: string): Promise<boolean> {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === projectName.value) return false

    // 与已有项目重名时拒绝，避免覆盖别人的数据
    if (await isProjectTaken(trimmed)) return false

    // 已保存的迁移存储键（工作副本 + 发布快照）；未保存过的只改名称
    const wasSaved = await isProjectTaken(projectName.value)
    if (wasSaved) await renameProjectKeys(projectName.value, trimmed)

    projectName.value = trimmed
    // 认领标志跟着改名：键已迁到新名，之后保存是覆盖自己的工程，不能当成撞名拒掉
    ownedProjectName.value = trimmed
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

    // 源不存在/目标重名都在键层拒绝，拒绝时不产生任何迁移
    if (!(await renameProjectKeys(oldName, trimmed))) return false
    if (projectName.value === oldName) {
      projectName.value = trimmed
    }
    // 被改名的恰好是本会话认领的工程时，认领标志同步迁移
    if (ownedProjectName.value === oldName) {
      ownedProjectName.value = trimmed
    }
    return true
  }

  // 工程列表与删除：纯键级操作，直接复用 projectStorage 的实现（对外名保持不变）
  const getSavedProjects = listSavedProjects
  const getProjectList = getProjectSummaries
  const deleteProject = deleteProjectKeys

  /**
   * 标记有未保存的更改
   */
  function markDirty() {
    hasUnsavedChanges.value = true
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
   * 设置画布渲染风格（编辑器侧唯一的切换入口）。
   * 属于工程内容变更，标记脏状态——否则改了风格不保存，运行端读到的仍是旧的。
   */
  function setViewMode(mode: ViewMode) {
    if (viewMode.value === mode) return
    viewMode.value = mode
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
    // 新建项目 = 放弃对任何工程名的认领：此后保存撞名必须被拒，不能覆盖别人的工程
    ownedProjectName.value = null
    dataSourceConfig.value = { type: 'mock', name: 'default' }
    alarmDefs.value = []
    writePolicy.value = 'allow'
    tagTable.value = []
    viewMode.value = '2d'

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
    viewMode,
    setWritePolicy,
    setViewMode,
    setAlarmDefs,
    setTagTable,
    snapshotEditorSession,
    restoreEditorSession,
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
    getProjectList,
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
