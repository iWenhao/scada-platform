/**
 * 存储适配器抽象：项目持久化的底层存储。
 * projectStore 不直接依赖 localStorage，而是通过本模块存取，
 * 便于替换为远端存储（server/ 提供的 KV 服务）或在无 localStorage 环境（测试/隐私模式）下降级。
 *
 * 接口为异步：本地与远程存储统一语义。
 */
import { RemoteStorageAdapter } from './remote'

// re-export 远程适配器, 供 main.ts 使用
export { RemoteStorageAdapter } from './remote'

export interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  /** 枚举当前存储的全部键 */
  keys(): Promise<string[]>
}

/** localStorage 实现（浏览器默认） */
export class LocalStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async keys(): Promise<string[]> {
    const result: string[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key !== null) result.push(key)
      }
    } catch {
      // 隐私模式下 localStorage 可能不可用
    }
    return result
  }
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

let active: StorageAdapter | null = null

/** 获取当前生效的存储适配器（默认内存，main.ts 启动时会探测并注入） */
export function getStorage(): StorageAdapter {
  if (!active) active = new MemoryStorageAdapter()
  return active
}

/** 注入自定义存储适配器（启动时按后端可用性选择） */
export function setStorage(adapter: StorageAdapter): void {
  active = adapter
}

/**
 * 启动时探测存储后端：后端在线则使用远程存储(KV 服务), 否则回落 localStorage。
 * 由 main.ts 在挂载前调用。
 */
export async function initStorage(baseUrl = '/api'): Promise<'remote' | 'local'> {
  try {
    const res = await fetch(baseUrl + '/health', { signal: AbortSignal.timeout(1500) })
    if (res.ok) {
      setStorage(new RemoteStorageAdapter(baseUrl + '/storage'))
      return 'remote'
    }
  } catch {
    // 后端不可用, 回落本地
  }
  setStorage(new LocalStorageAdapter())
  return 'local'
}
