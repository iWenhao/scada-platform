/**
 * 存储适配器抽象：项目持久化的底层存储。
 * projectStore 不直接依赖 localStorage，而是通过本模块存取，
 * 便于替换为远端存储或在无 localStorage 环境（测试/隐私模式）下降级。
 */
export interface StorageAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
  /** 枚举当前存储的全部键 */
  keys(): string[]
}

/** localStorage 实现（浏览器默认） */
export class LocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value)
  }

  remove(key: string): void {
    localStorage.removeItem(key)
  }

  keys(): string[] {
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

  get(key: string): string | null {
    return this.map.get(key) ?? null
  }

  set(key: string, value: string): void {
    this.map.set(key, value)
  }

  remove(key: string): void {
    this.map.delete(key)
  }

  keys(): string[] {
    return [...this.map.keys()]
  }
}

let active: StorageAdapter | null = null

/** 获取当前生效的存储适配器（localStorage 不可用时自动降级为内存） */
export function getStorage(): StorageAdapter {
  if (active) return active

  try {
    const probe = '__scada_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    active = new LocalStorageAdapter()
  } catch {
    active = new MemoryStorageAdapter()
  }
  return active
}

/** 注入自定义存储适配器（测试或接入远端存储时使用） */
export function setStorage(adapter: StorageAdapter): void {
  active = adapter
}
