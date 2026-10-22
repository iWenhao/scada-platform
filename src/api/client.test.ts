// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  apiFetch,
  ApiRequestError,
  DEFAULT_TIMEOUT_MS,
  setUnauthorizedHandler,
} from './client'

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

afterEach(() => {
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('成功响应拆成 data + meta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { data: { a: 1 }, meta: { etag: 'e1' } })))

    await expect(apiFetch('/x')).resolves.toEqual({ data: { a: 1 }, meta: { etag: 'e1' } })
  })

  it('401 unauthorized 触发会话失效回调，并抛 ApiRequestError', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { error: { code: 'unauthorized', message: '请先登录' } })),
    )

    const err = await apiFetch('/auth/me').catch((e) => e)

    expect(err).toBeInstanceOf(ApiRequestError)
    expect({ status: err.status, code: err.code }).toEqual({ status: 401, code: 'unauthorized' })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('登录失败的 401（login_failed）不触发会话失效回调', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { error: { code: 'login_failed', message: '用户名或口令错误' } })),
    )

    await expect(apiFetch('/auth/login')).rejects.toBeInstanceOf(ApiRequestError)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('未传 signal 时带默认超时，调用方自带的 signal 不被覆盖', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => jsonResponse(200, { data: null }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/a')
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)

    const controller = new AbortController()
    await apiFetch('/b', { signal: controller.signal })
    expect(fetchMock.mock.calls[1][1].signal).toBe(controller.signal)
    expect(DEFAULT_TIMEOUT_MS).toBeGreaterThan(0)
  })

  it('超时中断转成带中文说明的 ApiRequestError，不让 DOMException 冒到调用方', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
      }),
    )

    const err = await apiFetch('/slow').catch((e) => e)

    expect(err).toBeInstanceOf(ApiRequestError)
    expect({ status: err.status, code: err.code }).toEqual({ status: 0, code: 'timeout' })
    expect(err.message).toContain('请求超时')
  })
})
