import { getStorage } from '@/storage'

const STORAGE_KEY = 'scada_component_usage'

/** 使用计数变更事件（组件面板监听后刷新「最常使用」列表） */
export const USAGE_CHANGED_EVENT = 'scada-usage-changed'

/** 组件使用计数：type → 次数 */
export type UsageCounts = Record<string, number>

/**
 * 组件使用计数库：统计每个组件类型被拖入画布的次数，
 * 驱动组件面板的「最常使用」Tab。与工程数据解耦，刷新后仍可用。
 */

/** 读取使用计数（坏数据过滤：非正数、NaN、非数字、数组一律丢弃） */
export async function loadUsageCounts(): Promise<UsageCounts> {
  const raw = await getStorage().get(STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: UsageCounts = {}
    for (const [type, count] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
        result[type] = Math.floor(count)
      }
    }
    return result
  } catch {
    return {}
  }
}

/** 记录一次组件使用（拖入画布成功后调用）：增量持久化，并广播刷新事件 */
export async function recordComponentUsage(type: string): Promise<void> {
  if (!type) return
  const counts = await loadUsageCounts()
  counts[type] = (counts[type] ?? 0) + 1
  await getStorage().set(STORAGE_KEY, JSON.stringify(counts))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USAGE_CHANGED_EVENT, { detail: { type } }))
  }
}
