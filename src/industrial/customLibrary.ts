import { getStorage } from '@/storage'
import { registerComponent, getAllComponents } from './registry'
import type { ComponentDefinition } from '@/types/scada'

const STORAGE_KEY = 'scada_custom_components'

/**
 * 自定义组件库：注册并持久化用户在页面上创建的组件。
 * 与项目数据解耦——自定义组件属于"库"，刷新后仍然可用。
 */

/** 启动时调用：从存储恢复自定义组件并注册（按 type 去重，并回写清理存储） */
export function loadCustomComponents(): ComponentDefinition[] {
  const raw = getStorage().get(STORAGE_KEY)
  if (!raw) return []

  try {
    const defs = JSON.parse(raw) as ComponentDefinition[]
    const unique = new Map<string, ComponentDefinition>()
    defs.forEach(d => unique.set(d.type, d))
    const result = [...unique.values()]
    result.forEach(registerComponent)
    getStorage().set(STORAGE_KEY, JSON.stringify(result))
    return result
  } catch {
    return []
  }
}

/** 注册并持久化一个自定义组件（同 type 幂等覆盖） */
export function addCustomComponent(def: ComponentDefinition): void {
  registerComponent(def)
  const list = getCustomComponents().filter(c => c.type !== def.type)
  list.push(def)
  getStorage().set(STORAGE_KEY, JSON.stringify(list))
}

/** 当前全部自定义组件（来自注册表） */
export function getCustomComponents(): ComponentDefinition[] {
  return getAllComponents().filter(c => c.group === 'custom')
}
