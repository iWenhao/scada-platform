import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from './projectStore'
import { MemoryStorageAdapter, getStorage, setStorage } from '@/storage'

describe('projectStore.renameProject', () => {
  let store: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    store = useProjectStore()
  })

  it('未保存过的项目重命名只改名称并标记未保存', () => {
    expect(store.renameProject('新名字')).toBe(true)
    expect(store.projectName).toBe('新名字')
    expect(store.hasUnsavedChanges).toBe(true)
    expect(getStorage().keys()).toEqual([])
  })

  it('已保存的项目重命名应迁移存储键', () => {
    store.saveProject('旧名')
    expect(store.renameProject('新名')).toBe(true)

    expect(store.projectName).toBe('新名')
    expect(getStorage().get('scada_project_新名')).not.toBeNull()
    expect(getStorage().get('scada_project_旧名')).toBeNull()
    expect(store.getSavedProjects()).toEqual(['新名'])
  })

  it('重命名到已有项目名应被拒绝且不覆盖他人数据', () => {
    store.saveProject('A')
    store.saveProject('B')
    store.loadProject('A')

    expect(store.renameProject('B')).toBe(false)
    expect(store.projectName).toBe('A')
    expect(store.getSavedProjects().sort()).toEqual(['A', 'B'])
  })

  it('空白名称应被拒绝', () => {
    expect(store.renameProject('   ')).toBe(false)
    expect(store.projectName).toBe('未命名项目')
  })
})

describe('projectStore.renameSavedProject', () => {
  let store: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    store = useProjectStore()
  })

  it('应迁移存储键并在重命名当前项目时同步名称', () => {
    store.saveProject('A')

    expect(store.renameSavedProject('A', 'B')).toBe(true)
    expect(getStorage().get('scada_project_B')).not.toBeNull()
    expect(getStorage().get('scada_project_A')).toBeNull()
    expect(store.projectName).toBe('B')
  })

  it('重命名非当前项目时不应改变当前项目名', () => {
    store.saveProject('A')
    store.saveProject('B')

    expect(store.renameSavedProject('A', 'C')).toBe(true)
    expect(store.projectName).toBe('B')
    expect(store.getSavedProjects().sort()).toEqual(['B', 'C'])
  })

  it('重名或项目不存在应被拒绝', () => {
    store.saveProject('A')
    store.saveProject('B')

    expect(store.renameSavedProject('A', 'B')).toBe(false)
    expect(store.renameSavedProject('不存在', 'X')).toBe(false)
    expect(store.getSavedProjects().sort()).toEqual(['A', 'B'])
  })
})
