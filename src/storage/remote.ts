import type { StorageAdapter, ProjectQuery, ProjectIndexPage } from './index'
import { StorageConflictError } from './errors'
import { authHeaders } from '@/auth/session'

/**
 * 远程存储适配器：对接 server/index.mjs 提供的 KV 存储服务。
 * 使项目/自定义组件持久化到服务端文件，而非浏览器 localStorage。
 */
export class RemoteStorageAdapter implements StorageAdapter {
  private get headers(): Record<string, string> {
    return authHeaders()
  }

  constructor(private base = '/api/storage') {}

  async keys(): Promise<string[]> {
    const res = await fetch(this.base + '/keys', { headers: this.headers })
    if (!res.ok) throw new Error(`keys failed: HTTP ${res.status}`)
    const body = await res.json()
    return body.keys ?? []
  }

  /**
   * 工程列表分页摘要：一次 GET 拿一页 + 全量统计，替代首页「每个工程 3 次 get 整份 JSON」。
   * 失败时抛错，由上层 projectStorage.getProjectPage 决定是否回落逐条读。
   */
  async projectIndex(query: ProjectQuery = {}): Promise<ProjectIndexPage> {
    const params = new URLSearchParams()
    if (query.keyword) params.set('keyword', query.keyword)
    if (query.limit != null) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    const qs = params.toString()
    const res = await fetch(this.base + '/projects' + (qs ? `?${qs}` : ''), { headers: this.headers })
    if (!res.ok) throw new Error(`projects failed: HTTP ${res.status}`)
    const body = await res.json()
    return {
      projects: body.projects ?? [],
      total: Number(body.total) || 0,
      publishedTotal: Number(body.publishedTotal) || 0,
      matchedTotal: Number(body.matchedTotal) || 0,
    }
  }

  async get(key: string): Promise<string | null> {
    const res = await fetch(`${this.base}/get?key=${encodeURIComponent(key)}`, {
      headers: this.headers,
    })
    if (!res.ok) return null
    const body = await res.json()
    return body.value ?? null
  }

  async set(key: string, value: string, options?: { ifAbsent?: boolean }): Promise<void> {
    // ifAbsent → 服务端 ?mode=create：判重交后端一次原子写，撞名回 409（与网络故障区分）
    const mode = options?.ifAbsent ? '&mode=create' : ''
    const res = await fetch(`${this.base}/set?key=${encodeURIComponent(key)}${mode}`, {
      method: 'PUT',
      headers: { ...this.headers, 'content-type': 'text/plain; charset=utf-8' },
      body: value,
    })
    if (res.status === 409) throw new StorageConflictError()
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
