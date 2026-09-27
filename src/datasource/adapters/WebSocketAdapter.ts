import type { DataSourceAdapter, DataSourceConfig, DataUpdate } from '../types'

/**
 * WebSocket 实时数据适配器
 *
 * 消息协议：服务端推送 JSON，支持两种格式
 * 1. 设备映射: { "motor_1": { "speed": 1500 }, ... }
 * 2. 单设备对象: { "deviceId": "motor_1", "data": { "speed": 1500 } }
 */
export class WebSocketAdapter implements DataSourceAdapter {
  private ws: WebSocket | null = null
  private config: DataSourceConfig | null = null
  private updateCallback: ((update: DataUpdate) => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected'

  // 手动断开标记：为 true 时不再自动重连
  private manualClosed = false
  private reconnectTimer: number | null = null

  // 从推送数据中观测到的设备清单
  private readonly observedDevices = new Set<string>()

  async connect(config: DataSourceConfig): Promise<void> {
    this.config = config
    this.manualClosed = false
    this.open()
  }

  private open() {
    if (!this.config?.url) {
      this.status = 'error'
      this.errorCallback?.(new Error('WebSocket 地址不能为空'))
      return
    }

    try {
      this.ws = new WebSocket(this.config.url)
    } catch (e) {
      this.status = 'error'
      this.errorCallback?.(new Error(`WebSocket 创建失败: ${e}`))
      return
    }

    this.ws.onopen = () => {
      this.status = 'connected'
    }

    this.ws.onmessage = (event: MessageEvent) => {
      let update: DataUpdate | null = null
      try {
        update = this.parseMessage(event.data)
      } catch {
        // 非 JSON 消息忽略
        return
      }
      if (update) {
        Object.keys(update).forEach(id => this.observedDevices.add(id))
        this.updateCallback?.(update)
      }
    }

    this.ws.onerror = () => {
      this.status = 'error'
      this.errorCallback?.(new Error('WebSocket 连接错误'))
    }

    this.ws.onclose = () => {
      if (this.manualClosed) {
        this.status = 'disconnected'
        return
      }
      // 意外断开，进入重连流程
      this.status = 'error'
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.manualClosed || !this.config?.reconnect) return
    if (this.reconnectTimer !== null) return

    const interval = this.config.reconnectInterval || 5000
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (!this.manualClosed) {
        this.open()
      }
    }, interval)
  }

  /** 解析服务端消息为统一 DataUpdate 格式 */
  private parseMessage(raw: unknown): DataUpdate | null {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw

    if (!data || typeof data !== 'object') return null

    // 格式2: { deviceId, data | variables }
    if (typeof (data as any).deviceId === 'string') {
      const variables = (data as any).data ?? (data as any).variables ?? {}
      return { [(data as any).deviceId]: variables }
    }

    // 格式1: { deviceId: { 变量: 值 } }
    const update: DataUpdate = {}
    for (const [deviceId, variables] of Object.entries(data as Record<string, unknown>)) {
      if (variables && typeof variables === 'object') {
        update[deviceId] = variables as Record<string, any>
      }
    }
    return Object.keys(update).length ? update : null
  }

  disconnect() {
    this.manualClosed = true
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
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

  /** 从推送数据中观测到的设备清单 */
  listDevices(): string[] {
    return [...this.observedDevices]
  }
}
