import { ref } from 'vue'
import type { DataSourceConfig, DataSourceAdapter, DataUpdate, WriteRequest } from './types'
import { MockDataAdapter } from './adapters/MockDataAdapter'
import { WebSocketAdapter } from './adapters/WebSocketAdapter'
import { HttpPollingAdapter } from './adapters/HttpPollingAdapter'
import { OpcUaGatewayAdapter } from './adapters/OpcUaGatewayAdapter'
import { MqttAdapter } from './adapters/MqttAdapter'

export class DataSourceManager {
  /** 当前活跃的数据源 */
  private activeAdapter: DataSourceAdapter | null = null

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
      case 'websocket':
        return new WebSocketAdapter()
      case 'http':
        return new HttpPollingAdapter()
      case 'opcua':
        return new OpcUaGatewayAdapter()
      case 'mqtt':
        return new MqttAdapter()
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
   * 获取当前数据源可绑定的设备清单
   */
  listDevices(): string[] {
    return this.activeAdapter?.listDevices?.() ?? []
  }

  /** 当前数据源是否支持写值（UI 据此决定是否展示控制入口） */
  canWrite(): boolean {
    return typeof this.activeAdapter?.write === 'function'
  }

  /**
   * 下行写值：委托当前活跃适配器。
   * 未连接、数据源不支持写值或适配器执行失败都直接抛错，由 UI 层提示操作者。
   */
  async write(req: WriteRequest): Promise<void> {
    const write = this.activeAdapter?.write
    if (typeof write !== 'function') {
      throw new Error('当前数据源不支持写值')
    }
    await write.call(this.activeAdapter, req)
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
