/**
 * 远程存储适配器 set 的创建模式契约：
 * ifAbsent → 请求带 ?mode=create；服务端 409 → StorageConflictError（与一般 HTTP 故障区分）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RemoteStorageAdapter } from './remote'
import { StorageConflictError } from './errors'

const captured: { url: string; init: RequestInit }[] = []

function stubFetch(status: number, ok: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      captured.push({ url, init })
      return { status, ok } as Response
    }),
  )
}

beforeEach(() => {
  captured.length = 0
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RemoteStorageAdapter.set 创建模式', () => {
  it('ifAbsent=true 时 URL 带 mode=create', async () => {
    stubFetch(200, true)
    const storage = new RemoteStorageAdapter('/api/storage')

    await storage.set('scada_project_A', '{}', { ifAbsent: true })

    expect(captured[0].url).toContain('key=scada_project_A')
    expect(captured[0].url).toContain('mode=create')
  })

  it('不带 ifAbsent 时不加 mode=create', async () => {
    stubFetch(200, true)
    const storage = new RemoteStorageAdapter('/api/storage')

    await storage.set('scada_project_A', '{}')

    expect(captured[0].url).not.toContain('mode=create')
  })

  it('服务端返回 409 抛 StorageConflictError（判为撞名，不是普通故障）', async () => {
    stubFetch(409, false)
    const storage = new RemoteStorageAdapter('/api/storage')

    await expect(storage.set('scada_project_A', '{}', { ifAbsent: true })).rejects.toBeInstanceOf(
      StorageConflictError,
    )
  })

  it('其它非 2xx 仍抛普通 Error，不误判为撞名', async () => {
    stubFetch(500, false)
    const storage = new RemoteStorageAdapter('/api/storage')

    await expect(storage.set('scada_project_A', '{}', { ifAbsent: true })).rejects.toThrow(
      /set failed: HTTP 500/,
    )
  })
})

describe('RemoteStorageAdapter.projectIndex', () => {
  function stubFetchJson(status: number, body: unknown) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        captured.push({ url, init })
        return { status, ok: status >= 200 && status < 300, json: async () => body } as Response
      }),
    )
  }

  it('无查询参数时 GET 到裸 /storage/projects，返回归一化信封', async () => {
    stubFetchJson(200, { projects: [{ name: 'A' }], total: 40, publishedTotal: 5, matchedTotal: 40 })
    const storage = new RemoteStorageAdapter('/api/storage')

    expect(await storage.projectIndex()).toEqual({
      projects: [{ name: 'A' }],
      total: 40,
      publishedTotal: 5,
      matchedTotal: 40,
    })
    expect(captured[0].url).toBe('/api/storage/projects')
    expect(captured[0].init.method ?? undefined).toBeUndefined()
  })

  it('keyword/limit/offset 拼进 query，缺省项不拼', async () => {
    stubFetchJson(200, { projects: [] })
    const storage = new RemoteStorageAdapter('/api/storage')

    await storage.projectIndex({ keyword: '泵', limit: 12, offset: 24 })
    const url = captured[0].url
    expect(url).toContain('keyword=' + encodeURIComponent('泵'))
    expect(url).toContain('limit=12')
    expect(url).toContain('offset=24')

    // offset=0 / 无 keyword 不应出现对应参数
    await storage.projectIndex({ limit: 12, offset: 0 })
    expect(captured[1].url).toBe('/api/storage/projects?limit=12')
  })

  it('响应缺字段时回落成空数组与 0，而不是 undefined', async () => {
    stubFetchJson(200, {})
    const storage = new RemoteStorageAdapter('/api/storage')
    expect(await storage.projectIndex()).toEqual({
      projects: [],
      total: 0,
      publishedTotal: 0,
      matchedTotal: 0,
    })
  })

  it('非 2xx 抛错，交由上层回落到逐条读', async () => {
    stubFetchJson(500, {})
    const storage = new RemoteStorageAdapter('/api/storage')
    await expect(storage.projectIndex()).rejects.toThrow(/projects failed: HTTP 500/)
  })
})
