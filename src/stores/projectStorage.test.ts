// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isProjectTaken,
  renameProjectKeys,
  listSavedProjects,
  getProjectPage,
  deleteProjectKeys,
  projectKey,
  draftKey,
  publishedKey,
} from './projectStorage'
import {
  MemoryStorageAdapter,
  getStorage,
  setStorage,
  type StorageAdapter,
  type ProjectQuery,
  type ProjectIndexPage,
} from '@/storage'
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

  describe('getProjectPage 本地/内存回落（无 projectIndex 能力）', () => {
    it('逐条读工作副本，抽字段并按时间倒序，同时给出全量统计', async () => {
      const storage = getStorage()
      await storage.set(projectKey('旧'), JSON.stringify({ timestamp: 100, pages: [1, 2] }))
      await storage.set(projectKey('新'), JSON.stringify({ timestamp: 900, pages: [1] }))
      await storage.set(publishedKey('新'), JSON.stringify({ publishedAt: 950 }))
      await storage.set(thumbKey('旧'), 'data:image/jpeg;base64,x')
      await storage.set(draftKey('新'), '{}') // 草稿不混进摘要

      const page = await getProjectPage()
      expect(page.total).toBe(2)
      expect(page.publishedTotal).toBe(1)
      expect(page.matchedTotal).toBe(2)
      expect(page.projects.map(r => r.name)).toEqual(['新', '旧'])
      expect(page.projects[0]).toEqual({
        name: '新',
        timestamp: 900,
        pageCount: 1,
        publishedAt: 950,
        thumbnail: null,
      })
      // 「旧」写入了 thumbKey('旧')，本地回落路径直接读出 data URL 透传
      expect(page.projects[1]).toMatchObject({
        pageCount: 2,
        publishedAt: null,
        thumbnail: 'data:image/jpeg;base64,x',
      })
    })

    it('keyword 走服务端同口径的名称子串匹配：命中数与统计随之变，total 不变', async () => {
      const storage = getStorage()
      await storage.set(projectKey('水泵A'), JSON.stringify({ timestamp: 3, pages: [1] }))
      await storage.set(projectKey('风机B'), JSON.stringify({ timestamp: 2, pages: [1] }))
      await storage.set(publishedKey('风机B'), JSON.stringify({ publishedAt: 9 }))

      const page = await getProjectPage({ keyword: '泵' })
      expect(page.projects.map(r => r.name)).toEqual(['水泵A'])
      expect(page.matchedTotal).toBe(1)
      // total/publishedTotal 是全量口径，不随关键词缩
      expect(page.total).toBe(2)
      expect(page.publishedTotal).toBe(1)
    })

    it('limit/offset 切片：matchedTotal 仍是全命中数，供前端判断是否还有下一页', async () => {
      const storage = getStorage()
      for (let i = 1; i <= 5; i++) {
        await storage.set(projectKey(`p${i}`), JSON.stringify({ timestamp: i * 10, pages: [1] }))
      }
      const second = await getProjectPage({ limit: 2, offset: 2 })
      expect(second.projects.map(r => r.name)).toEqual(['p3', 'p2']) // 倒序 5,4,3,2,1 → 第 3、4 个
      expect(second.matchedTotal).toBe(5)
      expect(second.total).toBe(5)
    })

    it('工作副本是坏 JSON 时按未知处理，不影响其余工程', async () => {
      const storage = getStorage()
      await storage.set(projectKey('坏'), '{ not json')
      await storage.set(projectKey('好'), JSON.stringify({ timestamp: 5, pages: [1] }))
      const byName = Object.fromEntries(
        (await getProjectPage()).projects.map(r => [r.name, r]),
      )
      expect(byName['坏']).toMatchObject({ timestamp: 0, pageCount: 1 })
      expect(byName['好'].timestamp).toBe(5)
    })
  })

  describe('getProjectPage 远程索引优先', () => {
    /**
     * 带 projectIndex 能力的假适配器：委托内存实例做 get/set/keys，
     * projectIndex 直接回传一页信封并记录收到的查询参数（用于断言透传）。
     * 不能对类实例用扩展运算符——方法在原型上，展开会丢方法。
     */
    function indexAdapter(page: ProjectIndexPage, throwOnIndex = false) {
      const mem = new MemoryStorageAdapter()
      const adapter: StorageAdapter & { projectIndex: (q?: ProjectQuery) => Promise<ProjectIndexPage>; lastQuery?: ProjectQuery } = {
        get: (k: string) => mem.get(k),
        set: (k: string, v: string, o?: { ifAbsent?: boolean }) => mem.set(k, v, o),
        remove: (k: string) => mem.remove(k),
        keys: () => mem.keys(),
        projectIndex: async (q?: ProjectQuery) => {
          if (throwOnIndex) throw new Error('boom')
          adapter.lastQuery = q
          return page
        },
      }
      return adapter
    }

    const okPage: ProjectIndexPage = {
      projects: [{ name: 'A', timestamp: 1, pageCount: 3, publishedAt: null, thumbnail: null }],
      total: 40,
      publishedTotal: 5,
      matchedTotal: 40,
    }

    it('适配器提供 projectIndex 时透传查询并原样返回信封，不逐条 get', async () => {
      let getCalled = 0
      const adapter = indexAdapter(okPage)
      const realGet = adapter.get
      adapter.get = async (k: string) => {
        getCalled += 1
        return realGet(k)
      }
      setStorage(adapter)

      const page = await getProjectPage({ keyword: '泵', limit: 12, offset: 24 })
      expect(page).toEqual(okPage)
      expect(adapter.lastQuery).toEqual({ keyword: '泵', limit: 12, offset: 24 })
      expect(getCalled).toBe(0)
    })

    it('索引接口抛错时回落到本地全量拼装 + 切片，仍能出列表', async () => {
      const adapter = indexAdapter({ projects: [], total: 0, publishedTotal: 0, matchedTotal: 0 }, true)
      setStorage(adapter)
      await adapter.set(projectKey('A'), JSON.stringify({ timestamp: 42, pages: [1, 2, 3] }))

      const page = await getProjectPage({ limit: 1, offset: 0 })
      expect(page.projects).toEqual([
        { name: 'A', timestamp: 42, pageCount: 3, publishedAt: null, thumbnail: null },
      ])
      expect(page.total).toBe(1)
    })
  })
})
