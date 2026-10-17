import { getStorage } from '@/storage'

const STORAGE_KEY = 'scada_hidden_components'

/**
 * 组件库隐藏清单的存储层：只负责读写「被从组件库移除的内置组件 type」列表。
 *
 * 内置组件的定义写死在 src/industrial/** 里，删除只能做成隐藏：注册表保留定义
 * （画布上已放置的实例照常渲染与取数），面板按这份清单过滤掉。属库级设置，
 * 与工程数据解耦——一份全局生效，换项目仍然隐藏。响应式状态在 useHiddenComponents。
 */

/** 读取隐藏清单（坏数据按空处理，非字符串项丢弃） */
export async function loadHiddenTypes(): Promise<string[]> {
  const raw = await getStorage().get(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((v): v is string => typeof v === 'string' && v.length > 0))]
  } catch {
    return []
  }
}

/** 覆盖写入隐藏清单 */
export async function saveHiddenTypes(types: string[]): Promise<void> {
  await getStorage().set(STORAGE_KEY, JSON.stringify([...new Set(types)]))
}
