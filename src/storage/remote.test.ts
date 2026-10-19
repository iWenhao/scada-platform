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

  it('GET 到 /storage/projects 并回传 projects 数组', async () => {
    const projects = [{ name: 'A', timestamp: 1, pageCount: 2, publishedAt: null, hasThumbnail: true }]
    stubFetchJson(200, { projects })
    const storage = new RemoteStorageAdapter('/api/storage')

    expect(await storage.projectIndex()).toEqual(projects)
    expect(captured[0].url).toBe('/api/storage/projects')
    expect(captured[0].init.method ?? undefined).toBeUndefined()
  })

  it('响应缺 projects 字段时回落空数组，而不是 undefined', async () => {
    stubFetchJson(200, {})
    const storage = new RemoteStorageAdapter('/api/storage')
    expect(await storage.projectIndex()).toEqual([])
  })

  it('非 2xx 抛错，交由上层回落到逐条读', async () => {
    stubFetchJson(500, {})
    const storage = new RemoteStorageAdapter('/api/storage')
    await expect(storage.projectIndex()).rejects.toThrow(/projects failed: HTTP 500/)
  })
})
