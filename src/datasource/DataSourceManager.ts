import { ref } from 'vue'
import type { DataSourceConfig, DataSourceAdapter, DataUpdate } from './types'
import { MockDataAdapter } from './adapters/MockDataAdapter'

export class DataSourceManager {
  /** 当前活跃的数据源 */
  private activeAdapter: DataSourceAdapter | null = null
  
  /** 数据源配置 */
  private config: DataSourceConfig | null = null
  
  /** 最新数据快照 */
  private data = ref<Record<string, Record<string, any>>>({})
  
  /** 连接状态 */
  private connectionStatus = ref<'connected' | 'disconnected' | 'error'>('disconnected')
  
  /** 错误信息 */
  private lastError = ref<string | null>(null)

  /** 数据更新回调列表 */
  private updateCallbacks: Array<(update: DataUpdate) => void> = []

  /**
   * 获取适配器实例
   */
  private getAdapter(type: string): DataSourceAdapter {
    switch (type) {
      case 'mock':
        return new MockDataAdapter()
      // case 'websocket':
      //   return new WebSocketAdapter()
      // case 'http':
      //   return new HttpPollingAdapter()
      default:
        throw new Error(`Unknown adapter type: ${type}`)
    }
  }

  /**
   * 连接数据源
   */
  async connect(config: DataSourceConfig): Promise<void> {
    // 断开现有连接
    this.disconnect()

    this.config = config
    this.activeAdapter = this.getAdapter(config.type)

    // 监听数据更新
    this.activeAdapter.onUpdate((update: DataUpdate) => {
      // 合并更新到数据快照
      for (const [deviceId, variables] of Object.entries(update)) {
        if (!this.data.value[deviceId]) {
          this.data.value[deviceId] = {}
        }
        Object.assign(this.data.value[deviceId], variables)
      }

      // 触发回调
      this.updateCallbacks.forEach(cb => cb(update))
    })

    // 监听错误
    this.activeAdapter.onError((error: Error) => {
      this.connectionStatus.value = 'error'
      this.lastError.value = error.message
    })

    // 建立连接
    await this.activeAdapter.connect(config)
    this.connectionStatus.value = 'connected'
    this.lastError.value = null
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.activeAdapter?.disconnect()
    this.activeAdapter = null
    this.connectionStatus.value = 'disconnected'
  }

  /**
   * 注册数据更新回调
   */
  onUpdate(callback: (update: DataUpdate) => void) {
    this.updateCallbacks.push(callback)
  }

  /**
   * 移除数据更新回调
   */
  offUpdate(callback: (update: DataUpdate) => void) {
    this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback)
  }

  /**
   * 获取当前数据快照
   */
  getData() {
    return this.data.value
  }

  /**
   * 获取指定设备数据
   */
  getDeviceData(deviceId: string) {
    return this.data.value[deviceId] || {}
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return this.connectionStatus.value
  }

  /**
   * 获取错误信息
   */
  getLastError() {
    return this.lastError.value
  }
}

// 单例导出
export const dataSourceManager = new DataSourceManager()
