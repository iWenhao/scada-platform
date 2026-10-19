// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isProjectTaken,
  renameProjectKeys,
  listSavedProjects,
  getProjectSummaries,
  deleteProjectKeys,
  projectKey,
  draftKey,
  publishedKey,
} from './projectStorage'
import { MemoryStorageAdapter, getStorage, setStorage } from '@/storage'
import { thumbKey } from '@/core/canvas/thumbnail'

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

  describe('getProjectSummaries 本地/内存回落（无 projectIndex 能力）', () => {
    it('逐条读工作副本，抽 timestamp/pageCount/publishedAt/hasThumbnail 并按时间倒序', async () => {
      const storage = getStorage()
      await storage.set(projectKey('旧'), JSON.stringify({ timestamp: 100, pages: [1, 2] }))
      await storage.set(projectKey('新'), JSON.stringify({ timestamp: 900, pages: [1] }))
      await storage.set(publishedKey('新'), JSON.stringify({ publishedAt: 950 }))
      await storage.set(thumbKey('旧'), 'data:image/jpeg;base64,x')
      // 草稿/孤立缩略图不应混进摘要
      await storage.set(draftKey('新'), '{}')

      const rows = await getProjectSummaries()
      expect(rows.map(r => r.name)).toEqual(['新', '旧'])
      expect(rows[0]).toEqual({
        name: '新',
        timestamp: 900,
        pageCount: 1,
        publishedAt: 950,
        hasThumbnail: false,
      })
      expect(rows[1]).toMatchObject({ pageCount: 2, publishedAt: null, hasThumbnail: true })
    })

    it('工作副本是坏 JSON 时按未知处理，不影响其余工程', async () => {
      const storage = getStorage()
      await storage.set(projectKey('坏'), '{ not json')
      await storage.set(projectKey('好'), JSON.stringify({ timestamp: 5, pages: [1] }))
      const map = Object.fromEntries((await getProjectSummaries()).map(r => [r.name, r]))
      expect(map['坏']).toMatchObject({ timestamp: 0, pageCount: 1 })
      expect(map['好'].timestamp).toBe(5)
    })
  })

  describe('getProjectSummaries 远程索引优先', () => {
    /**
     * 带 projectIndex 能力的假适配器：委托一个内存实例做 get/set/keys
     * （不能对类实例用扩展运算符——方法在原型上，展开会丢方法）。
     */
    function indexAdapter(result: unknown[], throwOnIndex = false) {
      const mem = new MemoryStorageAdapter()
      return {
        get: (k: string) => mem.get(k),
        set: (k: string, v: string, o?: { ifAbsent?: boolean }) => mem.set(k, v, o),
        remove: (k: string) => mem.remove(k),
        keys: () => mem.keys(),
        projectIndex: async () => {
          if (throwOnIndex) throw new Error('boom')
          return result as never
        },
      }
    }

    it('适配器提供 projectIndex 时一次拿全，不逐条 get', async () => {
      const summaries = [
        { name: 'A', timestamp: 1, pageCount: 3, publishedAt: null, hasThumbnail: false },
      ]
      let getCalled = 0
      const adapter = indexAdapter(summaries)
      const realGet = adapter.get
      adapter.get = async (k: string) => {
        getCalled += 1
        return realGet(k)
      }
      setStorage(adapter)

      expect(await getProjectSummaries()).toEqual(summaries)
      expect(getCalled).toBe(0)
    })

    it('索引接口抛错时回落到逐条读，仍能出列表', async () => {
      const adapter = indexAdapter([], true)
      setStorage(adapter)
      await adapter.set(projectKey('A'), JSON.stringify({ timestamp: 42, pages: [1, 2, 3] }))

      const rows = await getProjectSummaries()
      expect(rows).toEqual([
        { name: 'A', timestamp: 42, pageCount: 3, publishedAt: null, hasThumbnail: false },
      ])
    })
  })
})
