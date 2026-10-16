import { ref, computed, watch, type Ref } from 'vue'
import { getComponentsByGroup } from '@/industrial/registry'
import { BASIC_GROUPS, INDUSTRY_GROUPS, getGroupName } from '@/industrial/panelRegistry'
import type { ComponentDefinition, ComponentGroup } from '@/types/scada'
import type { DeviceTemplate } from '@/types/template'

/** 组件面板的 Tab 键（顺序即面板顺序：最常使用 / 基础 / 行业） */
export type PanelTabKey = 'most' | 'basic' | 'industry'

/** Tab 顺序：搜索自动激活时按这个顺序找第一个有命中的 Tab */
const TAB_ORDER: PanelTabKey[] = ['most', 'basic', 'industry']

/**
 * 组件面板的跨 Tab 搜索：在 最常使用 / 基础 / 行业 三个 Tab 与自定义组件
 * （自定义图形 + 设备模板，无独立 Tab）的全集里按「组件名 / type / 分组显示名」
 * 匹配（大小写不敏感，设备模板按名称匹配）。
 *
 * 行为约定：
 * - 有命中的 Tab 自动激活——当前 Tab 无命中时，跳到 TAB_ORDER 里第一个有命中的 Tab；
 * - 有命中的 Tab 带圆点标记（hitTabs），命中的组件在列表里高亮；
 * - 非命中项在搜索态下由各 Tab 的视图过滤掉，不堆在面板里；
 * - 自定义组件没有 Tab，搜索命中时以「自定义组件」小节附在结果末尾（卡片保留编辑/删除）。
 */
export function useComponentSearch(opts: {
  activeTab: Ref<PanelTabKey>
  mostUsed: Ref<ComponentDefinition[]>
  customDefs: Ref<ComponentDefinition[]>
  deviceTemplates: Ref<DeviceTemplate[]>
}) {
  const searchQuery = ref('')
  const query = computed(() => searchQuery.value.trim().toLowerCase())
  const searching = computed(() => query.value.length > 0)

  /** 命中判定：组件名 / type / 分组显示名 */
  function isHit(comp: ComponentDefinition): boolean {
    if (!searching.value) return true
    const q = query.value
    return (
      comp.name.toLowerCase().includes(q) ||
      comp.type.toLowerCase().includes(q) ||
      getGroupName(comp.group).toLowerCase().includes(q)
    )
  }

  /** 按注册分组取组件并拍平（保持组内注册顺序） */
  function collectGroups(groups: ComponentGroup[]): ComponentDefinition[] {
    const map = getComponentsByGroup()
    return groups.flatMap(g => map.get(g) ?? [])
  }

  const basicHits = computed(() => collectGroups(BASIC_GROUPS).filter(isHit))
  const industryHits = computed(() => collectGroups(INDUSTRY_GROUPS).filter(isHit))
  const mostUsedHits = computed(() => (searching.value ? opts.mostUsed.value.filter(isHit) : opts.mostUsed.value))

  /** 自定义侧（无 Tab）的命中：模板 + 自定义图形 */
  const customHits = computed(() => opts.customDefs.value.filter(isHit))
  const templateHits = computed(() =>
    searching.value
      ? opts.deviceTemplates.value.filter(t => t.name.toLowerCase().includes(query.value))
      : opts.deviceTemplates.value,
  )
  const customHasHits = computed(() => customHits.value.length > 0 || templateHits.value.length > 0)

  /** 有命中的 Tab 集合（非搜索态为空集：不显示圆点） */
  const hitTabs = computed(() => {
    const set = new Set<PanelTabKey>()
    if (!searching.value) return set
    if (mostUsedHits.value.length) set.add('most')
    if (basicHits.value.length) set.add('basic')
    if (industryHits.value.length) set.add('industry')
    return set
  })

  /** 全部命中（含自定义侧）：驱动全局空态 */
  const anyHits = computed(() => hitTabs.value.size > 0 || customHasHits.value)

  // 当前 Tab 无命中时，自动激活第一个有命中的 Tab（用户手动切 Tab 不受影响）
  watch(query, q => {
    if (!q) return
    if (hitTabs.value.has(opts.activeTab.value)) return
    const first = TAB_ORDER.find(t => hitTabs.value.has(t))
    if (first) opts.activeTab.value = first
  })

  return {
    searchQuery,
    query,
    searching,
    isHit,
    hitTabs,
    anyHits,
    customHasHits,
    basicHits,
    industryHits,
    mostUsedHits,
    customHits,
    templateHits,
  }
}
