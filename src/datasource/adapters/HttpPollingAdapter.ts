import type { DataSourceAdapter, DataSourceConfig, DataUpdate } from '../types'
import { parseDataUpdate } from '../parseUpdate'

/**
 * HTTP 轮询数据源适配器
 *
 * 按 interval 定时 GET 配置地址，响应体支持 parseDataUpdate 的三种格式。
 * 单次请求失败只标记 error 并继续轮询（自愈），手动断开才停止。
 */
export class HttpPollingAdapter implements DataSourceAdapter {
  private config: DataSourceConfig | null = null
  private timer: number | null = null
  private updateCallback: ((update: DataUpdate) => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected'

  // 从响应中观测到的设备清单
  private readonly observedDevices = new Set<string>()

  async connect(config: DataSourceConfig): Promise<void> {
    if (!config.url) {
      this.status = 'error'
      this.errorCallback?.(new Error('HTTP 轮询地址不能为空'))
      return
    }

    this.config = config
    this.status = 'connected'

    // 立即拉取一次，之后按间隔轮询
    this.poll()
    const interval = config.interval || 5000
    this.timer = window.setInterval(() => this.poll(), interval)
  }

  private async poll(): Promise<void> {
    const url = this.config?.url
    if (!url) return

    try {
      const res = await fetch(url, { method: 'GET' })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      const update = parseDataUpdate(data)
      if (update) {
        Object.keys(update).forEach(id => this.observedDevices.add(id))
        this.updateCallback?.(update)
        this.status = 'connected'
      }
    } catch (e) {
      this.status = 'error'
      this.errorCallback?.(e instanceof Error ? e : new Error(String(e)))
    }
  }

  disconnect() {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.config = null
    this.status = 'disconnected'
  }

  onUpdate(callback: (update: DataUpdate) => void) {
    this.updateCallback = callback
  }

  onError(callback: (error: Error) => void) {
    this.errorCallback = callback
  }

  getStatus() {
    return this.status
  }

  /** 从响应中观测到的设备清单 */
  listDevices(): string[] {
    return [...this.observedDevices]
  }
}
