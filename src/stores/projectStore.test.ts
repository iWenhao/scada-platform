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
