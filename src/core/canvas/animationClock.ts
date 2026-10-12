/**
 * 画布动画时钟：整块画布共享一个 RAF，按引用计数启停。
 *
 * 设备运转动效（滚筒旋转、皮带滚动）与管道流动都要逐帧推进。若各自开
 * requestAnimationFrame，画布上会同时存在多个帧循环、每帧触发多次图层重绘。
 * 这里统一成一个循环：只有存在订阅者时才跑，最后一个订阅者释放就停帧，
 * 因此画面上没有动效时零开销。
 *
 * 回调收到的是「距上一帧的毫秒数」而不是帧序号——按帧计数会让动效速度随显示器
 * 刷新率变化（120Hz 上转两倍快），用时间差才能让转速/流速与刷新率无关。
 */

export type FrameHandler = (dtMs: number) => void

/** 单帧最大步进：标签页切回时 now 可能一次跳几百毫秒，直接采用会让旋转瞬移 */
const MAX_FRAME_MS = 64
/** 首帧没有上一帧时间戳，按 60Hz 的名义帧长起步 */
const FALLBACK_FRAME_MS = 16.67

const handlers = new Set<FrameHandler>()
let rafId = 0
let scheduled = false
let lastFrameAt = 0

function schedule() {
  if (scheduled || handlers.size === 0) return
  if (typeof requestAnimationFrame !== 'function') return
  scheduled = true
  rafId = requestAnimationFrame(tick)
}

function tick(now: number) {
  // 先清标志：回调里可能有人释放订阅（最后一个释放会尝试取消，此刻确实没有待处理的帧）
  scheduled = false
  const dt = lastFrameAt ? Math.min(now - lastFrameAt, MAX_FRAME_MS) : FALLBACK_FRAME_MS
  lastFrameAt = now
  // 复制一份：回调中增删订阅不应影响本次遍历
  for (const handler of Array.from(handlers)) handler(dt)
  schedule()
}

/** 订阅逐帧回调；返回释放函数，最后一个订阅者释放后停掉 RAF */
export function onFrame(handler: FrameHandler): () => void {
  handlers.add(handler)
  schedule()
  let released = false
  return () => {
    if (released) return
    released = true
    handlers.delete(handler)
    if (handlers.size === 0 && scheduled) {
      scheduled = false
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }
}

/** 当前订阅数（测试与调试用） */
export function frameHandlerCount(): number {
  return handlers.size
}
