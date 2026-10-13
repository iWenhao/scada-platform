import type { ComponentDefinition, ComponentInstance, PropertyDefinition } from '@/types/scada'

/** 某个属性的取值不合法，面板据此提示「已按默认显示」 */
export interface PropertyNotice {
  /** 属性键（与 PropertyDefinition.key 一致） */
  key: string
  /** 属性显示名，用于提示文案 */
  label: string
  /** 实例里存着的原值（原样保留，不做类型转换） */
  raw: unknown
  /** 实际生效的兜底值 */
  fallback: unknown
}

export interface NormalizedProperties {
  /** 面板回显用的值：缺失与非法都已按定义兜底 */
  values: Record<string, any>
  /** 非法的项，按 key 索引；缺失属正常情况，不进这里 */
  notices: Record<string, PropertyNotice>
}

/**
 * 取值域：select 的合法值来自 options，其余类型不在面板侧校验。
 *
 * 数字的 min/max 故意不校验——`el-input-number` 交互时自带 clamp，
 * 而「字号 200」在画面上与「字号 24」的差别远小于提示噪音的代价。
 */
function isAcceptable(prop: PropertyDefinition, value: unknown): boolean {
  if (prop.type !== 'select') return true
  return (prop.options ?? []).some((o) => o.value === value)
}

/**
 * 属性面板的取值规范化：把「缺失」与「非法」两类都按定义兜底。
 *
 * 背景一（缺失）：新建元素的 `properties` 取自组件的 `defaultConfig`
 * （`useCanvasDrop.ts`），而多数定义的 `defaultConfig` 是空的或只写了个别项，
 * 实例里根本没有 `fontSize` / `format` 这些键；面板直接 `v-model="properties[key]"`
 * 会渲染成空白，而渲染层走 `prop(key, 默认值)` 兜底——出现「面板空白、画面按默认值跑」。
 *
 * 背景二（非法）：工程 JSON 可被手改，也可由首页「导入 JSON」引入他方文件，
 * 存进去的枚举值不在 options 里。此时渲染层有兜底（`formatDateTime` 与
 * `nextTickDelay` 都会先 `isClockFormatId` 校验、非法则退回默认），不会崩也不
 * 会停摆，但面板显示原值、画面画默认，用户无从察觉那份配置压根没生效。
 *
 * 两条都不动实例数据：规范化只作用于面板的本地副本，用户没改过的项不会写回工程
 * 文件；改动任一项时 `handlePropertyChange` 才把整份落盘，届时兜底值一并写入，无害。
 *
 * 非法项另给一条提示而不是静默回显——手改配置的人需要知道自己写错了什么，
 * 静默换成默认位等于骗他说那个格式已经生效。
 */
export function normalizeProperties(
  element: ComponentInstance,
  definition?: ComponentDefinition | null,
): NormalizedProperties {
  const values: Record<string, any> = { ...(element.properties ?? {}) }
  const notices: Record<string, PropertyNotice> = {}
  if (!definition) return { values, notices }

  for (const prop of definition.properties ?? []) {
    const raw = values[prop.key]

    // 空串不算缺失：用户在输入框里主动清空是明确意图，不该被立刻填回默认值
    if (raw === undefined || raw === null) {
      values[prop.key] = prop.default
      continue
    }

    // false / 0 是有效值，不在这里被误判；select 才是唯一有取值域的类型
    if (!isAcceptable(prop, raw)) {
      values[prop.key] = prop.default
      notices[prop.key] = { key: prop.key, label: prop.label, raw, fallback: prop.default }
    }
  }
  return { values, notices }
}