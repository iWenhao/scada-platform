import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { defaultCanvasConfig, normalizeCanvasConfig } from '@/types/canvas'
import { defaultLayers } from '@/types/layer'
import { type ScadaPage, type ScadaPageContent } from '@/types/page'
import { createElementId, createConnectionId, createPageId } from '@/utils/id'
import { useCanvasStore } from './canvasStore'
import { useConnectionStore } from './connectionStore'
import { useLayerStore } from './layerStore'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createEmptyPageContent(): ScadaPageContent {
  return {
    canvasConfig: { ...defaultCanvasConfig },
    elements: [],
    connections: [],
    layers: clone(defaultLayers),
  }
}

/**
 * 多画面管理：pages 是工程内的画面列表，编辑器工作区始终对应 activePageId 那一张。
 * 切换画面时把 canvas/connection/layer 三个 store 的内容快照回当前页，再装入目标页。
 * 共享层（数据源、报警定义）不随画面切换。
 */
export const usePageStore = defineStore('page', () => {
  const pages = ref<ScadaPage[]>([])
  const activePageId = ref<string>('')

  const activePage = computed(() => pages.value.find(p => p.id === activePageId.value) ?? null)
  const pageCount = computed(() => pages.value.length)

  /** 从编辑 store 抓取当前工作区为一张画面的内容 */
  function captureWorkingSet(): ScadaPageContent {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    const layerStore = useLayerStore()
    return {
      canvasConfig: clone(canvasStore.canvasConfig),
      elements: clone(canvasStore.elements),
      connections: clone(connectionStore.connections),
      layers: clone(layerStore.layers),
    }
  }

  /** 把一张画面的内容装入编辑 store */
  function applyToWorkingSet(content: ScadaPageContent) {
    const canvasStore = useCanvasStore()
    const connectionStore = useConnectionStore()
    const layerStore = useLayerStore()

    // 归一化含旧工程默认底色/网格色的主题迁移（切换画面也走这里，幂等）
    canvasStore.canvasConfig = normalizeCanvasConfig(content.canvasConfig)
    canvasStore.elements = clone(content.elements || [])
    canvasStore.clearSelection()
    connectionStore.connections = clone(content.connections || [])
    connectionStore.selectedConnectionId = null
    connectionStore.drawingConnection = null
    layerStore.layers = clone(content.layers?.length ? content.layers : defaultLayers)
  }

  /** 把当前工作区写回 activePage（保存/导出/切换前调用） */
  function captureActivePage() {
    const page = pages.value.find(p => p.id === activePageId.value)
    if (!page) return
    const content = captureWorkingSet()
    page.canvasConfig = content.canvasConfig
    page.elements = content.elements
    page.connections = content.connections
    page.layers = content.layers
  }

  /**
   * 用整表替换画面列表（加载工程用）。
   * ensureActive 为 true 时保证至少一张画面，并把 active 指到合法页。
   */
  function setPages(list: ScadaPage[], preferredActiveId?: string) {
    pages.value = clone(list)
    const preferred = preferredActiveId && pages.value.some(p => p.id === preferredActiveId)
      ? preferredActiveId
      : pages.value[0]?.id || ''
    activePageId.value = preferred
    const page = pages.value.find(p => p.id === preferred)
    if (page) {
      applyToWorkingSet(page)
    } else {
      // 空工程：造一张默认画面，避免编辑器无页可编
      const empty = createEmptyPageContent()
      const home: ScadaPage = { id: createPageId(), name: '主页', ...empty }
      pages.value = [home]
      activePageId.value = home.id
      applyToWorkingSet(empty)
    }
  }

  /** 切换画面：先快照当前页，再装入目标页 */
  function switchPage(id: string): boolean {
    if (id === activePageId.value) return true
    const target = pages.value.find(p => p.id === id)
    if (!target) return false
    captureActivePage()
    activePageId.value = id
    applyToWorkingSet(target)
    return true
  }

  /** 新建空白画面并切过去 */
  function addPage(name?: string): ScadaPage {
    captureActivePage()
    const content = createEmptyPageContent()
    const page: ScadaPage = {
      id: createPageId(),
      name: name?.trim() || `画面 ${pages.value.length + 1}`,
      ...content,
    }
    pages.value.push(page)
    activePageId.value = page.id
    applyToWorkingSet(content)
    return page
  }

  /** 复制画面（含元素/连线），切到副本 */
  function duplicatePage(id: string): ScadaPage | null {
    const source = pages.value.find(p => p.id === id)
    if (!source) return null
    if (id === activePageId.value) captureActivePage()

    // 元素/连线 ID 需要重新生成，避免同工程内冲突
    const content = createEmptyPageContent()
    content.canvasConfig = clone(source.canvasConfig)
    content.layers = clone(source.layers)
    const idMap = new Map<string, string>()
    content.elements = clone(source.elements).map(el => {
      const newId = createElementId()
      idMap.set(el.id, newId)
      return { ...el, id: newId }
    })
    content.connections = clone(source.connections).map(conn => ({
      ...conn,
      id: createConnectionId(),
      sourceId: idMap.get(conn.sourceId) || conn.sourceId,
      targetId: idMap.get(conn.targetId) || conn.targetId,
    }))

    const copy: ScadaPage = {
      id: createPageId(),
      name: `${source.name} 副本`,
      ...content,
    }
    const index = pages.value.findIndex(p => p.id === id)
    pages.value.splice(index + 1, 0, copy)
    activePageId.value = copy.id
    applyToWorkingSet(content)
    return copy
  }

  /** 重命名画面；空名或重名返回 false */
  function renamePage(id: string, name: string): boolean {
    const trimmed = name.trim()
    if (!trimmed) return false
    if (pages.value.some(p => p.id !== id && p.name === trimmed)) return false
    const page = pages.value.find(p => p.id === id)
    if (!page) return false
    page.name = trimmed
    return true
  }

  /**
   * 删除画面。至少保留一张；若删的是当前页则切到相邻页。
   * 其它画面里指向该页的 navigateTo 会被清掉，避免运行时死链。
   */
  function removePage(id: string): boolean {
    if (pages.value.length <= 1) return false
    const index = pages.value.findIndex(p => p.id === id)
    if (index === -1) return false

    pages.value.splice(index, 1)

    // 清理其它页里的跳转引用（当前页已在工作区，也要处理）
    for (const page of pages.value) {
      for (const el of page.elements) {
        if (el.navigateTo === id) delete el.navigateTo
      }
    }
    const canvasStore = useCanvasStore()
    for (const el of canvasStore.elements) {
      if (el.navigateTo === id) delete el.navigateTo
    }

    if (activePageId.value === id) {
      const next = pages.value[Math.min(index, pages.value.length - 1)]
      activePageId.value = next.id
      applyToWorkingSet(next)
    }
    return true
  }

  function getPage(id: string): ScadaPage | undefined {
    return pages.value.find(p => p.id === id)
  }

  function reset() {
    const empty = createEmptyPageContent()
    const home: ScadaPage = { id: createPageId(), name: '主页', ...empty }
    pages.value = [home]
    activePageId.value = home.id
    applyToWorkingSet(empty)
  }

  return {
    pages,
    activePageId,
    activePage,
    pageCount,
    captureWorkingSet,
    captureActivePage,
    setPages,
    switchPage,
    addPage,
    duplicatePage,
    renamePage,
    removePage,
    getPage,
    reset,
  }
})
