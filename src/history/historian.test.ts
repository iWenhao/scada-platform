import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  pushSample,
  flush,
  queryHistory,
  historianEnabled,
  historianBackend,
  resetHistorian,
} from './historian'
import { setStorage, MemoryStorageAdapter, getStorage, initStorage, storageMode } from '@/storage'

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

  describe('本地降级路径（后端不在线）', () => {
    it('flush 写入存储抽象而非发请求', async () => {
      pushSample('motor_1.speed', 1000, 10)
      pushSample('motor_1.speed', 2000, 20)

      expect(await flush()).toBe(true)
      expect(fetchMock).not.toHaveBeenCalled()
      const raw = await getStorage().get('history:motor_1.speed:19700101')
      expect(JSON.parse(raw!)).toEqual([{ t: 1000, v: 10 }, { t: 2000, v: 20 }])
    })

    it('多次 flush 合并为同一天分片并按时序', async () => {
      pushSample('k', 3000, 3)
      await flush()
      pushSample('k', 1000, 1)
      await flush()

      const raw = await getStorage().get('history:k:19700101')
      expect(JSON.parse(raw!)).toEqual([{ t: 1000, v: 1 }, { t: 3000, v: 3 }])
    })

    it('本地查询按时间区间过滤并抽稀', async () => {
      pushSample('k', 1000, 1)
      pushSample('k', 2000, 2)
      pushSample('k', 3000, 3)
      await flush()

      const all = await queryHistory('k', 0, 10_000)
      expect(all).toEqual([{ t: 1000, v: 1 }, { t: 2000, v: 2 }, { t: 3000, v: 3 }])

      const part = await queryHistory('k', 1500, 2500)
      expect(part).toEqual([{ t: 2000, v: 2 }])

      const sparse = await queryHistory('k', 0, 10_000, 2)
      expect(sparse).toEqual([{ t: 1000, v: 1 }, { t: 3000, v: 3 }])
    })

    it('本地模式下 historianBackend 报告 local', () => {
      expect(historianBackend()).toBe('local')
    })
  })

  describe('远程上报路径（存储后端在线）', () => {
    /** 切换到远程模式：initStorage 探测 /health 成功后内部置为 remote */
    async function switchToRemote() {
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).endsWith('/health')) return { ok: true }
        return { ok: true, json: async () => ({ ok: true, points: [] }) }
      })
      await initStorage()
      expect(storageMode()).toBe('remote')
    }

    it('flush 批量 POST 到服务端', async () => {
      await switchToRemote()
      pushSample('motor_1.speed', 1000, 10)
      pushSample('tank_1.level', 1000, 50)

      expect(await flush()).toBe(true)
      const writeCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/history/write'))
      const body = JSON.parse(writeCall![1].body)
      expect(body['motor_1.speed']).toEqual([{ t: 1000, v: 10 }])
      expect(body['tank_1.level']).toEqual([{ t: 1000, v: 50 }])
      expect(historianBackend()).toBe('remote')
    })

    it('flush 成功后队列清空，重复 flush 不再写', async () => {
      await switchToRemote()
      pushSample('k', 1, 1)
      await flush()
      const before = fetchMock.mock.calls.filter(([url]) => String(url).includes('/history/write')).length

      expect(await flush()).toBe(true)
      const after = fetchMock.mock.calls.filter(([url]) => String(url).includes('/history/write')).length
      expect(after).toBe(before)
    })

    it('非法采样（NaN/Infinity）不入队', async () => {
      await switchToRemote()
      pushSample('k', Number.NaN, 1)
      pushSample('k', 1, Number.POSITIVE_INFINITY)
      expect(await flush()).toBe(true)
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/history/write'))).toBe(false)
    })

    it('连续失败达到阈值后停用上报', async () => {
      await switchToRemote()
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).endsWith('/health')) return { ok: true }
        throw new Error('network down')
      })

      for (let i = 0; i < 3; i++) {
        pushSample('k', i, i)
        await flush()
      }
      expect(historianEnabled()).toBe(false)

      const before = fetchMock.mock.calls.filter(([url]) => String(url).includes('/history/write')).length
      pushSample('k', 99, 99)
      expect(await flush()).toBe(true)
      const after = fetchMock.mock.calls.filter(([url]) => String(url).includes('/history/write')).length
      expect(after).toBe(before)
    })

    it('查询失败时抛错', async () => {
      await switchToRemote()
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).endsWith('/health')) return { ok: true }
        return { ok: false, status: 500 }
      })
      await expect(queryHistory('k', 0, 1)).rejects.toThrow('历史查询失败')
    })
  })
})
