import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  pushSample,
  flush,
  queryHistory,
  historianEnabled,
  resetHistorian,
} from './historian'
import { setStorage, MemoryStorageAdapter } from '@/storage'

describe('historian', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetHistorian()
    setStorage(new MemoryStorageAdapter())
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    resetHistorian()
    vi.unstubAllGlobals()
  })

  it('pushSample 只入队不发请求，flush 批量上报', async () => {
    fetchMock.mockResolvedValue({ ok: true })

    pushSample('motor_1.speed', 1000, 10)
    pushSample('motor_1.speed', 2000, 20)
    pushSample('tank_1.level', 1000, 50)
    expect(fetchMock).not.toHaveBeenCalled()

    const ok = await flush()
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/history/write')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body['motor_1.speed']).toEqual([{ t: 1000, v: 10 }, { t: 2000, v: 20 }])
    expect(body['tank_1.level']).toEqual([{ t: 1000, v: 50 }])
  })

  it('flush 成功后队列清空，重复 flush 不再发请求', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    pushSample('k', 1, 1)
    await flush()
    expect(await flush()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('非法采样（NaN/Infinity）不入队', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    pushSample('k', Number.NaN, 1)
    pushSample('k', 1, Number.POSITIVE_INFINITY)
    expect(await flush()).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('连续失败达到阈值后停用上报', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    for (let i = 0; i < 3; i++) {
      pushSample('k', i, i)
      await flush()
    }
    expect(historianEnabled()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    // 停用后 pushSample 与 flush 都不再发请求
    pushSample('k', 99, 99)
    expect(await flush()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('失败后重试成功会清零失败计数', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'))
    fetchMock.mockResolvedValue({ ok: true })

    pushSample('k', 1, 1)
    await flush()
    pushSample('k', 2, 2)
    await flush()

    expect(historianEnabled()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('queryHistory 解析服务端返回的点集', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ points: [{ t: 1, v: 5 }, { t: 2, v: 6 }] }),
    })

    const points = await queryHistory('motor_1.speed', 0, 100, 10)
    expect(points).toEqual([{ t: 1, v: 5 }, { t: 2, v: 6 }])
    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/history/query')
    expect(url).toContain('key=motor_1.speed')
    expect(url).toContain('maxPoints=10')
  })

  it('queryHistory 请求失败时抛错', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })
    await expect(queryHistory('k', 0, 1)).rejects.toThrow('历史查询失败')
  })
})
