import { statusEngine } from '@/status/StatusEngine'
import type { StatusRule } from '@/types/scada'

/** 元素默认状态色：无状态规则或规则未命中时使用（与画布网格/边框协调的青绿色） */
export const DEFAULT_ELEMENT_COLOR = '#8fe6d3'

/**
 * 按状态规则求元素颜色：优先级最高（数字最小）的命中规则决定颜色。
 * 编辑器画布、预览 2D 与预览 3D 共用同一口径，保证不同视图下状态观感一致。
 */
export function evaluateElementColor(
  statusRules: StatusRule[],
  data: Record<string, any>,
): string {
  return statusEngine.evaluate(statusRules, data)?.color || DEFAULT_ELEMENT_COLOR
}
