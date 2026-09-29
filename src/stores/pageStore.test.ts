import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePageStore } from './pageStore'
import { useCanvasStore } from './canvasStore'
import { useProjectStore } from './projectStore'
import type { ComponentInstance } from '@/types/scada'

function makeElement(id: string, name: string): ComponentInstance {
  return {
    id,
    type: 'pump',
    name,
    x: 10,
    y: 10,
    width: 80,
    height: 60,
    rotation: 0,
    layerId: 'device',
    properties: {},
    statusRules: [],
    dataBindings: [],
  }
}

describe('pageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('setPages 空列表时应建默认「主页」并装入工作区', () => {
    const pageStore = usePageStore()
    const canvasStore = useCanvasStore()
    pageStore.setPages([])
    expect(pageStore.pages).toHaveLength(1)
    expect(pageStore.pages[0].name).toBe('主页')
    expect(pageStore.activePageId).toBe(pageStore.pages[0].id)
    expect(canvasStore.elements).toEqual([])
  })

  it('切换画面应快照当前页并装入目标页', () => {
    const pageStore = usePageStore()
    const canvasStore = useCanvasStore()
    pageStore.setPages([])

    canvasStore.elements = [makeElement('e1', '泵1')]
    const firstId = pageStore.activePageId
    const second = pageStore.addPage('第二页')

    // addPage 会先快照第一页
    expect(pageStore.pages[0].elements).toHaveLength(1)
    expect(canvasStore.elements).toHaveLength(0)

    pageStore.switchPage(firstId)
    expect(canvasStore.elements[0]?.name).toBe('泵1')

    pageStore.switchPage(second.id)
    expect(canvasStore.elements).toHaveLength(0)
    expect(pageStore.activePageId).toBe(second.id)
  })

  it('删除画面后应清理其它页的 navigateTo 引用', () => {
    const pageStore = usePageStore()
    const canvasStore = useCanvasStore()
    pageStore.setPages([])

    const pageA = pageStore.activePageId
    const pageB = pageStore.addPage('B')

    // 在 A 上放一个跳转到 B 的元素
    pageStore.switchPage(pageA)
    canvasStore.elements = [{ ...makeElement('nav', '跳转'), navigateTo: pageB.id }]

    expect(pageStore.removePage(pageB.id)).toBe(true)
    // 重新抓取 A（删除 B 时 A 仍是 active？删的是 B，active 变成相邻）
    // 删 B 后 active 会切到某页；找到含 nav 的那页确认引用已清
    const pagesWithNav = pageStore.pages.filter(p => p.elements.some(e => e.id === 'nav'))
    for (const p of pagesWithNav) {
      expect(p.elements.find(e => e.id === 'nav')?.navigateTo).toBeUndefined()
    }
  })

  it('至少保留一张画面', () => {
    const pageStore = usePageStore()
    pageStore.setPages([])
    expect(pageStore.removePage(pageStore.activePageId)).toBe(false)
    expect(pageStore.pages).toHaveLength(1)
  })

  it('重命名应拒绝空名与重名', () => {
    const pageStore = usePageStore()
    pageStore.setPages([])
    const a = pageStore.addPage('A')
    expect(pageStore.renamePage(a.id, '主页')).toBe(false)
    expect(pageStore.renamePage(a.id, '  ')).toBe(false)
    expect(pageStore.renamePage(a.id, '总貌图')).toBe(true)
    expect(pageStore.pages.find(p => p.id === a.id)?.name).toBe('总貌图')
  })

  it('复制画面应生成新 ID 并保持内容', () => {
    const pageStore = usePageStore()
    const canvasStore = useCanvasStore()
    pageStore.setPages([])
    canvasStore.elements = [makeElement('e1', '泵1')]
    const srcId = pageStore.activePageId
    const copy = pageStore.duplicatePage(srcId)
    expect(copy).not.toBeNull()
    expect(copy!.id).not.toBe(srcId)
    expect(copy!.elements).toHaveLength(1)
    expect(copy!.elements[0].id).not.toBe('e1')
    expect(copy!.elements[0].name).toBe('泵1')
  })
})

describe('projectStore 多画面持久化', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const { MemoryStorageAdapter, setStorage } = await import('@/storage')
    setStorage(new MemoryStorageAdapter())
  })

  it('保存后 load 应还原多画面与 activePage', async () => {
    const projectStore = useProjectStore()
    const pageStore = usePageStore()
    const canvasStore = useCanvasStore()

    pageStore.setPages([])
    canvasStore.elements = [makeElement('e1', '泵1')]
    const pageA = pageStore.activePageId
    const pageB = pageStore.addPage('控制室')
    expect(pageStore.activePageId).toBe(pageB.id)

    await projectStore.saveProject('多画面测试')
    // 模拟重开
    pageStore.setPages([])
    canvasStore.elements = []
    projectStore.resetProject()

    expect(await projectStore.loadProject('多画面测试')).toBe(true)
    expect(pageStore.pages.map(p => p.name).sort()).toEqual(['主页', '控制室'].sort())
    expect(pageStore.activePageId).toBe(pageB.id)

    pageStore.switchPage(pageA)
    expect(canvasStore.elements[0]?.name).toBe('泵1')
  })

  it('旧版单画布工程应迁移为「主页」', async () => {
    const projectStore = useProjectStore()
    const pageStore = usePageStore()
    const { getStorage } = await import('@/storage')
    const { MemoryStorageAdapter, setStorage } = await import('@/storage')
    setStorage(new MemoryStorageAdapter())

    const legacy = {
      version: '1.0',
      name: '旧工程',
      canvas: JSON.stringify({
        version: '1.0',
        canvasConfig: { width: 800, height: 600 },
        elements: [makeElement('old1', '旧设备')],
      }),
      connections: JSON.stringify([]),
      layers: JSON.stringify({ layers: [] }),
    }
    await getStorage().set('scada_project_旧工程', JSON.stringify(legacy))

    expect(await projectStore.loadProject('旧工程')).toBe(true)
    expect(pageStore.pages).toHaveLength(1)
    expect(pageStore.pages[0].name).toBe('主页')
    expect(pageStore.pages[0].elements[0]?.name).toBe('旧设备')
    expect(pageStore.pages[0].canvasConfig.width).toBe(800)
  })
})
