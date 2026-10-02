import type { DataSourceConfig, DataUpdate } from '../types'

/** 子类定制的错误文案（各协议的地址/建连/连接错误提示不同） */
export interface WsAdapterMessages {
  missingUrl: string
  openFailed: string
  connectionError: string
}

/**
 * WebSocket 系适配器公共基类。
 *
 * 承载连接生命周期（建连 / 意外断线自动重连 / 手动断开）、回调注册与
 * 「观测设备清单」收集这些与具体协议无关的样板；子类只实现两件事：
 * 1. `parseMessage()` 把推送消息解析为统一 DataUpdate（抛异常或返回 null 都视为忽略该消息）；
 * 2. 需要握手时覆写 `onOpen()`（默认仅置连接状态）。
 *
 * 错误文案通过构造参数传入，保持各适配器对用户的提示与基类化之前一致。
 */
export abstract class BaseWebSocketAdapter {
  protected ws: WebSocket | null = null
  protected config: DataSourceConfig | null = null
  private updateCallback: ((update: DataUpdate) => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null
  protected status: 'connected' | 'disconnected' | 'error' = 'disconnected'

  // 手动断开标记：为 true 时不再自动重连
  private manualClosed = false
  private reconnectTimer: number | null = null

  // 从推送数据中观测到的设备清单
  private readonly observedDevices = new Set<string>()

  constructor(private readonly messages: WsAdapterMessages) {}

  async connect(config: DataSourceConfig): Promise<void> {
    this.config = config
    this.manualClosed = false
    this.open()
  }

  protected open() {
    if (!this.config?.url) {
      this.status = 'error'
      this.errorCallback?.(new Error(this.messages.missingUrl))
      return
    }

    try {
      this.ws = new WebSocket(this.config.url)
    } catch (e) {
      this.status = 'error'
      this.errorCallback?.(new Error(`${this.messages.openFailed}: ${e}`))
      return
    }

    this.ws.onopen = () => this.onOpen()

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
      this.errorCallback?.(new Error(this.messages.connectionError))
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

  /** 连接建立钩子：子类需要握手时覆写并自行置 status */
  protected onOpen() {
    this.status = 'connected'
  }

  /** 消息解析钩子：子类实现；抛出异常或返回 null 都表示忽略该消息 */
  protected abstract parseMessage(raw: unknown): DataUpdate | null

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
