import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getAllComponents } from '@/industrial/registry'
import { loadUsageCounts, USAGE_CHANGED_EVENT, type UsageCounts } from '@/industrial/usageLibrary'

/** 「最常使用」最多列出的条数（4 行 × 3 列） */
export const MOST_USED_LIMIT = 12

/**
 * 「最常使用」Tab 的数据源：按组件类型统计拖入画布的次数（usageLibrary），
 * 取计数最高的前 MOST_USED_LIMIT 个已注册组件；同次数按名称排序保证稳定。
 * 计数变更（任意画布落件）经 scada-usage-changed 事件刷新。
 */
export function useMostUsedComponents() {
  const usageCounts = ref<UsageCounts>({})

  const mostUsed = computed(() =>
    getAllComponents()
      .filter(c => (usageCounts.value[c.type] ?? 0) > 0)
      .sort(
        (a, b) =>
          usageCounts.value[b.type] - usageCounts.value[a.type] ||
          a.name.localeCompare(b.name, 'zh'),
      )
      .slice(0, MOST_USED_LIMIT),
  )

  async function refresh() {
    usageCounts.value = await loadUsageCounts()
  }

  onMounted(() => {
    void refresh()
    window.addEventListener(USAGE_CHANGED_EVENT, refresh)
  })
  onUnmounted(() => {
    window.removeEventListener(USAGE_CHANGED_EVENT, refresh)
  })

  return { usageCounts, mostUsed, refresh }
}
