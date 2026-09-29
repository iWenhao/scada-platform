import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DataSourceManager } from './DataSourceManager'

describe('DataSourceManager', () => {
  let manager: DataSourceManager

  beforeEach(() => {
    manager = new DataSourceManager()
  })

  describe('connect', () => {
    it('应该连接mock数据源', async () => {
      await manager.connect({ type: 'mock', name: 'test' })
      expect(manager.getStatus()).toBe('connected')
    })

    it('应该断开现有连接后再连接新数据源', async () => {
      await manager.connect({ type: 'mock', name: 'test1' })
      expect(manager.getStatus()).toBe('connected')

      await manager.connect({ type: 'mock', name: 'test2' })
      expect(manager.getStatus()).toBe('connected')
    })

    it('应该抛出未知适配器类型的错误', async () => {
      await expect(
        manager.connect({ type: 'unknown' as any, name: 'test' })
      ).rejects.toThrow('Unknown adapter type: unknown')
    })
  })

  describe('disconnect', () => {
    it('应该断开连接', async () => {
      await manager.connect({ type: 'mock', name: 'test' })
      manager.disconnect()
      expect(manager.getStatus()).toBe('disconnected')
    })
  })

  describe('数据更新', () => {
    it('应该注册和触发数据更新回调', async () => {
      const callback = vi.fn()
      manager.onUpdate(callback)

      await manager.connect({ type: 'mock', name: 'test' })

      // 等待模拟数据更新
      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(callback).toHaveBeenCalled()
    })

    it('应该移除数据更新回调', async () => {
      const callback = vi.fn()
      manager.onUpdate(callback)
      manager.offUpdate(callback)

      await manager.connect({ type: 'mock', name: 'test' })

      // 等待模拟数据更新
      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('getDeviceData', () => {
    it('应该返回设备数据', async () => {
      await manager.connect({ type: 'mock', name: 'test' })

      // 等待模拟数据更新
      await new Promise(resolve => setTimeout(resolve, 1100))

      const data = manager.getDeviceData('motor_1')
      expect(data).toBeDefined()
      expect(typeof data.speed).toBe('number')
    })

    it('应该返回空对象对于未知设备', () => {
      const data = manager.getDeviceData('unknown_device')
      expect(data).toEqual({})
    })
  })

  describe('write 写值', () => {
    it('未连接时写值应该抛错', async () => {
      await expect(manager.write({ deviceId: 'motor_1', variable: 'speed', value: 1 }))
        .rejects.toThrow('当前数据源不支持写值')
      expect(manager.canWrite()).toBe(false)
    })

    it('应该透传给支持写值的适配器', async () => {
      await manager.connect({ type: 'mock', name: 'test' })

      expect(manager.canWrite()).toBe(true)
      await expect(manager.write({ deviceId: 'motor_1', variable: 'speed', value: 800 }))
        .resolves.toBeUndefined()
      // Mock 写值立即生效
      expect(manager.getDeviceData('motor_1').speed).toBe(800)
    })

    it('不支持写值的数据源应该抛错', async () => {
      // HttpPolling 适配器未实现 write；打桩 fetch 避免真实网络请求
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
      await manager.connect({ type: 'http', name: 'test', url: 'http://x/api', interval: 60000 })

      expect(manager.canWrite()).toBe(false)
      await expect(manager.write({ deviceId: 'motor_1', variable: 'speed', value: 1 }))
        .rejects.toThrow('当前数据源不支持写值')
      vi.unstubAllGlobals()
    })
  })
})
