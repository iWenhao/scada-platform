// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from './projectStore'
import { useCanvasStore } from './canvasStore'
import { useConnectionStore } from './connectionStore'
import { MemoryStorageAdapter, getStorage, setStorage } from '@/storage'

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

  it('保存时改过名，应同时清掉旧名下的草稿', async () => {
    store.setDataSource({ type: 'websocket', name: 'ws', url: 'ws://a' })
    await store.saveDraft() // 草稿按写入时的名字落键：scada_draft_未命名项目
    expect(await getStorage().get('scada_draft_未命名项目')).not.toBeNull()

    // 撞名后改名保存：实际落盘用新名字，草稿键仍是旧名字
    await getStorage().set(
      'scada_project_未命名项目',
      JSON.stringify({ version: '1.1', name: '未命名项目', timestamp: 1, pages: [] }),
    )
    expect(await store.saveProject('新工程')).toBe(true)

    expect(await getStorage().get('scada_draft_未命名项目')).toBeNull()
    expect(await getStorage().get('scada_draft_新工程')).toBeNull()
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
      rotation: 0,
      properties: {}, statusRules: [], dataBindings: [],
    })
    connectionStore.connections = [{ id: 'c1' } as never]

    store.resetProject()

    expect(canvasStore.elements).toHaveLength(0)
    expect(connectionStore.connections).toHaveLength(0)
    expect(store.dataSourceConfig.type).toBe('mock')
  })

  it('新建项目应清掉默认名下的残留草稿', async () => {
    store.setDataSource({ type: 'websocket', name: 'ws', url: 'ws://a' })
    await store.saveDraft()
    expect(await store.hasDraft()).toBe(true)

    await store.startNewProject()

    expect(await store.hasDraft()).toBe(false)
    expect(store.projectName).toBe('未命名项目')
    expect(store.hasUnsavedChanges).toBe(false)
    expect(store.dataSourceConfig.type).toBe('mock')
  })
})
