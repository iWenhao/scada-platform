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

    // 游走有小步惯性，不会立刻跳回别的量级；用宽区间断言新值在写入值附近
    vi.advanceTimersByTime(1000)
    const tick1 = updates[updates.length - 1]
    expect(tick1.motor_1?.speed).toBeGreaterThan(900)
    expect(tick1.motor_1?.speed).toBeLessThan(1100)
  })

  it('非数字写值应该抛错且不推送', async () => {
    await adapter.connect({ type: 'mock', name: 'test', interval: 60000 })
    const updateCountBefore = updates.length

    await expect(adapter.write({ deviceId: 'motor_1', variable: 'speed', value: 'abc' }))
      .rejects.toThrow('设定值必须是数字')

    expect(updates.length).toBe(updateCountBefore)
  })

  it('数字字符串写值应该按数值处理', async () => {
    await adapter.connect({ type: 'mock', name: 'test', interval: 60000 })

    await adapter.write({ deviceId: 'valve_1', variable: 'openDegree', value: '55' })

    expect(updates[updates.length - 1]).toEqual({ valve_1: { openDegree: 55 } })
  })
})
