import type { Ref } from 'vue'
import { getStorage } from '@/storage'
import {
  isProjectTaken,
  projectKey,
  draftKey,
  publishedKey,
  removePublishedSnapshot,
  hasPublishedSnapshot,
  getPublishedSnapshotAt,
} from './projectStorage'

/**
 * 工程持久化动作：正式保存 / 发布 / 加载 / 导入 / 自动草稿。
 *
 * 从 projectStore.ts 拆出来是因为这一组已经让 store 越过 400 行门槛，
 * 而它们本质上都是「组装好的工程数据 ↔ 存储」的往返，与画布状态无关。
 * 依赖通过 ctx 注入（都是 ref，传引用共享同一份状态），不反向 import store，避免循环依赖。
 */
export interface ProjectPersistenceState {
  projectName: Ref<string>
  lastSaveTime: Ref<number | null>
  hasUnsavedChanges: Ref<boolean>
  /**
   * 本会话已「认领」的工程名：打开过或保存/发布成功后置位。
   * 保存查重靠它区分「覆盖自己的旧版本」（放行）与「新建撞名」（拒绝）。
   */
  ownedProjectName: Ref<string | null>
}

export function createProjectPersistence(ctx: {
  state: ProjectPersistenceState
  /** 组装完整工程数据（projectStore 内定义，需要读画布与各项工程级配置） */
  buildProjectData: () => Record<string, any>
  /** 应用工程数据到 store（多画面迁移与附属配置归一化都在这里面） */
  applyProjectData: (projectData: Record<string, any>) => void
  /** 应用数据并复位脏状态（加载/导入三条路径共用） */
  applyLoadedProject: (
    projectData: Record<string, any>,
    fallbackName: string,
    savedAt: number | null,
  ) => void
}) {
  const { state } = ctx

  /**
   * 保存项目到存储。
   *
   * 撞名保护：目标工程名已被占用、且不是本会话认领的项目时拒绝保存（返回 false，
   * 不写存储）。没有这道 guard，新建项目用默认名「未命名项目」一保存就会静默
   * 覆盖同名工程——用户看到的不是报错，是自己的旧工程凭空消失。
   * 存储故障仍走抛异常路径，与既有行为一致。
   */
  async function saveProject(name?: string): Promise<boolean> {
    const target = name || state.projectName.value

    if (target !== state.ownedProjectName.value && (await isProjectTaken(target))) {
      return false
    }

    // 通过检查再改名：被拒绝时不动 projectName，编辑器留在原状态
    state.projectName.value = target

    const json = JSON.stringify(ctx.buildProjectData())
    await getStorage().set(projectKey(target), json)

    // 已正式落盘，自动草稿不再需要。但清理失败不能算保存失败：项目数据已经写好了，
    // 这里抛出去会让「保存」报未处理异常、「预览」直接不跳转，用户以为没存上。
    // 草稿残留的代价只是下次进来多问一次恢复。
    try {
      await clearDraft()
    } catch (e) {
      console.warn('草稿清理失败（项目已保存）:', e)
    }

    state.lastSaveTime.value = Date.now()
    state.hasUnsavedChanges.value = false
    // 保存成功即认领该工程名：后续反复保存是覆盖自己的旧版本，放行
    state.ownedProjectName.value = target

    return true
  }

  /**
   * 发布当前工程：把工作副本快照为发布版。
   * 发布后编辑草稿不影响预览，直到再次发布。
   * 与 saveProject 同样做撞名保护：不允许把别人的工程覆盖成自己的发布版。
   */
  async function publishProject(name?: string): Promise<boolean> {
    const target = name || state.projectName.value

    if (target !== state.ownedProjectName.value && (await isProjectTaken(target))) {
      return false
    }

    state.projectName.value = target
    const data = {
      ...ctx.buildProjectData(),
      publishedAt: Date.now(),
    }
    await getStorage().set(publishedKey(target), JSON.stringify(data))
    state.ownedProjectName.value = target
    return true
  }

  // 取消发布 / 查询发布版：纯存储操作，直接复用 projectStorage 的实现（对外名保持不变）
  const unpublishProject = removePublishedSnapshot
  const hasPublished = hasPublishedSnapshot
  const getPublishedAt = getPublishedSnapshotAt

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
      ctx.applyLoadedProject(
        projectData,
        name,
        projectData.publishedAt || projectData.timestamp || null,
      )
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
    const json = await getStorage().get(projectKey(name))
    if (!json) {
      console.error(`Project not found: ${name}`)
      return false
    }

    try {
      const projectData = JSON.parse(json)
      ctx.applyLoadedProject(projectData, name, projectData.timestamp)
      // 打开成功即认领：之后保存允许覆盖这个工程自己的旧版本
      state.ownedProjectName.value = name
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
    return JSON.stringify(ctx.buildProjectData(), null, 2)
  }

  /**
   * 从JSON文件导入项目
   */
  function importProject(json: string): boolean {
    try {
      const projectData = JSON.parse(json)
      ctx.applyLoadedProject(projectData, '导入的项目', projectData.timestamp)
      return true
    } catch (e) {
      console.error('Failed to import project:', e)
      return false
    }
  }

  /**
   * 自动保存草稿。用独立前缀，不会被工程列表误当成正式项目。
   */
  async function saveDraft() {
    await getStorage().set(draftKey(state.projectName.value), JSON.stringify(ctx.buildProjectData()))
  }

  /**
   * 当前工程是否存在草稿
   */
  async function hasDraft(): Promise<boolean> {
    return (await getStorage().get(draftKey(state.projectName.value))) !== null
  }

  /**
   * 从草稿恢复。恢复的内容尚未写回正式工程，所以仍然标记为未保存。
   */
  async function restoreDraft(): Promise<boolean> {
    const json = await getStorage().get(draftKey(state.projectName.value))
    if (!json) return false

    try {
      const projectData = JSON.parse(json)
      ctx.applyProjectData(projectData)
      state.lastSaveTime.value = null
      state.hasUnsavedChanges.value = true
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
    await getStorage().remove(draftKey(state.projectName.value))
  }

  return {
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
  }
}
