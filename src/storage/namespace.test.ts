import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  LocalStorageAdapter,
  migrateLocalPrefix,
  getStorage,
  initStorage,
  storageMode,
  syncLocalNamespace,
} from './index'
import { resolveLocalNamespace, namespaceForUser, ANONYMOUS_NAMESPACE } from './namespace'
import { LOCAL_SESSION_KEY } from './sessionKey'

describe('LocalStorageAdapter 命名空间隔离', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('两个命名空间下的同名键互不可见', async () => {
    const a = new LocalStorageAdapter('u/1/')
    const b = new LocalStorageAdapter('u/2/')

    await a.set('scada_project_p', 'A')
    await b.set('scada_project_p', 'B')

    expect(await a.get('scada_project_p')).toBe('A')
    expect(await b.get('scada_project_p')).toBe('B')
    expect(localStorage.getItem('u/1/scada_project_p')).toBe('A')
    expect(localStorage.getItem('u/2/scada_project_p')).toBe('B')
  })

  it('keys 只枚举本空间且剥离前缀', async () => {
    const a = new LocalStorageAdapter('u/1/')
    const b = new LocalStorageAdapter('u/2/')
    await a.set('scada_project_x', '1')
    await b.set('scada_project_y', '2')

    expect(await a.keys()).toEqual(['scada_project_x'])
    expect(await b.keys()).toEqual(['scada_project_y'])
  })

  it('remove 只影响本空间', async () => {
    const a = new LocalStorageAdapter('u/1/')
    const b = new LocalStorageAdapter('u/2/')
    await a.set('k', '1')
    await b.set('k', '2')

    await a.remove('k')

    expect(await a.get('k')).toBeNull()
    expect(await b.get('k')).toBe('2')
  })

  it('会话缓存作为全局键不参与隔离', async () => {
    const a = new LocalStorageAdapter('u/1/')
    const b = new LocalStorageAdapter('u/2/')

    await a.set(LOCAL_SESSION_KEY, 'session-data')

    // 换空间后仍能读到：登出切到匿名空间时不能把"记住登录"丢掉
    expect(await b.get(LOCAL_SESSION_KEY)).toBe('session-data')
    expect(localStorage.getItem('u/1/' + LOCAL_SESSION_KEY)).toBeNull()
  })

  it('无前缀时行为与旧实现一致', async () => {
    const plain = new LocalStorageAdapter()
    await plain.set('scada_theme', 'dark')
    expect(localStorage.getItem('scada_theme')).toBe('dark')
    expect(await plain.keys()).toEqual(['scada_theme'])
  })
})

describe('migrateLocalPrefix', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('把无前缀的旧键复制到目标命名空间', () => {
    localStorage.setItem('scada_project_old', '{}')
    localStorage.setItem('scada_components', '[]')

    const count = migrateLocalPrefix('u/1/')

    expect(count).toBe(2)
    expect(localStorage.getItem('u/1/scada_project_old')).toBe('{}')
    // 旧键保留作为回退
    expect(localStorage.getItem('scada_project_old')).toBe('{}')
  })

  it('目标已存在时不覆盖', () => {
    localStorage.setItem('scada_project_old', 'legacy')
    localStorage.setItem('u/1/scada_project_old', 'existing')

    const count = migrateLocalPrefix('u/1/')

    expect(count).toBe(0)
    expect(localStorage.getItem('u/1/scada_project_old')).toBe('existing')
  })

  it('只执行一次（标志位生效）', () => {
    localStorage.setItem('scada_project_old', '{}')
    expect(migrateLocalPrefix('u/1/')).toBe(1)

    // 新增旧键后再次调用不再迁移
    localStorage.setItem('scada_project_new', '{}')
    expect(migrateLocalPrefix('u/1/')).toBe(0)
    expect(localStorage.getItem('u/1/scada_project_new')).toBeNull()
  })

  it('无前缀时不做迁移', () => {
    localStorage.setItem('scada_project_old', '{}')
    expect(migrateLocalPrefix('')).toBe(0)
  })
})

describe('resolveLocalNamespace', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('从会话缓存解析用户命名空间', () => {
    localStorage.setItem(
      LOCAL_SESSION_KEY,
      JSON.stringify({ user: { id: 'usr_abc' }, token: 't' }),
    )
    expect(resolveLocalNamespace()).toBe('u/usr_abc/')
  })

  it('无缓存/缓存损坏时回落匿名命名空间', () => {
    expect(resolveLocalNamespace()).toBe(ANONYMOUS_NAMESPACE)
    localStorage.setItem(LOCAL_SESSION_KEY, 'not json')
    expect(resolveLocalNamespace()).toBe(ANONYMOUS_NAMESPACE)
  })

  it('namespaceForUser 处理空值', () => {
    expect(namespaceForUser(null)).toBe(ANONYMOUS_NAMESPACE)
    expect(namespaceForUser(undefined)).toBe(ANONYMOUS_NAMESPACE)
    expect(namespaceForUser('x')).toBe('u/x/')
  })
})

describe('syncLocalNamespace', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  /** 后端不可用时 initStorage 回落本地并置为 local 模式 */
  async function initAsLocal() {
    const fetchStub = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchStub)
    await initStorage('/api', 'u/1/')
    expect(storageMode()).toBe('local')
  }

  it('本地模式下切换到目标用户空间，工程随之隔离', async () => {
    await initAsLocal()
    await getStorage().set('scada_project_p', '{}')
    expect(localStorage.getItem('u/1/scada_project_p')).toBe('{}')

    syncLocalNamespace('usr_2')

    expect((getStorage() as LocalStorageAdapter).prefix).toBe('u/usr_2/')
    // 切换后看到的应属于自己的空间，不再暴露上一个用户的工程
    expect(await getStorage().get('scada_project_p')).toBeNull()
    await getStorage().set('scada_project_p', '{}')
    expect(localStorage.getItem('u/usr_2/scada_project_p')).toBe('{}')
    expect(localStorage.getItem('u/1/scada_project_p')).toBe('{}')
  })

  it('登出（null）回到匿名空间', async () => {
    await initAsLocal()
    syncLocalNamespace('usr_2')
    syncLocalNamespace(null)
    expect((getStorage() as LocalStorageAdapter).prefix).toBe(ANONYMOUS_NAMESPACE)
  })
})
