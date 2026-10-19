/**
 * 首页「最近项目」的分页 + 服务端搜索 + 缩略图懒加载 composable。
 *
 * 从 index.vue 抽出：视图只留模板与装配，列表的加载/翻页/统计口径集中在这里
 * （AGENTS「新逻辑写进 composable 而不是往主文件堆」，也顺带把 index.vue 压回 400 行内）。
 *
 * 关键约束：搜索、总数、发布数都以服务端返回为准——分页后前端只持有一页，
 * 客户端再过滤会漏掉未加载的项，所以 keyword 变化是「带 keyword 重新查第 1 页」而不是本地筛。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getStorage, type ProjectIndexPage, type ProjectSummary } from '@/storage'
import { thumbKey } from '@/core/canvas/thumbnail'
import { useProjectStore } from '@/stores/projectStore'
import type { ProjectRow } from './types'

/** 每页条数，与服务端 queryProjectIndex 默认值对齐 */
const PAGE_SIZE = 12
/** 距底部多少像素即触发续拉 */
const LOAD_MARGIN_PX = 240

export function useProjectPaging() {
  const projectStore = useProjectStore()

  const recentProjects = ref<ProjectRow[]>([])
  /** 首屏/重查加载：为真且列表为空才铺骨架（区别于触底追加的 loadingMore） */
  const loadingProjects = ref(true)
  /** 触底加载下一页中 */
  const loadingMore = ref(false)
  /** 名称关键词：改动即触发一次带 keyword 的服务端查询（防抖 250ms） */
  const keyword = ref('')
  // 服务端返回的全量口径统计：total/publishedTotal 不随关键词变，保证统计卡精确
  const total = ref(0)
  const publishedTotal = ref(0)
  const matchedTotal = ref(0)
  /** 滚动容器：做触底检测 */
  const scrollEl = ref<HTMLElement>()

  const initialLoading = computed(() => loadingProjects.value && recentProjects.value.length === 0)
  const hasMore = computed(() => recentProjects.value.length < matchedTotal.value)
  const listSummary = computed(() => {
    const kw = keyword.value.trim()
    if (!kw) return `共 ${total.value} 个 · 按修改时间排序`
    return `匹配 ${matchedTotal.value} / ${total.value} 个项目`
  })

  /** 摘要 → 卡片行：缩略图先留空，交给卡片进视口后按需取 */
  function toRow(s: ProjectSummary): ProjectRow {
    return {
      name: s.name,
      lastModified: s.timestamp ? new Date(s.timestamp).toLocaleString() : '未知',
      publishedAt: s.publishedAt,
      pageCount: s.pageCount,
      timestamp: s.timestamp,
      hasThumbnail: s.hasThumbnail,
      thumbnail: null,
    }
  }

  function applyPage(page: ProjectIndexPage, append = false) {
    const rows = page.projects.map(toRow)
    recentProjects.value = append ? [...recentProjects.value, ...rows] : rows
    total.value = page.total
    publishedTotal.value = page.publishedTotal
    matchedTotal.value = page.matchedTotal
  }

  function query(limit: number, offset: number) {
    return projectStore.getProjectList({ keyword: keyword.value.trim(), limit, offset })
  }

  /** 拉第一页（首屏 / 关键词变化 / 清空搜索） */
  async function loadProjects() {
    loadingProjects.value = true
    try {
      applyPage(await query(PAGE_SIZE, 0))
      await nextTick()
      // 一屏没装满（图少 + 卡片矮）时自动续拉，避免「有下一页却没有滚动条」
      void maybeLoadMore()
    } finally {
      loadingProjects.value = false
    }
  }

  /** 触底续拉下一页，追加到当前列表 */
  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
      applyPage(await query(PAGE_SIZE, recentProjects.value.length), true)
    } finally {
      loadingMore.value = false
    }
  }

  /**
   * 增删改后刷新当前已加载窗口：limit 取「已加载条数与一页里的较大值」，
   * 这样删一条后列表不会突然从 36 条缩成 12 条，统计同步更新。
   */
  async function reloadWindow() {
    loadingProjects.value = true
    try {
      applyPage(await query(Math.max(recentProjects.value.length, PAGE_SIZE), 0))
    } finally {
      loadingProjects.value = false
    }
  }

  /** 滚动接近底部就续拉；拉完若仍贴底（没装满/快速滚动）继续，直到填满或到底 */
  async function maybeLoadMore() {
    const el = scrollEl.value
    if (!el || loadingProjects.value || loadingMore.value || !hasMore.value) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_MARGIN_PX) {
      await loadMore()
      await nextTick()
      if (hasMore.value && el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_MARGIN_PX) void maybeLoadMore()
    }
  }

  function onScroll() {
    void maybeLoadMore()
  }

  // 关键词防抖：停止输入 250ms 后打一次服务端搜索（跨分页才准确）
  let keywordTimer: number | undefined
  watch(keyword, () => {
    if (keywordTimer) clearTimeout(keywordTimer)
    keywordTimer = window.setTimeout(() => void loadProjects(), 250)
  })

  onMounted(() => {
    scrollEl.value?.addEventListener('scroll', onScroll, { passive: true })
    void loadProjects()
  })
  onBeforeUnmount(() => {
    scrollEl.value?.removeEventListener('scroll', onScroll)
    if (keywordTimer) clearTimeout(keywordTimer)
  })

  /**
   * 卡片滚入视口后才取缩略图：base64 是大头，一屏也就几张，避免为不可见的卡片各发一次 get。
   * recentProjects 的项是 ref 深层代理，直接改 row.thumbnail 即可驱动卡片重渲染。
   */
  async function loadThumbnail(row: ProjectRow) {
    if (!row.hasThumbnail || row.thumbnail) return
    const thumb = await getStorage().get(thumbKey(row.name))
    row.thumbnail = thumb || null
  }

  return {
    recentProjects,
    loadingProjects,
    loadingMore,
    keyword,
    total,
    publishedTotal,
    matchedTotal,
    scrollEl,
    initialLoading,
    hasMore,
    listSummary,
    loadProjects,
    reloadWindow,
    loadThumbnail,
  }
}
