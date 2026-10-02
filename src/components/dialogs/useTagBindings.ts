/**
 * 点位 → 画布引用的反查：数据绑定、状态规则引用与工程级报警定义。
 * 从 TagTableDialog 拆出：反查逻辑自成一体，供「画布绑定」弹窗与绑定数列使用。
 */
import { ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { usePageStore } from '@/stores/pageStore'
import { tagKey, collectConditionVariables } from '@/types/tag'
import type { TagDef } from '@/types/tag'

export function useTagBindings() {
  const projectStore = useProjectStore()
  const pageStore = usePageStore()

  const bindVisible = ref(false)
  const bindings = ref<Array<{ pageName: string; elementName: string; type: string }>>([])

  function collectBindings(tag: TagDef) {
    const rows: Array<{ pageName: string; elementName: string; type: string }> = []

    // 数据绑定（元素/图表）
    for (const page of pageStore.pages) {
      for (const el of page.elements) {
        const hit = el.dataBindings?.some(
          b =>
            b.variable === tagKey(tag) ||
            (b.variable === tag.name && (el.deviceId === tag.deviceId || !el.deviceId)),
        )
        if (hit) {
          rows.push({ pageName: page.name, elementName: el.name, type: el.type })
          continue
        }
        // 状态规则引用（着色也会因该点位变化）
        const ruleHit = el.deviceId === tag.deviceId || !el.deviceId
          ? el.statusRules?.some(r => collectConditionVariables(r.condition).includes(tag.name))
          : false
        if (ruleHit) {
          rows.push({ pageName: page.name, elementName: el.name, type: `${el.type}（状态规则）` })
        }
      }
    }

    // 报警定义（工程级，不属于任何画面）
    for (const def of projectStore.alarmDefs) {
      if (def.deviceId === tag.deviceId && def.variable === tag.name) {
        rows.push({ pageName: '—', elementName: def.name, type: '报警定义' })
      }
    }
    return rows
  }

  function bindingCount(tag: TagDef) {
    return collectBindings(tag).length
  }

  function showBindings(tag: TagDef) {
    bindings.value = collectBindings(tag)
    bindVisible.value = true
  }

  return { bindVisible, bindings, showBindings, bindingCount }
}
