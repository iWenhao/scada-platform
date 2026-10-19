/**
 * 工程存储键与键级操作（与 Pinia 状态无关的纯存储层）。
 * 从 projectStore 拆出：store 只负责状态与组装，存储键的命名/迁移/清理集中在这里，
 * 便于独立单测而不必挂起整个 store。
 */
import { getStorage, type ProjectQuery, type ProjectSummary, type ProjectIndexPage } from '@/storage'
import { thumbKey } from '@/core/canvas/thumbnail'
import { publishedKey as pubKey, parsePublishedAt } from './projectPublish'

/** 工作副本存储键 */
export const projectKey = (name: string) => `scada_project_${name}`

/** 自动草稿键：独立前缀，不会被工程列表误当成正式项目 */
export const draftKey = (name: string) => `scada_draft_${name}`

/** 发布快照键（与草稿/工作副本分离，预览默认读发布版） */
export const publishedKey = pubKey

/** 工程名是否已被占用（存在工作副本键） */
export async function isProjectTaken(name: string): Promise<boolean> {
  return (await getStorage().get(projectKey(name))) !== null
}

/**
 * 迁移一个工程名的存储键（工作副本 + 发布快照）到新名称。
 * oldName 不存在或 newName 已占用时返回 false，保证不覆盖别人的数据。
 * 草稿不随迁：草稿属于编辑过程，重命名已有项目后旧草稿自然失效。
 */
export async function renameProjectKeys(oldName: string, newName: string): Promise<boolean> {
  const storage = getStorage()
  const oldKey = projectKey(oldName)
  const newKey = projectKey(newName)
  if ((await storage.get(oldKey)) === null || (await storage.get(newKey)) !== null) return false

  await storage.set(newKey, (await storage.get(oldKey))!)
  await storage.remove(oldKey)
  const oldPub = publishedKey(oldName)
  const pub = await storage.get(oldPub)
  if (pub !== null) {
    await storage.set(publishedKey(newName), pub)
    await storage.remove(oldPub)
  }
  return true
}

/** 已保存工程列表（按工作副本键） */
export async function listSavedProjects(): Promise<string[]> {
  const keys = await getStorage().keys()
  return keys
    .filter(key => key.startsWith('scada_project_'))
    .map(key => key.replace('scada_project_', ''))
}

/**
 * 工程列表分页摘要：首页「最近项目」的数据源。
 * 远程存储走分页/搜索/统计都在服务端算好的索引接口（1 个请求/页）；本地/内存模式没有该能力，
 * 回落到 keys()+get() 逐条拼出全量后本地做同样的筛选/排序/切片——那种模式下 get 是同步内存读，
 * 不存在网络放大。索引接口偶发失败也走回落，保证列表能出。
 */
export async function getProjectPage(query: ProjectQuery = {}): Promise<ProjectIndexPage> {
  const storage = getStorage()
  if (storage.projectIndex) {
    try {
      return await storage.projectIndex(query)
    } catch {
      // 落到下方逐条读，宁可慢也不给首页一条空列表
    }
  }
  return applyProjectQuery(await buildLocalIndex(), query)
}

/** 本地/内存模式：keys()+get() 逐条拼出全量摘要，按时间倒序（口径与 server buildProjectIndex 一致） */
async function buildLocalIndex(): Promise<ProjectSummary[]> {
  const storage = getStorage()
  const keys = await storage.keys()
  const names = keys
    .filter(key => key.startsWith('scada_project_'))
    .map(key => key.slice('scada_project_'.length))

  const rows = await Promise.all(
    names.map(async name => {
      let timestamp = 0
      let pageCount = 1
      try {
        const raw = await storage.get(projectKey(name))
        const data = raw ? JSON.parse(raw) : null
        timestamp = Number(data?.timestamp) || 0
        pageCount = Array.isArray(data?.pages) ? data.pages.length : 1
      } catch {
        // 坏 JSON 按「未知」处理，不影响其余工程
      }
      const publishedAt = await getPublishedSnapshotAt(name)
      // 本地/内存模式 get 是同步内存读，全量读缩略图没有网络放大；与服务端「当前页带图」对齐，
      // applyProjectQuery slice 后返回给前端的行直接带 data URL。
      return { name, timestamp, pageCount, publishedAt, thumbnail: await storage.get(thumbKey(name)) }
    }),
  )

  rows.sort((a, b) => b.timestamp - a.timestamp)
  return rows
}

/** 对全量摘要套用关键词/分页并计算 total/publishedTotal/matchedTotal（与 server queryProjectIndex 同口径） */
function applyProjectQuery(all: ProjectSummary[], query: ProjectQuery): ProjectIndexPage {
  const kw = (query.keyword || '').trim()
  const total = all.length
  const publishedTotal = all.reduce((n, r) => (r.publishedAt ? n + 1 : n), 0)
  const matched = kw ? all.filter(r => r.name.toLowerCase().includes(kw.toLowerCase())) : all
  const limit = query.limit && query.limit > 0 ? query.limit : 12
  const start = query.offset && query.offset > 0 ? Math.floor(query.offset) : 0
  return {
    projects: matched.slice(start, start + limit),
    total,
    publishedTotal,
    matchedTotal: matched.length,
  }
}

/** 删除工程的工作副本、发布快照与草稿 */
export async function deleteProjectKeys(name: string): Promise<void> {
  const storage = getStorage()
  await storage.remove(projectKey(name))
  await storage.remove(publishedKey(name))
  await storage.remove(draftKey(name))
}

/** 取消发布：删除发布快照，预览回落到草稿 */
export async function removePublishedSnapshot(name: string): Promise<void> {
  await getStorage().remove(publishedKey(name))
}

/** 是否存在发布版 */
export async function hasPublishedSnapshot(name: string): Promise<boolean> {
  return (await getStorage().get(publishedKey(name))) !== null
}

/** 发布时间；无发布版返回 null */
export async function getPublishedSnapshotAt(name: string): Promise<number | null> {
  return parsePublishedAt(await getStorage().get(publishedKey(name)))
}
