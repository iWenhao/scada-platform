/**
 * 工程存储键与键级操作（与 Pinia 状态无关的纯存储层）。
 * 从 projectStore 拆出：store 只负责状态与组装，存储键的命名/迁移/清理集中在这里，
 * 便于独立单测而不必挂起整个 store。
 */
import { getStorage } from '@/storage'
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
