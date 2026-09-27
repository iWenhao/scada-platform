import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { MemoryStorageAdapter, LocalStorageAdapter, getStorage, setStorage } from './index'
import { useProjectStore } from '@/stores/projectStore'

describe('MemoryStorageAdapter', () => {
  let storage: MemoryStorageAdapter

  beforeEach(() => {
    storage = new MemoryStorageAdapter()
  })

  it('应该支持存取与删除', async () => {
    await storage.set('a', '1')
    expect(await storage.get('a')).toBe('1')

    await storage.remove('a')
    expect(await storage.get('a')).toBeNull()
  })

  it('keys 应该枚举全部键', async () => {
    await storage.set('a', '1')
    await storage.set('b', '2')
    expect((await storage.keys()).sort()).toEqual(['a', 'b'])
  })
})

describe('LocalStorageAdapter', () => {
  let storage: LocalStorageAdapter

  beforeEach(() => {
    localStorage.clear()
    storage = new LocalStorageAdapter()
  })

  it('应该读写 localStorage', async () => {
    await storage.set('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
    expect(await storage.get('k')).toBe('v')

    await storage.remove('k')
    expect(localStorage.getItem('k')).toBeNull()
  })
})

describe('getStorage / setStorage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
  })

  it('默认应返回可用存储', () => {
    expect(getStorage()).toBeDefined()
  })

  it('注入内存适配器后 projectStore 应完整走通保存/加载/列表/删除', async () => {
    const store = useProjectStore()
    store.projectName = '测试项目'

    expect(await store.saveProject('测试项目')).toBe(true)
    expect(await getStorage().get('scada_project_测试项目')).not.toBeNull()

    store.resetProject()
    expect(await store.loadProject('测试项目')).toBe(true)
    expect(store.projectName).toBe('测试项目')

    expect(await store.getSavedProjects()).toEqual(['测试项目'])

    await store.deleteProject('测试项目')
    expect(await store.getSavedProjects()).toEqual([])
  })
})
