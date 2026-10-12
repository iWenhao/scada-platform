import { describe, it, expect, vi, afterEach } from 'vitest'
import { onFrame, frameHandlerCount } from './animationClock'

/**
 * 共享动画时钟是管道流动与设备运转动效的唯一帧源，它有两条硬约束：
 * 1. 无论多少订阅者都只开一个 RAF（否则画布上会有多套帧循环重复重绘）；
 * 2. 回调必须收到毫秒时间差——按帧计数会让动效速度随刷新率变化。
 */
function stubRaf() {
  const rafCalls: Array<FrameRequestCallback> = []
  const cancelCalls: number[] = []
  let id = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCalls.push(cb)
    return ++id
  })
  vi.stubGlobal('cancelAnimationFrame', (rafId: number) => {
    cancelCalls.push(rafId)
  })
  return { rafCalls, cancelCalls }
}

describe('onFrame 共享帧循环', () => {
  const releases: Array<() => void> = []

  afterEach(() => {
    releases.splice(0).forEach(release => release())
    vi.unstubAllGlobals()
  })

  function subscribe(handler: (dt: number) => void) {
    const release = onFrame(handler)
    releases.push(release)
    return release
  }

  it('多个订阅者共享同一个 RAF，最后一个释放才停帧', () => {
    const { rafCalls, cancelCalls } = stubRaf()

    const release1 = subscribe(() => {})
    const release2 = subscribe(() => {})
    expect(rafCalls).toHaveLength(1)

    release1()
    expect(cancelCalls).toHaveLength(0)
    release2()
    expect(cancelCalls).toHaveLength(1)
    expect(frameHandlerCount()).toBe(0)
  })

  it('回调收到帧间隔毫秒数，标签页切回的大跳变被限幅', () => {
    const { rafCalls } = stubRaf()
    const seen: number[] = []
    subscribe(dt => seen.push(dt))

    rafCalls[0](1000)
    rafCalls[0](2000)
    rafCalls[0](2016)

    // 首帧没有上一帧时间戳，按 60Hz 名义帧长起步
    expect(seen[0]).toBeCloseTo(16.67, 2)
    // 1000ms 的跳变被钳到 64ms，否则旋转会瞬移一大截
    expect(seen[1]).toBe(64)
    expect(seen[2]).toBe(16)
  })

  it('释放后不再收到回调，也不会留下空转的帧循环', () => {
    const { rafCalls, cancelCalls } = stubRaf()
    let hits = 0
    const release = subscribe(() => {
      hits++
    })

    release()
    expect(cancelCalls).toHaveLength(1)

    // 已被取消的帧即使被外部误调用，也不应再触达回调
    rafCalls[0](100)
    expect(hits).toBe(0)
    expect(frameHandlerCount()).toBe(0)
  })

  it('回调中释放自身订阅不会留下空转的帧循环', () => {
    const { rafCalls, cancelCalls } = stubRaf()
    let release: (() => void) | null = null
    const seen: number[] = []
    release = subscribe(dt => {
      seen.push(dt)
      release?.()
    })

    rafCalls[0](1000)
    expect(seen).toHaveLength(1)
    expect(frameHandlerCount()).toBe(0)
    // 帧内释放时 scheduled 已被清零、没有待处理的帧，因此无需取消
    expect(cancelCalls).toHaveLength(0)
  })

  it('未提供 requestAnimationFrame 时静默降级，不抛错', () => {
    vi.stubGlobal('requestAnimationFrame', undefined)
    expect(() => subscribe(() => {})).not.toThrow()
    expect(frameHandlerCount()).toBe(1)
  })
})
