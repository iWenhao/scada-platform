import { computed, ref } from 'vue'
import { getAllComponents } from '@/industrial/registry'
import { loadHiddenTypes, saveHiddenTypes } from '@/industrial/hiddenLibrary'
import type { ComponentDefinition } from '@/types/scada'

/**
 * 组件库的隐藏状态（模块级单例，与 useHistory 同构）：
 * 面板、跨 Tab 搜索与恢复弹窗共用这一份，改一处即全局生效。
 * 只影响内置组件在面板中的可见性——注册表定义保留，画布实例不受影响。
 */
const hiddenTypes = ref<string[]>([])

export function useHiddenComponents() {
  function isHidden(type: string): boolean {
    return hiddenTypes.value.includes(type)
  }

  /** 从存储恢复隐藏清单（面板挂载时调用） */
  async function refresh(): Promise<void> {
    hiddenTypes.value = await loadHiddenTypes()
  }

  async function persist(next: string[]): Promise<void> {
    hiddenTypes.value = next
    await saveHiddenTypes(next)
  }

  /** 隐藏一个组件（幂等：重复隐藏不产生多余条目） */
  async function hide(type: string): Promise<void> {
    if (!type || isHidden(type)) return
    await persist([...hiddenTypes.value, type])
  }

  /** 恢复一个组件 */
  async function show(type: string): Promise<void> {
    if (!isHidden(type)) return
    await persist(hiddenTypes.value.filter(t => t !== type))
  }

  /** 恢复全部：顺带清掉注册表里已不存在的历史条目 */
  async function showAll(): Promise<void> {
    await persist([])
  }

  /** 已隐藏且仍在注册表中的组件（供恢复弹窗展示，按分组→名称排序） */
  const hiddenComponents = computed<ComponentDefinition[]>(() =>
    getAllComponents()
      .filter(c => isHidden(c.type))
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name, 'zh')),
  )

  /** 计数与列表同源，避免历史遗留的失效 type 把角标撑大 */
  const hiddenCount = computed(() => hiddenComponents.value.length)

  return { hiddenTypes, hiddenCount, hiddenComponents, isHidden, hide, show, showAll, refresh }
}
