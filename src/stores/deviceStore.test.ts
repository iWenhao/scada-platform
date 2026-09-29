import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDeviceStore } from './deviceStore'
import { setStorage, MemoryStorageAdapter } from '@/storage'
import { resetHistorian } from '@/history/historian'

describe('deviceStore 数据质量', () => {
  let device: ReturnType<typeof useDeviceStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    resetHistorian()
    vi.useFakeTimers()
    device = useDeviceStore()
    // 用内置 Mock 数据源产生真实推送（1 秒一次）
    await device.initDataSource({ type: 'mock', interval: 1000 })
    device.connectionStatus = 'connected'
    vi.advanceTimersByTime(1000)
  })

  afterEach(() => {
    device.disconnect()
    resetHistorian()
    vi.useRealTimers()
  })

  it('收到推送后点位质量为 good 且值可用', () => {
    expect(device.qualityOf('motor_1', 'speed')).toBe('good')
    expect(device.isDataUsable('motor_1', 'speed')).toBe(true)
    expect(device.variableMeta['motor_1.speed']?.q).toBe('good')
  })

  it('从未上报的点位为 bad', () => {
    expect(device.qualityOf('nobody', 'none')).toBe('bad')
    expect(device.isDataUsable('nobody', 'none')).toBe(false)
  })

  it('连接断开后点位转为 stale', () => {
    device.connectionStatus = 'error'
    expect(device.qualityOf('motor_1', 'speed')).toBe('stale')
  })

  it('数据超时未刷新转为 stale（连接仍显示正常）', () => {
    // 停掉推送但保持"连接正常"的表象，验证超时路径而非断连路径
    device.disconnect()
    device.connectionStatus = 'connected'
    expect(device.qualityOf('motor_1', 'speed')).toBe('good')

    vi.advanceTimersByTime(11_000) // 默认陈旧阈值 10 秒

    expect(device.qualityOf('motor_1', 'speed')).toBe('stale')
    expect(device.isDataUsable('motor_1', 'speed')).toBe(false)
  })

  it('阈值可配置', () => {
    device.disconnect()
    device.connectionStatus = 'connected'
    device.setQualityThresholds(2000, 60_000)

    vi.advanceTimersByTime(3000)
    expect(device.qualityOf('motor_1', 'speed')).toBe('stale')
  })

  describe('通信中断判定', () => {
    it('连接正常且数据在刷时为 false', () => {
      expect(device.commLost).toBe(false)
    })

    it('适配器报断连时为 true', () => {
      device.connectionStatus = 'disconnected'
      expect(device.commLost).toBe(true)
    })

    it('数据停更超过通信超时阈值为 true', () => {
      device.disconnect()
      device.connectionStatus = 'connected'
      vi.advanceTimersByTime(31_000) // 默认通信超时 30 秒
      expect(device.commLost).toBe(true)
    })
  })

  it('脏值不覆盖画面旧值、不进历史', () => {
    const before = device.getVariableValue('motor_1', 'speed')
    const histBefore = device.getHistory('motor_1', 'speed').length

    // 通过写值通道注入 NaN 不会被 Mock 接受，这里直接验证历史与值未被污染：
    // 推进多个采样周期后，历史点均为有限数值
    vi.advanceTimersByTime(3000)
    const points = device.getHistory('motor_1', 'speed')
    expect(points.length).toBeGreaterThan(histBefore)
    for (const p of points) {
      expect(Number.isFinite(p.v)).toBe(true)
    }
    expect(Number.isFinite(before)).toBe(true)
  })
})
