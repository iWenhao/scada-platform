import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { MemoryStorageAdapter, LocalStorageAdapter, getStorage, setStorage } from './index'
import { useProjectStore } from '@/stores/projectStore'

describe('MemoryStorageAdapter', () => {
  let storage: MemoryStorageAdapter

  beforeEach(() => {
    storage = new MemoryStorageAdapter()
  })

  it('应该支持存取与删除', () => {
    storage.set('a', '1')
    expect(storage.get('a')).toBe('1')

    storage.remove('a')
    expect(storage.get('a')).toBeNull()
  })

  it('keys 应该枚举全部键', () => {
    storage.set('a', '1')
    storage.set('b', '2')
    expect(storage.keys().sort()).toEqual(['a', 'b'])
  })
})

describe('LocalStorageAdapter', () => {
  let storage: LocalStorageAdapter

  beforeEach(() => {
    localStorage.clear()
    storage = new LocalStorageAdapter()
  })

  it('应该读写 localStorage', () => {
    storage.set('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
    expect(storage.get('k')).toBe('v')

    storage.remove('k')
    expect(localStorage.getItem('k')).toBeNull()
  })
})

describe('getStorage / setStorage', () => {
  afterEach(() => {
    setStorage(new MemoryStorageAdapter())
  })

  it('默认应返回可用存储', () => {
    expect(getStorage()).toBeDefined()
  })

  it('注入内存适配器后 projectStore 应完整走通保存/加载/列表/删除', () => {
    setActivePinia(createPinia())
    const memory = new MemoryStorageAdapter()
    setStorage(memory)

    const store = useProjectStore()
    store.projectName = '测试项目'

    expect(store.saveProject('测试项目')).toBe(true)
    expect(memory.keys()).toEqual(['scada_project_测试项目'])

    // 清空当前状态后重新加载
    useProjectStore().resetProject()
    expect(store.loadProject('测试项目')).toBe(true)
    expect(store.projectName).toBe('测试项目')

    expect(store.getSavedProjects()).toEqual(['测试项目'])

    store.deleteProject('测试项目')
    expect(store.getSavedProjects()).toEqual([])
  })
})
