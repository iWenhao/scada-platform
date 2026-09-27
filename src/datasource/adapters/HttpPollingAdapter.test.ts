import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpPollingAdapter } from './HttpPollingAdapter'

describe('HttpPollingAdapter', () => {
  let adapter: HttpPollingAdapter
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    adapter = new HttpPollingAdapter()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('连接后应立即拉取一次数据', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ motor_1: { speed: 10 } }) })

    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'http', name: 'test', url: 'http://x/api', interval: 5000 })
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledWith('http://x/api', { method: 'GET' })
    expect(callback).toHaveBeenCalledWith({ motor_1: { speed: 10 } })
    expect(adapter.getStatus()).toBe('connected')
  })

  it('应按配置间隔持续轮询', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ motor_1: { speed: 1 } }) })

    await adapter.connect({ type: 'http', name: 'test', url: 'http://x/api', interval: 1000 })
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('应解析读数数组格式', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { deviceId: 'motor_1', data: { speed: 5 } },
        { deviceId: 'pump_1', data: { flow: 8 } },
      ],
    })

    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'http', name: 'test', url: 'http://x/api', interval: 5000 })
    await vi.advanceTimersByTimeAsync(0)

    expect(callback).toHaveBeenCalledWith({ motor_1: { speed: 5 }, pump_1: { flow: 8 } })
  })

  it('请求失败应报错但保持轮询，恢复后重新标记 connected', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue({ ok: true, json: async () => ({ motor_1: { speed: 1 } }) })

    const errorCallback = vi.fn()
    adapter.onError(errorCallback)
    await adapter.connect({ type: 'http', name: 'test', url: 'http://x/api', interval: 1000 })
    await vi.advanceTimersByTimeAsync(0)

    expect(adapter.getStatus()).toBe('error')
    expect(errorCallback).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(adapter.getStatus()).toBe('connected')
  })

  it('HTTP 非 2xx 应报错', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })

    const errorCallback = vi.fn()
    adapter.onError(errorCallback)
    await adapter.connect({ type: 'http', name: 'test', url: 'http://x/api', interval: 5000 })
    await vi.advanceTimersByTimeAsync(0)

    expect(errorCallback).toHaveBeenCalled()
    expect(adapter.getStatus()).toBe('error')
  })

  it('disconnect 应停止轮询', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })

    await adapter.connect({ type: 'http', name: 'test', url: 'http://x/api', interval: 1000 })
    adapter.disconnect()
    await vi.advanceTimersByTimeAsync(10000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(adapter.getStatus()).toBe('disconnected')
  })

  it('listDevices 应返回观测到的设备', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ tank_1: { level: 1 } }) })

    await adapter.connect({ type: 'http', name: 'test', url: 'http://x/api', interval: 5000 })
    await vi.advanceTimersByTimeAsync(0)

    expect(adapter.listDevices()).toEqual(['tank_1'])
  })
})
