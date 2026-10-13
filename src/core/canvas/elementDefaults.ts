import type { ComponentDefinition, ComponentInstance } from '@/types/scada'

/**
 * 属性面板的默认值兜底。
 *
 * 问题链条：新建元素时 `properties` 取自组件的 `defaultConfig`（`useCanvasDrop.ts`），
 * 而绝大多数定义的 `defaultConfig` 是空的或只写了个别项，于是实例里根本没有
 * `fontSize` / `format` 这些键；`ElementGeometry` 直接 `v-model="properties[key]"`
 * 就渲染成空白输入框。但渲染层走的是 `prop(key, 默认值)`（`WidgetElement.vue`），
 * 会用 `PropertyDefinition.default` 兜底——于是出现「面板空白、画面按默认值跑」，
 * 面板显示的值与实际生效的值对不上。
 *
 * `PropertyDefinition.default` 此前在全仓没有任何消费方，这就是它失效的原因。
 *
 * 补齐只作用于面板的本地副本：用户没动过的项不会写回工程数据；改动任意一项时
 * `handlePropertyChange` 才把整份副本写回，届时默认值一并落盘，无害。
 */
export function withPropertyDefaults(
  element: ComponentInstance,
  definition?: ComponentDefinition | null,
): Record<string, any> {
  const merged: Record<string, any> = { ...(element.properties ?? {}) }
  if (!definition) return merged
  for (const prop of definition.properties ?? []) {
    // 空串不算缺省：用户在输入框里主动清空是明确意图，不该被立刻填回默认值
    if (merged[prop.key] === undefined || merged[prop.key] === null) {
      merged[prop.key] = prop.default
    }
  }
  return merged
}