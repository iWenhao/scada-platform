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
