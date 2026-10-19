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

  async getWithMeta(key: string): Promise<{ value: string | null; etag: string | null }> {
    const res = await fetch(`${this.base}/get?key=${encodeURIComponent(key)}`, {
      headers: this.headers,
    })
    if (!res.ok) return { value: null, etag: null }
    const body = await res.json()
    return { value: body.value ?? null, etag: body.etag ?? null }
  }

  async set(
    key: string,
    value: string,
    options?: { ifAbsent?: boolean; ifMatch?: string | null },
  ): Promise<string | null> {
    const params = new URLSearchParams({ key })
    // ifAbsent → 服务端 ?mode=create：判重交后端一次原子写，撞名回 409（reason=exists）
    if (options?.ifAbsent) params.set('mode', 'create')
    // ifMatch → 服务端 ?ifMatch=<etag>：仅当服务端版本一致时才写，不一致回 409（reason=stale）
    if (options?.ifMatch) params.set('ifMatch', options.ifMatch)
    const res = await fetch(`${this.base}/set?${params.toString()}`, {
      method: 'PUT',
      headers: { ...this.headers, 'content-type': 'text/plain; charset=utf-8' },
      body: value,
    })
    if (res.status === 409) {
      // 服务端在 body.error 里区分 exists（撞名）与 stale（版本旧）
      const body = await res.json().catch(() => ({}))
      throw new StorageConflictError(body.error === 'stale' ? 'stale' : 'exists')
    }
    if (!res.ok) throw new Error(`set failed: HTTP ${res.status}`)
    const body = await res.json().catch(() => ({}))
    // 返回服务端写入后的新 etag，供上层推进 loadedEtag
    return typeof body.etag === 'string' ? body.etag : null
  }

  async remove(key: string): Promise<void> {
    const res = await fetch(`${this.base}/remove?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: this.headers,
    })
    if (!res.ok) throw new Error(`remove failed: HTTP ${res.status}`)
  }
}
