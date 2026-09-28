import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from './projectStore'
import { useCanvasStore } from './canvasStore'
import { useConnectionStore } from './connectionStore'
import { MemoryStorageAdapter, getStorage, setStorage } from '@/storage'

describe('projectStore.renameProject', () => {
  let store: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    store = useProjectStore()
  })

  it('未保存过的项目重命名只改名称并标记未保存', async () => {
    expect(await store.renameProject('新名字')).toBe(true)
    expect(store.projectName).toBe('新名字')
    expect(store.hasUnsavedChanges).toBe(true)
  })

  it('已保存的项目重命名应迁移存储键', async () => {
    await store.saveProject('旧名')
    expect(await store.renameProject('新名')).toBe(true)

    expect(store.projectName).toBe('新名')
    expect(await getStorage().get('scada_project_新名')).not.toBeNull()
    expect(await getStorage().get('scada_project_旧名')).toBeNull()
    expect(await store.getSavedProjects()).toEqual(['新名'])
  })

  it('重命名到已有项目名应被拒绝且不覆盖他人数据', async () => {
    await store.saveProject('A')
    await store.saveProject('B')
    await store.loadProject('A')

    expect(await store.renameProject('B')).toBe(false)
    expect(store.projectName).toBe('A')
    expect((await store.getSavedProjects()).sort()).toEqual(['A', 'B'])
  })

  it('空白名称应被拒绝', async () => {
    expect(await store.renameProject('   ')).toBe(false)
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

  it('应迁移存储键并在重命名当前项目时同步名称', async () => {
    await store.saveProject('A')

    expect(await store.renameSavedProject('A', 'B')).toBe(true)
    expect(await getStorage().get('scada_project_B')).not.toBeNull()
    expect(await getStorage().get('scada_project_A')).toBeNull()
    expect(store.projectName).toBe('B')
  })

  it('重命名非当前项目时不应改变当前项目名', async () => {
    await store.saveProject('A')
    await store.saveProject('B')

    expect(await store.renameSavedProject('A', 'C')).toBe(true)
    expect(store.projectName).toBe('B')
    expect((await store.getSavedProjects()).sort()).toEqual(['B', 'C'])
  })

  it('重名或项目不存在应被拒绝', async () => {
    await store.saveProject('A')
    await store.saveProject('B')

    expect(await store.renameSavedProject('A', 'B')).toBe(false)
    expect(await store.renameSavedProject('不存在', 'X')).toBe(false)
    expect((await store.getSavedProjects()).sort()).toEqual(['A', 'B'])
  })
})

describe('projectStore 数据源持久化', () => {
  let store: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    store = useProjectStore()
  })

  it('保存的工程应包含数据源配置，重载后能回填', async () => {
    store.setDataSource({ type: 'websocket', name: 'ws', url: 'ws://localhost:8080/rt' })
    await store.saveProject('带数据源')

    const raw = await getStorage().get('scada_project_带数据源')
    expect(JSON.parse(raw!).dataSource.url).toBe('ws://localhost:8080/rt')

    store.resetProject()
    expect(store.dataSourceConfig.type).toBe('mock')

    await store.loadProject('带数据源')
    expect(store.dataSourceConfig.type).toBe('websocket')
    expect(store.dataSourceConfig.url).toBe('ws://localhost:8080/rt')
  })

  it('导出 JSON 应带上数据源配置', () => {
    store.setDataSource({ type: 'http', name: 'h', url: 'http://localhost/api/data' })
    expect(JSON.parse(store.exportProject()).dataSource.url).toBe('http://localhost/api/data')
  })

  it('旧工程没有 dataSource 字段时应回落 mock 而不报错', async () => {
    const legacy = JSON.stringify({
      version: '1.0',
      name: '老工程',
      description: '',
      timestamp: Date.now(),
      canvas: '{}',
      connections: '[]',
      layers: '[]',
    })
    await getStorage().set('scada_project_老工程', legacy)

    expect(await store.loadProject('老工程')).toBe(true)
    expect(store.dataSourceConfig).toEqual({ type: 'mock', name: 'default' })
  })

  it('设置数据源应标记工程为已修改', () => {
    expect(store.hasUnsavedChanges).toBe(false)
    store.setDataSource({ type: 'websocket', name: 'ws', url: 'ws://x' })
    expect(store.hasUnsavedChanges).toBe(true)
  })
})

describe('projectStore 草稿', () => {
  let store: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    store = useProjectStore()
  })

  it('自动草稿应能恢复，且恢复后仍记为未保存', async () => {
    store.setDataSource({ type: 'websocket', name: 'ws', url: 'ws://a' })
    await store.saveDraft()
    expect(await store.hasDraft()).toBe(true)

    // 模拟改动丢失
    store.resetProject()
    expect(store.dataSourceConfig.type).toBe('mock')

    expect(await store.restoreDraft()).toBe(true)
    expect(store.dataSourceConfig.url).toBe('ws://a')
    // 草稿不是正式落盘，仍需用户保存
    expect(store.hasUnsavedChanges).toBe(true)
    expect(store.lastSaveTime).toBeNull()
  })

  it('正式保存后草稿应被清除', async () => {
    store.setDataSource({ type: 'websocket', name: 'ws', url: 'ws://a' })
    await store.saveDraft()
    expect(await store.hasDraft()).toBe(true)

    await store.saveProject()
    expect(await store.hasDraft()).toBe(false)
  })

  it('草稿不应混进正式项目列表', async () => {
    await store.saveDraft()
    expect(await store.getSavedProjects()).toEqual([])
  })
})

describe('projectStore.resetProject', () => {
  let store: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    store = useProjectStore()
  })

  it('新建项目应清空上一项目的画布元素与连线', () => {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    canvasStore.addElement({
      id: 'e1', type: 'tank', name: '罐', x: 0, y: 0, width: 60, height: 60,
      rotation: 0, layerId: 'device',
      properties: {}, statusRules: [], dataBindings: [],
    })
    connectionStore.connections = [{ id: 'c1' } as never]

    store.resetProject()

    expect(canvasStore.elements).toHaveLength(0)
    expect(connectionStore.connections).toHaveLength(0)
    expect(store.dataSourceConfig.type).toBe('mock')
  })
})
