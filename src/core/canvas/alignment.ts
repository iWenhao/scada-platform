/**
 * 拖拽对齐吸附计算（纯函数，便于测试）
 */
export interface AlignBox {
  x: number
  y: number
  width: number
  height: number
}

export interface AlignResult {
  /** 吸附后的 x（未发生吸附为 null） */
  x: number | null
  /** 吸附后的 y（未发生吸附为 null） */
  y: number | null
  /** 参考线段（画布坐标 [x1, y1, x2, y2]） */
  guides: number[][]
}

const PAD = 8

/**
 * 计算拖拽中元素与其他元素的对齐吸附。
 * 分别在水平方向（左/中/右）与垂直方向（上/中/下）上找阈值内最近的匹配，
 * 吸附时生成贯穿两个元素的参考线。
 */
export function computeAlignment(
  moved: AlignBox,
  others: AlignBox[],
  threshold: number,
): AlignResult {
  const movedXs = [moved.x, moved.x + moved.width / 2, moved.x + moved.width]
  const movedYs = [moved.y, moved.y + moved.height / 2, moved.y + moved.height]

  let bestX: { dist: number; candidate: number; target: number; other: AlignBox } | null = null
  let bestY: { dist: number; candidate: number; target: number; other: AlignBox } | null = null

  for (const other of others) {
    const otherXs = [other.x, other.x + other.width / 2, other.x + other.width]
    const otherYs = [other.y, other.y + other.height / 2, other.y + other.height]

    for (const candidate of movedXs) {
      for (const target of otherXs) {
        const dist = Math.abs(candidate - target)
        if (dist <= threshold && (!bestX || dist < bestX.dist)) {
          bestX = { dist, candidate, target, other }
        }
      }
    }

    for (const candidate of movedYs) {
      for (const target of otherYs) {
        const dist = Math.abs(candidate - target)
        if (dist <= threshold && (!bestY || dist < bestY.dist)) {
          bestY = { dist, candidate, target, other }
        }
      }
    }
  }

  const guides: number[][] = []
  let snapX: number | null = null
  let snapY: number | null = null

  if (bestX) {
    snapX = moved.x + (bestX.target - bestX.candidate)
    const snapped = { ...moved, x: snapX }
    const top = Math.min(snapped.y, bestX.other.y) - PAD
    const bottom = Math.max(snapped.y + snapped.height, bestX.other.y + bestX.other.height) + PAD
    guides.push([bestX.target, top, bestX.target, bottom])
  }

  if (bestY) {
    snapY = moved.y + (bestY.target - bestY.candidate)
    const snapped = { ...moved, y: snapY }
    const left = Math.min(snapped.x, bestY.other.x) - PAD
    const right = Math.max(snapped.x + snapped.width, bestY.other.x + bestY.other.width) + PAD
    guides.push([left, bestY.target, right, bestY.target])
  }

  return { x: snapX, y: snapY, guides }
}
