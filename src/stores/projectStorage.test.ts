import { describe, it, expect, beforeEach } from 'vitest'
import {
  isProjectTaken,
  renameProjectKeys,
  listSavedProjects,
  deleteProjectKeys,
  projectKey,
  draftKey,
  publishedKey,
} from './projectStorage'
import { MemoryStorageAdapter, getStorage, setStorage } from '@/storage'

describe('projectStorage', () => {
  beforeEach(() => {
    setStorage(new MemoryStorageAdapter())
  })

  it('isProjectTaken 按工作副本键判断占用', async () => {
    expect(await isProjectTaken('A')).toBe(false)
    await getStorage().set(projectKey('A'), '{}')
    expect(await isProjectTaken('A')).toBe(true)
  })

  it('renameProjectKeys 迁移工作副本与发布快照，不迁移草稿', async () => {
    const storage = getStorage()
    await storage.set(projectKey('A'), 'data')
    await storage.set(publishedKey('A'), 'pub')
    await storage.set(draftKey('A'), 'draft')

    expect(await renameProjectKeys('A', 'B')).toBe(true)
    expect(await storage.get(projectKey('B'))).toBe('data')
    expect(await storage.get(publishedKey('B'))).toBe('pub')
    expect(await storage.get(projectKey('A'))).toBeNull()
    expect(await storage.get(publishedKey('A'))).toBeNull()
    // 草稿留在原键：重命名已有项目后旧草稿自然失效
    expect(await storage.get(draftKey('A'))).toBe('draft')
  })

  it('renameProjectKeys 拒绝源缺失与目标重名', async () => {
    await getStorage().set(projectKey('A'), 'data')
    expect(await renameProjectKeys('不存在', 'B')).toBe(false)
    await getStorage().set(projectKey('B'), 'other')
    expect(await renameProjectKeys('A', 'B')).toBe(false)
    // 拒绝时不产生任何迁移
    expect(await getStorage().get(projectKey('A'))).toBe('data')
  })

  it('listSavedProjects 只列工作副本键', async () => {
    await getStorage().set(projectKey('A'), '{}')
    await getStorage().set(publishedKey('A'), '{}')
    await getStorage().set(draftKey('A'), '{}')
    expect(await listSavedProjects()).toEqual(['A'])
  })

  it('deleteProjectKeys 清理工作副本、发布快照与草稿', async () => {
    const storage = getStorage()
    await storage.set(projectKey('A'), '{}')
    await storage.set(publishedKey('A'), '{}')
    await storage.set(draftKey('A'), '{}')
    await deleteProjectKeys('A')
    expect(await storage.get(projectKey('A'))).toBeNull()
    expect(await storage.get(publishedKey('A'))).toBeNull()
    expect(await storage.get(draftKey('A'))).toBeNull()
  })
})
