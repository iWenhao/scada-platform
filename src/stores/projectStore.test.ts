// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from './projectStore'
import { usePageStore } from './pageStore'
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

describe('projectStore 保存查重', () => {
  let store: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    store = useProjectStore()
  })

  /** 预置一个同名工程，模拟「别人的项目」已占用该名字 */
  async function occupy(name: string) {
    await getStorage().set(
      `scada_project_${name}`,
      JSON.stringify({ version: '1.1', name, timestamp: 1, pages: [] }),
    )
  }

  it('新建项目用默认名保存，撞已占用名应拒绝且不覆盖旧数据', async () => {
    await occupy('未命名项目')
    store.markDirty()

    expect(await store.saveProject()).toBe(false)
    // 旧数据原样保留，编辑器名字与脏标记也不动
    expect(JSON.parse((await getStorage().get('scada_project_未命名项目'))!).timestamp).toBe(1)
    expect(store.projectName).toBe('未命名项目')
    expect(store.hasUnsavedChanges).toBe(true)
  })

  it('新建项目指定名字保存，撞已占用名应拒绝', async () => {
    await occupy('A')
    store.resetProject()

    expect(await store.saveProject('A')).toBe(false)
    expect(store.projectName).toBe('未命名项目')
  })

  it('resetProject 应清除认领：存过的项目新建后不能覆盖它', async () => {
    await store.saveProject('A')
    store.resetProject()

    expect(await store.saveProject('A')).toBe(false)
  })

  it('打开过的工程再次保存应放行（覆盖自己的旧版本）', async () => {
    await store.saveProject('A')
    // 换一个「会话」：新 pinia，认领标志从打开动作重建
    setActivePinia(createPinia())
    store = useProjectStore()

    expect(await store.loadProject('A')).toBe(true)
    store.markDirty()
    expect(await store.saveProject()).toBe(true)
    expect(store.hasUnsavedChanges).toBe(false)
  })

  it('导入后首次保存撞名应拒绝', async () => {
    await store.saveProject('已有工程')
    store.resetProject()

    expect(
      store.importProject(
        JSON.stringify({
          version: '1.0',
          name: '已有工程',
          description: '',
          timestamp: 2,
          canvas: '{}',
          connections: '[]',
          layers: '[]',
        }),
      ),
    ).toBe(true)
    expect(store.projectName).toBe('已有工程')
    expect(await store.saveProject()).toBe(false)
  })

  it('重命名已保存项目后再保存应放行（认领标志随键迁移）', async () => {
    await store.saveProject('旧名')

    expect(await store.renameProject('新名')).toBe(true)
    expect(await store.saveProject()).toBe(true)
    expect(await getStorage().get('scada_project_新名')).not.toBeNull()
  })

  it('两个独立会话用同名新建，第二个保存被拒且不覆盖第一个的数据', async () => {
    // 会话 A 新建并保存「并发工程」
    await store.saveProject('并发工程')
    const bytesAfterA = await getStorage().get('scada_project_并发工程')

    // 会话 B：全新 pinia，没打开过也没认领过该名字（模拟另一台设备/另一个标签）
    setActivePinia(createPinia())
    const storeB = useProjectStore()
    storeB.markDirty()

    // 判重交给底层一次原子写，B 拿不到覆盖权
    expect(await storeB.saveProject('并发工程')).toBe(false)
    expect(storeB.projectName).toBe('未命名项目')
    // A 的数据原样还在
    expect(await getStorage().get('scada_project_并发工程')).toBe(bytesAfterA)
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

  it('草稿清理失败也算保存成功', async () => {
    // 远程删除会撞 Windows 的「刚写完句柄未释放」（EPERM → HTTP 500）。
    // 此时项目数据已落盘，若把清理失败抛出去，「保存」报未处理异常、「预览」直接不跳转
    class RemoveFailsAdapter extends MemoryStorageAdapter {
      override async remove(_key: string): Promise<void> {
        throw new Error('remove failed: HTTP 500')
      }
    }
    setStorage(new RemoveFailsAdapter())
    store.setDataSource({ type: 'websocket', name: 'ws', url: 'ws://a' })
    await store.saveDraft()

    await expect(store.saveProject()).resolves.toBe(true)
    expect(store.hasUnsavedChanges).toBe(false)
    expect(await getStorage().get('scada_project_未命名项目')).not.toBeNull()
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

describe('projectStore 编辑会话现场', () => {
  let store: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    store = useProjectStore()
  })

  /** 造一个带元素的最小页面内容，用于验证快照与后续编辑隔离 */
  function addTank(canvasStore: ReturnType<typeof useCanvasStore>, name: string) {
    canvasStore.addElement({
      id: `e_${name}`, type: 'tank', name, x: 0, y: 0, width: 60, height: 60,
      rotation: 0, layerId: 'device',
      properties: {}, statusRules: [], dataBindings: [],
    })
  }

  it('发布版整表替换画面列表后，还原快照应找回新增画面', async () => {
    const pageStore = usePageStore()
    store.resetProject() // 单张「主页」
    await store.saveProject('现场')
    await store.publishProject('现场') // 发布版停在 1 张画面

    pageStore.addPage('画面2')
    pageStore.addPage('画面3')
    store.markDirty()
    const lastPageId = pageStore.activePageId
    const snapshot = store.snapshotEditorSession()

    // 预览页默认读发布版：setPages 是整表替换，编辑器内存里的画面 2/3 就此消失（原缺陷）
    expect(await store.loadPublishedProject('现场')).toBe(true)
    expect(pageStore.pages).toHaveLength(1)

    store.restoreEditorSession(snapshot)
    expect(pageStore.pages.map(p => p.name)).toEqual(['主页', '画面2', '画面3'])
    expect(pageStore.activePageId).toBe(lastPageId)
    // 未保存标记也要一起回来，否则用户看不出自己还没存
    expect(store.hasUnsavedChanges).toBe(true)
  })

  it('现场快照应与后续编辑隔离，不受 store 就地改写穿透', () => {
    const canvasStore = useCanvasStore()
    store.resetProject()
    addTank(canvasStore, '原罐')

    const snapshot = store.snapshotEditorSession()
    // 快照之后再改工作区：还原必须拿回快照那一刻的内容
    canvasStore.elements[0].name = '改过了'

    store.restoreEditorSession(snapshot)
    expect(useCanvasStore().elements[0].name).toBe('原罐')
  })
})
