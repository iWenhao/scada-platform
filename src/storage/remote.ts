import type { StorageAdapter } from './index'
import { resolveApiToken } from './config'

/**
 * 远程存储适配器：对接 server/index.mjs 提供的 KV 存储服务。
 * 使项目/自定义组件持久化到服务端文件，而非浏览器 localStorage。
 */
export class RemoteStorageAdapter implements StorageAdapter {
  private headers: Record<string, string>

  constructor(
    private base = '/api/storage',
    token: string | null = resolveApiToken(),
  ) {
    this.headers = token ? { authorization: `Bearer ${token}` } : {}
  }

  async keys(): Promise<string[]> {
    const res = await fetch(this.base + '/keys', { headers: this.headers })
    if (!res.ok) throw new Error(`keys failed: HTTP ${res.status}`)
    const body = await res.json()
    return body.keys ?? []
  }

  async get(key: string): Promise<string | null> {
    const res = await fetch(`${this.base}/get?key=${encodeURIComponent(key)}`, {
      headers: this.headers,
    })
    if (!res.ok) return null
    const body = await res.json()
    return body.value ?? null
  }

  async set(key: string, value: string): Promise<void> {
    const res = await fetch(`${this.base}/set?key=${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { ...this.headers, 'content-type': 'text/plain; charset=utf-8' },
      body: value,
    })
    if (!res.ok) throw new Error(`set failed: HTTP ${res.status}`)
  }

  async remove(key: string): Promise<void> {
    const res = await fetch(`${this.base}/remove?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: this.headers,
    })
    if (!res.ok) throw new Error(`remove failed: HTTP ${res.status}`)
  }
}
