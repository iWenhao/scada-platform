/**
 * 远程存储适配器 set 的创建模式契约：
 * ifAbsent → 请求带 ?mode=create；服务端 409 → StorageConflictError（与一般 HTTP 故障区分）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RemoteStorageAdapter } from './remote'
import { ApiRequestError } from '@/api/client'
import { StorageConflictError } from './errors'

const captured: { url: string; init: RequestInit }[] = []

/**
 * 桩一个响应。body 默认写成统一信封（成功形状 `{data, meta}`），
 * 各用例只在需要失败时覆盖成 `{error:{code,message}}`——
 * 平铺字段的老形状已经不存在，别让测试替它作证。
 */
function stubFetch(status: number, ok: boolean, body: unknown = { data: null, meta: { etag: 'abc' } }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      captured.push({ url, init })
      return { status, ok, json: async () => body } as Response
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

  it('服务端返回 409 key_exists 抛 StorageConflictError（判为撞名，不是普通故障）', async () => {
    stubFetch(409, false, { error: { code: 'key_exists', message: '该名称已存在，未覆盖' } })
    const storage = new RemoteStorageAdapter('/api/storage')

    await expect(storage.set('scada_project_A', '{}', { ifAbsent: true })).rejects.toMatchObject({
      name: 'StorageConflictError',
      reason: 'exists',
    })
  })

  it('其它非 2xx 抛 ApiRequestError，不误判为撞名', async () => {
    stubFetch(500, false, { error: { code: 'internal_error', message: '服务内部错误' } })
    const storage = new RemoteStorageAdapter('/api/storage')

    const err = await storage.set('scada_project_A', '{}', { ifAbsent: true }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiRequestError)
    expect(err).not.toBeInstanceOf(StorageConflictError)
    expect({ status: err.status, code: err.code }).toEqual({ status: 500, code: 'internal_error' })
  })

  it('ifMatch 时 URL 带 ifMatch 参数，成功后返回服务端回传的新 etag', async () => {
    stubFetch(200, true, { data: null, meta: { etag: 'v2' } })
    const storage = new RemoteStorageAdapter('/api/storage')

    const newEtag = await storage.set('scada_project_A', '{}', { ifMatch: 'v1' })

    expect(captured[0].url).toContain('ifMatch=v1')
    expect(newEtag).toBe('v2')
  })

  it('ifMatch 时服务端 409 version_stale 判为 stale（版本过期），不是 exists', async () => {
    stubFetch(409, false, {
      error: { code: 'version_stale', message: '该工程在别处已被修改，请刷新载入最新版本后再保存' },
    })
    const storage = new RemoteStorageAdapter('/api/storage')

    await expect(
      storage.set('scada_project_A', '{}', { ifMatch: 'v1' }),
    ).rejects.toMatchObject({ name: 'StorageConflictError', reason: 'stale' })
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

  it('无查询参数时 GET 到裸 /storage/projects，列表在 data、统计在 meta', async () => {
    stubFetchJson(200, {
      data: [{ name: 'A' }],
      meta: { total: 40, publishedTotal: 5, matchedTotal: 40 },
    })
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
    stubFetchJson(200, { data: [] })
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
    stubFetchJson(200, { data: null })
    const storage = new RemoteStorageAdapter('/api/storage')
    expect(await storage.projectIndex()).toEqual({
      projects: [],
      total: 0,
      publishedTotal: 0,
      matchedTotal: 0,
    })
  })

  it('非 2xx 抛错，交由上层回落到逐条读', async () => {
    stubFetchJson(500, { error: { code: 'internal_error', message: '服务内部错误' } })
    const storage = new RemoteStorageAdapter('/api/storage')
    const err = await storage.projectIndex().catch((e) => e)
    expect(err).toBeInstanceOf(ApiRequestError)
    expect({ status: err.status, code: err.code }).toEqual({ status: 500, code: 'internal_error' })
  })
})
