/**
 * 组件 3D 体块的形状选择与几何参数（纯函数，无 three 依赖，便于单测）。
 *
 * 第一步用程序化几何表达组件：只对"一眼能看出立体形态"的设备做特化，
 * 其余组件回落为按画布占位挤出的体块 + 状态色，新组件不需要强制建模。
 * 后续给重点组件配 GLB 模型时，在这里扩展 shape 类型即可。
 */

/** 内置 3D 形状 */
export type Element3DShape = 'box' | 'cylinder' | 'cylinder-horizontal' | 'pipe'

/**
 * 组件 type → 形状的内置映射。
 * - tank/fan：立式圆柱（罐体/风机筒）
 * - pump/motor：卧式圆柱（泵壳/电机机身）
 * - pipe：低位扁长体（管廊沿地面走，与 2D 细长管件对应）
 */
const SHAPE_BY_TYPE: Record<string, Element3DShape> = {
  tank: 'cylinder',
  fan: 'cylinder',
  pump: 'cylinder-horizontal',
  motor: 'cylinder-horizontal',
  pipe: 'pipe',
}

export function getComponent3DShape(type: string): Element3DShape {
  return SHAPE_BY_TYPE[type] ?? 'box'
}

/** box 的竖直高度范围：太薄像纸片，太高喧宾夺主 */
const BOX_HEIGHT_MIN = 24
const BOX_HEIGHT_MAX = 200
/** pipe 的竖直高度范围：管廊贴地走 */
const PIPE_HEIGHT_MIN = 12
const PIPE_HEIGHT_MAX = 40
/** 立式圆柱的高度范围 */
const CYLINDER_HEIGHT_MIN = 40
const CYLINDER_HEIGHT_MAX = 300

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/** 各形状构造几何所需的参数（由场景同步层消费） */
export type GeometryParams =
  | { kind: 'box'; width: number; height: number; depth: number }
  | { kind: 'cylinder'; radius: number; height: number }
  | { kind: 'cylinder-horizontal'; radius: number; length: number }

/**
 * 由画布占位尺寸推导几何参数。
 * box：底面占地与画布一致，竖直高度按短边比例收放；
 * cylinder：半径取短边内切，高度拉高体现罐体感；
 * cylinder-horizontal：躺倒放置，半径取短边的一半，长度取长边；
 * pipe：占地不变，高度压扁。
 */
export function getGeometryParams(shape: Element3DShape, width: number, height: number): GeometryParams {
  const w = Math.max(width, 1)
  const h = Math.max(height, 1)
  switch (shape) {
    case 'cylinder':
      return {
        kind: 'cylinder',
        radius: (Math.min(w, h) / 2) * 0.9,
        height: clamp(h * 1.4, CYLINDER_HEIGHT_MIN, CYLINDER_HEIGHT_MAX),
      }
    case 'cylinder-horizontal':
      return {
        kind: 'cylinder-horizontal',
        radius: (Math.min(w, h) / 2) * 0.55,
        length: Math.max(w, h),
      }
    case 'pipe':
      return {
        kind: 'box',
        width: w,
        height: clamp(Math.min(w, h) * 1.2, PIPE_HEIGHT_MIN, PIPE_HEIGHT_MAX),
        depth: h,
      }
    case 'box':
    default:
      return {
        kind: 'box',
        width: w,
        height: clamp(Math.min(w, h) * 0.6, BOX_HEIGHT_MIN, BOX_HEIGHT_MAX),
        depth: h,
      }
  }
}
