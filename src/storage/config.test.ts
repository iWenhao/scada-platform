import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveApiBase, resolveApiToken } from './config'
import { RemoteStorageAdapter } from './remote'

describe('resolveApiBase / resolveApiToken', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('未配置时默认 /api 且无 Token', () => {
    vi.stubEnv('VITE_API_BASE', '')
    vi.stubEnv('VITE_API_TOKEN', '')
    expect(resolveApiBase()).toBe('/api')
    expect(resolveApiToken()).toBeNull()
  })

  it('应读取 VITE_API_BASE 并去掉尾部斜杠', () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.com/api/')
    expect(resolveApiBase()).toBe('https://api.example.com/api')
  })

  it('应读取 VITE_API_TOKEN', () => {
    vi.stubEnv('VITE_API_TOKEN', '  secret  ')
    expect(resolveApiToken()).toBe('secret')
  })
})

describe('RemoteStorageAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('配置 Token 时应带上 Authorization 头', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, keys: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = new RemoteStorageAdapter('https://api.example.com/api/storage', 'tok-1')
    await adapter.keys()

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/storage/keys', {
      headers: { authorization: 'Bearer tok-1' },
    })
  })

  it('无 Token 时不带 Authorization 头', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, value: null }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = new RemoteStorageAdapter('/api/storage', null)
    await adapter.get('k')

    expect(fetchMock).toHaveBeenCalledWith('/api/storage/get?key=k', { headers: {} })
  })
})
