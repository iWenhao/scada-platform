/**
 * 存储适配器抽象：项目持久化的底层存储。
 * projectStore 不直接依赖 localStorage，而是通过本模块存取，
 * 便于替换为远端存储（server/ 提供的 KV 服务）或在无 localStorage 环境（测试/隐私模式）下降级。
 *
 * 接口为异步：本地与远程存储统一语义。
 */
import { RemoteStorageAdapter } from './remote'
import { resolveApiBase } from './config'
import { resolveLocalNamespace, namespaceForUser } from './namespace'
import { LOCAL_SESSION_KEY } from './sessionKey'

// re-export 远程适配器与连接配置, 供 main.ts / 部署环境使用
export { RemoteStorageAdapter } from './remote'
export { resolveApiBase, resolveApiToken } from './config'
export { resolveLocalNamespace, namespaceForUser, ANONYMOUS_NAMESPACE } from './namespace'

export interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  /** 枚举当前存储的全部键 */
  keys(): Promise<string[]>
}

/** 本地迁移完成标志（键名刻意不以 scada_ 开头，避免被误判为待迁移数据） */
const LOCAL_MIGRATED_FLAG = 'scada:local-migrated'

/**
 * localStorage 实现（后端离线时的回落）。
 * prefix 为用户命名空间：键按 `u/<userId>/<key>` 组织，
 * keys() 只枚举本空间的键并剥离前缀，对上层完全透明。
 */
export class LocalStorageAdapter implements StorageAdapter {
  /**
   * 不参与命名空间隔离的键：会话缓存是"本机记住上次登录"的凭据，
   * 若随用户空间隔离，登出切到匿名空间后就再也读不到它了。
   */
  private static readonly GLOBAL_KEYS = new Set([LOCAL_SESSION_KEY])

  constructor(readonly prefix = '') {}

  private full(key: string): string {
    if (!this.prefix || LocalStorageAdapter.GLOBAL_KEYS.has(key)) return key
    return this.prefix + key
  }

  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this.full(key))
    } catch {
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(this.full(key), value)
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.full(key))
  }

  async keys(): Promise<string[]> {
    const result: string[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key === null) continue
        if (this.prefix) {
          if (key.startsWith(this.prefix)) result.push(key.slice(this.prefix.length))
        } else {
          result.push(key)
        }
      }
    } catch {
      // 隐私模式下 localStorage 可能不可用
    }
    return result
  }
}

/**
 * 把启用命名空间之前落在本机的 scada_* 数据复制到当前命名空间。
 * 只复制不删除：旧键留作回退，避免迁移出错时数据凭空消失；
 * 标志位保证只执行一次，不会每次启动都复制一遍。
 */
export function migrateLocalPrefix(prefix: string): number {
  if (!prefix) return 0
  let migrated = 0
  try {
    if (localStorage.getItem(LOCAL_MIGRATED_FLAG)) return 0
    const legacy: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('scada_')) legacy.push(key)
    }
    for (const key of legacy) {
      const value = localStorage.getItem(key)
      const target = prefix + key
      if (value !== null && localStorage.getItem(target) === null) {
        localStorage.setItem(target, value)
        migrated++
      }
    }
    localStorage.setItem(LOCAL_MIGRATED_FLAG, '1')
  } catch {
    // 隐私模式/配额不足时放弃迁移，不影响正常存取
  }
  return migrated
}

/** 内存实现（测试与降级用，页面刷新即丢失） */
export class MemoryStorageAdapter implements StorageAdapter {
  private map = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null
  }

  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value)
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key)
  }

  async keys(): Promise<string[]> {
    return [...this.map.keys()]
  }
}

export type StorageMode = 'remote' | 'local' | 'memory'

let active: StorageAdapter | null = null
let mode: StorageMode = 'memory'

/** 获取当前生效的存储适配器（默认内存，main.ts 启动时会探测并注入） */
export function getStorage(): StorageAdapter {
  if (!active) active = new MemoryStorageAdapter()
  return active
}

/** 注入自定义存储适配器（启动时按后端可用性选择） */
export function setStorage(adapter: StorageAdapter): void {
  active = adapter
}

/** 当前存储模式：历史上报等能力需据此决定走服务端接口还是本地降级 */
export function storageMode(): StorageMode {
  return mode
}

/**
 * 启动时探测存储后端：后端在线则使用远程存储(KV 服务), 否则回落 localStorage。
 * baseUrl 默认取 VITE_API_BASE(未配置时为 '/api'), 便于前后端分开部署。
 * namespace 为本地模式下的用户命名空间，缺省时从本地会话缓存解析。
 * 由 main.ts 在挂载前调用。
 */
export async function initStorage(
  baseUrl = resolveApiBase(),
  namespace?: string,
): Promise<'remote' | 'local'> {
  try {
    const res = await fetch(baseUrl + '/health', {
      signal: AbortSignal.timeout(1500),
    })
    if (res.ok) {
      setStorage(new RemoteStorageAdapter(baseUrl + '/storage'))
      mode = 'remote'
      return 'remote'
    }
  } catch {
    // 后端不可用, 回落本地
  }

  const prefix = namespace ?? resolveLocalNamespace()
  setStorage(new LocalStorageAdapter(prefix))
  mode = 'local'
  migrateLocalPrefix(prefix)
  return 'local'
}

/**
 * 会话恢复/登录/登出后对齐本地命名空间。
 * 远程模式下隔离由服务端 scope 决定，此处无需处理；
 * 本地模式下切换到目标用户的键空间（不做迁移——切换账号后看见的应属于自己的数据）。
 */
export function syncLocalNamespace(userId?: string | null): void {
  if (mode !== 'local') return
  const adapter = getStorage()
  if (!(adapter instanceof LocalStorageAdapter)) return
  const next = namespaceForUser(userId)
  if (adapter.prefix === next) return
  setStorage(new LocalStorageAdapter(next))
}
