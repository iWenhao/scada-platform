import { statusEngine } from '@/status/StatusEngine'
import type { StatusRule } from '@/types/scada'

/** 元素默认状态色：无状态规则或规则未命中时使用（与画布网格/边框协调的青绿色） */
export const DEFAULT_ELEMENT_COLOR = '#8fe6d3'

/**
 * 「未绑定」色：元素接不到可信数据时使用，灰。
 *
 * 这一档是**系统固定**的，不在 `statusRules` 里、用户不可配也不可覆盖，优先级高于
 * 一切用户规则。为什么必须放在规则之外：条件求值时缺失变量被强转成 `0`
 * （`Number(data[v] ?? 0)`），于是「没绑数据」和「变量等于 0」在引擎眼里是同一件事，
 * 用户写不出能把这两者区分开的条件。靠用户配一条 `state = 0 → 灰` 来冒充未绑定是巧合
 * 不是机制——换成 `temp > 80` 这类规则，未绑定就会掉到兜底青绿，与灰毫无关系。
 */
export const UNBOUND_ELEMENT_COLOR = '#8c8c8c'

/** 元素状态求值结果 */
export interface ElementStateResult {
  /** 最终线条颜色 */
  color: string
  /** 命中的用户规则；未绑定或未命中时为 null */
  rule: StatusRule | null
  /** 未绑定（没有接到可信数据） */
  unbound: boolean
}

/**
 * 元素状态求值：先判未绑定，再按用户规则首匹配。
 *
 * `data` 传 `null` 表示「该元素接不到可信数据」——调用方（useElementVisuals）负责判定，
 * 判定口径是「元素没有任何绑定变量取到可信值」。无状态组件（`statusRules` 为空）没有
 * 未绑定概念，直接走默认色。
 */
export function evaluateElementState(
  statusRules: StatusRule[] | undefined,
  data: Record<string, any> | null,
): ElementStateResult {
  if (!statusRules || statusRules.length === 0) {
    return { color: DEFAULT_ELEMENT_COLOR, rule: null, unbound: false }
  }
  if (!data) {
    return { color: UNBOUND_ELEMENT_COLOR, rule: null, unbound: true }
  }
  const rule = statusEngine.evaluate(statusRules, data)
  return {
    color: rule?.color || DEFAULT_ELEMENT_COLOR,
    rule: rule ?? null,
    unbound: false,
  }
}

/**
 * 按状态规则求元素颜色：优先级最高（数字最小）的命中规则决定颜色。
 * 编辑器画布与预览页共用同一口径，保证不同渲染风格下状态观感一致。
 *
 * 只关心颜色、拿不到「可信/未绑定」信息的调用方用这个（data 一律视为可信）。
 * 需要区分未绑定的走 `evaluateElementState`。
 */
export function evaluateElementColor(
  statusRules: StatusRule[],
  data: Record<string, any>,
): string {
  return evaluateElementState(statusRules, data ?? null).color
}
