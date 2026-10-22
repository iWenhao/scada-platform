import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './authStore'
import { initStorage, getStorage, LocalStorageAdapter } from '@/storage'
import { readSessionCache } from '@/storage/sessionKey'
import { authHeaders } from '@/auth/session'
import type { LoginUser } from '@/types/auth'

const alice: LoginUser = {
  id: 'u1',
  username: 'alice',
  displayName: 'Alice',
  role: 'engineer',
}

function seedSession(user: LoginUser, token = 'tok-1'): void {
  localStorage.setItem('scada_session', JSON.stringify({ user, token }))
}

/** 进入本地存储模式：后端探测失败即回落，命名空间初始为匿名 */
async function enterLocalMode(): Promise<void> {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    }),
  )
  await initStorage()
}

function activePrefix(): string {
  return (getStorage() as LocalStorageAdapter).prefix
}

describe('authStore.restoreSession', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('后端不可达（fetch 抛错）时应从缓存还原登录态', async () => {
    await enterLocalMode()
    seedSession(alice)

    const store = useAuthStore()
    await store.restoreSession()

    expect(store.user).toEqual(alice)
    expect(store.isLoggedIn).toBe(true)
    expect(store.canEdit).toBe(true)
    // 会话缓存保留，刷新后还能再恢复
    expect(readSessionCache()).not.toBeNull()
    // fetch 之前已置位的 token 不丢，离线演示的写接口才能带上 Bearer
    expect(authHeaders().authorization).toBe('Bearer tok-1')
  })

  it('后端不可达时应切到该用户的命名空间，而不是匿名区', async () => {
    await enterLocalMode()
    expect(activePrefix()).toBe('u/anonymous/')
    seedSession(alice)

    const store = useAuthStore()
    await store.restoreSession()

    // 修复前这里会调 syncLocalNamespace(undefined) 落到匿名空间，
    // 用户看到的是匿名数据而不是自己的工程
    expect(activePrefix()).toBe('u/u1/')
  })

  it('请求超时（AbortError）同样走离线还原', async () => {
    await enterLocalMode()
    seedSession(alice)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const err = new Error('The operation was aborted due to timeout')
        err.name = 'TimeoutError'
        throw err
      }),
    )

    const store = useAuthStore()
    await store.restoreSession()

    expect(store.user).toEqual(alice)
    expect(activePrefix()).toBe('u/u1/')
  })

  it('服务端拒绝 token（401）时应清缓存并保持未登录', async () => {
    // 先种子会话再进本地模式：命名空间起始就在用户区，可验证 401 后被踢回匿名
    seedSession(alice)
    await enterLocalMode()
    expect(activePrefix()).toBe('u/u1/')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'unauthorized', message: '请先登录' } }),
      })),
    )

    const store = useAuthStore()
    await store.restoreSession()

    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
    expect(readSessionCache()).toBeNull()
    expect(activePrefix()).toBe('u/anonymous/')
  })

  it('服务端可达时应以服务端返回的用户为准', async () => {
    await enterLocalMode()
    seedSession(alice)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: { ...alice, displayName: 'Alice·服务端', role: 'admin' as const } }),
      })),
    )

    const store = useAuthStore()
    await store.restoreSession()

    expect(store.displayName).toBe('Alice·服务端')
    expect(store.canManageUsers).toBe(true)
    expect(activePrefix()).toBe('u/u1/')
  })

  it('请求超时被包成 ApiRequestError(timeout) 时仍按离线还原，不清缓存', async () => {
    await enterLocalMode()
    seedSession(alice)
    // 真实浏览器里 AbortSignal.timeout 抛的是 DOMException，client 会包成 ApiRequestError
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
      }),
    )

    const store = useAuthStore()
    await store.restoreSession()

    expect(store.user).toEqual(alice)
    expect(readSessionCache()).not.toBeNull()
  })

  it('无会话缓存时不应发请求', async () => {
    await enterLocalMode()
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: alice }) }))
    vi.stubGlobal('fetch', fetchMock)

    const store = useAuthStore()
    await store.restoreSession()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.isLoggedIn).toBe(false)
  })

  it('缓存损坏（缺 token）时不应发请求且不抛错', async () => {
    await enterLocalMode()
    localStorage.setItem('scada_session', JSON.stringify({ user: alice }))
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: alice }) }))
    vi.stubGlobal('fetch', fetchMock)

    const store = useAuthStore()
    await expect(store.restoreSession()).resolves.toBeUndefined()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.isLoggedIn).toBe(false)
  })
})

describe('authStore.handleSessionExpired', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('已登录时清空 token、缓存与命名空间，并返回 true', async () => {
    await enterLocalMode()
    seedSession(alice)
    const store = useAuthStore()
    await store.restoreSession()
    expect(store.isLoggedIn).toBe(true)

    expect(store.handleSessionExpired()).toBe(true)

    expect(store.user).toBeNull()
    expect(readSessionCache()).toBeNull()
    expect(authHeaders().authorization).toBeUndefined()
    expect(activePrefix()).toBe('u/anonymous/')
  })

  it('未登录（启动恢复期、登录失败）时返回 false，不重复处理', () => {
    vi.stubGlobal('fetch', vi.fn())
    const store = useAuthStore()

    expect(store.handleSessionExpired()).toBe(false)
  })

  it('只处理一次：并发 401 的后续调用返回 false', async () => {
    await enterLocalMode()
    seedSession(alice)
    const store = useAuthStore()
    await store.restoreSession()

    expect(store.handleSessionExpired()).toBe(true)
    expect(store.handleSessionExpired()).toBe(false)
  })
})
