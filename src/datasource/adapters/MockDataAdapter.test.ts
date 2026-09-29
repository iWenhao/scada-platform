import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MockDataAdapter } from './MockDataAdapter'
import type { DataUpdate } from '../types'

describe('MockDataAdapter', () => {
  let adapter: MockDataAdapter
  let updates: DataUpdate[]

  beforeEach(() => {
    vi.useFakeTimers()
    adapter = new MockDataAdapter()
    updates = []
    adapter.onUpdate(update => updates.push(update))
  })

  afterEach(() => {
    vi.useRealTimers()
    adapter.disconnect()
  })

  it('写值后应该立即推送一次更新', async () => {
    await adapter.connect({ type: 'mock', name: 'test', interval: 60000 })
    const updateCountBefore = updates.length

    await adapter.write({ deviceId: 'motor_1', variable: 'speed', value: 1234 })

    expect(updates.length).toBe(updateCountBefore + 1)
    expect(updates[updates.length - 1]).toEqual({ motor_1: { speed: 1234 } })
  })

  it('写值后的随机游走应该从写入值继续', async () => {
    await adapter.connect({ type: 'mock', name: 'test', interval: 1000 })
    await adapter.write({ deviceId: 'motor_1', variable: 'speed', value: 1000 })

    // 游走单步最大偏移 ±(span*rate)=±150，加均值回复 +10；断言新值仍在写入值附近量级
    vi.advanceTimersByTime(1000)
    const tick1 = updates[updates.length - 1]
    expect(tick1.motor_1?.speed).toBeGreaterThan(840)
    expect(tick1.motor_1?.speed).toBeLessThan(1170)
  })

  it('NaN 写值应该抛错且不推送（合法字符串已被支持）', async () => {
    await adapter.connect({ type: 'mock', name: 'test', interval: 60000 })
    const updateCountBefore = updates.length

    await expect(adapter.write({ deviceId: 'motor_1', variable: 'speed', value: Number.NaN }))
      .rejects.toThrow('设定值非法')

    expect(updates.length).toBe(updateCountBefore)
  })

  it('数字字符串写值按原值推送（类型由点表校验负责）', async () => {
    await adapter.connect({ type: 'mock', name: 'test', interval: 60000 })

    await adapter.write({ deviceId: 'valve_1', variable: 'openDegree', value: '55' })

    expect(updates[updates.length - 1]).toEqual({ valve_1: { openDegree: '55' } })
  })

  it('布尔与字符串写值原样推送', async () => {
    await adapter.connect({ type: 'mock', name: 'test', interval: 60000 })

    await adapter.write({ deviceId: 'motor_1', variable: 'status', value: '运行正常' })
    await adapter.write({ deviceId: 'motor_1', variable: 'running', value: true })

    expect(updates[updates.length - 2]).toEqual({ motor_1: { status: '运行正常' } })
    expect(updates[updates.length - 1]).toEqual({ motor_1: { running: true } })
  })
})