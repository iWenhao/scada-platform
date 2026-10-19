import type { StorageAdapter, ProjectQuery, ProjectIndexPage } from './index'
import { StorageConflictError } from './errors'
import { apiFetch, ApiRequestError, type ApiResult } from '@/api/client'

/**
 * 远程存储适配器：对接 server/index.mjs 提供的 KV 存储服务。
 * 使项目/自定义组件持久化到服务端文件，而非浏览器 localStorage。
 *
 * 响应拆解统一走 @/api/client：本类只负责「KV 语义 → 存储层语义」的映射，
 * 比如把服务端的 409 code 翻成 StorageConflictError 的 reason。
 */
export class RemoteStorageAdapter implements StorageAdapter {
  constructor(private base = '/api/storage') {}

  async keys(): Promise<string[]> {
    const { data } = await apiFetch<string[]>('/keys', { base: this.base })
    return Array.isArray(data) ? data : []
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
    const { data, meta } = await apiFetch<ProjectIndexPage['projects']>(
      '/projects' + (qs ? `?${qs}` : ''),
      { base: this.base },
    )
    return {
      projects: Array.isArray(data) ? data : [],
      total: Number(meta.total) || 0,
      publishedTotal: Number(meta.publishedTotal) || 0,
      matchedTotal: Number(meta.matchedTotal) || 0,
    }
  }

  async get(key: string): Promise<string | null> {
    const { data } = await this.read(key)
    return (data ?? null) as string | null
  }

  async getWithMeta(key: string): Promise<{ value: string | null; etag: string | null }> {
    const { data, meta } = await this.read(key)
    return { value: (data ?? null) as string | null, etag: (meta.etag as string) ?? null }
  }

  /**
   * 读一个键。后端把值放 data、版本指纹放 meta.etag（改造前两者平铺在顶层）。
   * 读失败一律按「无数据」返回而不抛错：启动期的键探测（主题/画布/连线/工程列表）
   * 都依赖这个语义，后端明确报错也不能把整个编辑器卡在加载页上。
   */
  private async read(key: string): Promise<ApiResult<string | null>> {
    try {
      return await apiFetch<string>(`/get?key=${encodeURIComponent(key)}`, { base: this.base })
    } catch {
      return { data: null, meta: {} }
    }
  }

  async set(
    key: string,
    value: string,
    options?: { ifAbsent?: boolean; ifMatch?: string | null },
  ): Promise<string | null> {
    const params = new URLSearchParams({ key })
    // ifAbsent → 服务端 ?mode=create：判重交后端一次原子写，撞名回 409 key_exists
    if (options?.ifAbsent) params.set('mode', 'create')
    // ifMatch → 服务端 ?ifMatch=<etag>：仅当服务端版本一致时才写，不一致回 409 version_stale
    if (options?.ifMatch) params.set('ifMatch', options.ifMatch)
    try {
      const { meta } = await apiFetch<null>(`/set?${params.toString()}`, {
        base: this.base,
        method: 'PUT',
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        body: value,
      })
      // 返回服务端写入后的新 etag，供上层推进 loadedEtag
      return typeof meta.etag === 'string' ? meta.etag : null
    } catch (e) {
      // 409 是并发语义而非故障：转成 StorageConflictError，上层据此走改名/刷新提示
      if (e instanceof ApiRequestError && e.status === 409) {
        throw new StorageConflictError(e.code === 'version_stale' ? 'stale' : 'exists', e.message)
      }
      throw e
    }
  }

  async remove(key: string): Promise<void> {
    await apiFetch(`/remove?key=${encodeURIComponent(key)}`, { base: this.base, method: 'DELETE' })
  }
}
