// @vitest-environment node
/**
 * 登录失败限流的两维计数与解锁窗口。
 *
 * 单独测是因为这里有个容易改错的细节：`until=0` 表示「从未锁定」，
 * 若把它当成「锁已过期」参与清零判断，每次失败都会把计数重置回 1，永远攒不到阈值。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLoginGuard } from './loginGuard.mjs'

const BASE = 1_800_000_000_000
const LOCK_MS = 5 * 60 * 1000

afterEach(() => {
  vi.useRealTimers()
})

/** 只冻时钟，理由同 auth.test.ts：接管 timer 会把异步 I/O 一起拖进假时钟 */
function freezeClock(now = BASE) {
  vi.useFakeTimers({ toFake: ['Date'], now })
}

describe('createLoginGuard', () => {
  it('默认第 5 次失败才锁定，锁定期内两维都算命中', () => {
    freezeClock()
    const guard = createLoginGuard()
    const keys = ['u:admin', 'i:10.0.0.1']
    for (let i = 0; i < 4; i++) {
      guard.noteFail(keys)
      expect(guard.isLocked(keys)).toBe(false)
    }
    guard.noteFail(keys)
    expect(guard.isLocked(keys)).toBe(true)
    // 只命中来源维度也照样拒（同一来源换账号撞）
    expect(guard.isLocked(['u:other', 'i:10.0.0.1'])).toBe(true)
    vi.setSystemTime(BASE + LOCK_MS - 1)
    expect(guard.isLocked(keys)).toBe(true)
    vi.setSystemTime(BASE + LOCK_MS + 1)
    expect(guard.isLocked(keys)).toBe(false)
  })

  it('锁定过期后计数从头攒，不会永久压住账号', () => {
    freezeClock()
    const guard = createLoginGuard({ maxFails: 2, lockMs: 1000 })
    const keys = ['u:admin']
    guard.noteFail(keys)
    guard.noteFail(keys)
    expect(guard.isLocked(keys)).toBe(true)

    vi.setSystemTime(BASE + 1500)
    expect(guard.isLocked(keys)).toBe(false)
    // 这次失败应重置为「1 次」而不是接着上一次的 2 次，否则立即又被锁
    guard.noteFail(keys)
    expect(guard.isLocked(keys)).toBe(false)
    guard.noteFail(keys)
    expect(guard.isLocked(keys)).toBe(true)
  })

  it('clear 只清给定维度，另一维度不受影响', () => {
    freezeClock()
    const guard = createLoginGuard({ maxFails: 1 })
    guard.noteFail(['u:admin', 'i:10.0.0.1'])
    expect(guard.isLocked(['u:admin'])).toBe(true)

    guard.clear(['u:admin'])
    expect(guard.isLocked(['u:admin'])).toBe(false)
    expect(guard.isLocked(['i:10.0.0.1'])).toBe(true)
  })

  it('未失败过的 key 永不误锁，空 key 列表也判不锁', () => {
    freezeClock()
    const guard = createLoginGuard()
    expect(guard.isLocked(['u:nobody'])).toBe(false)
    expect(guard.isLocked([])).toBe(false)
  })
})
