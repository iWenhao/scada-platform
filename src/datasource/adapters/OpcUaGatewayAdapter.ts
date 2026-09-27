import type { DataSourceAdapter, DataSourceConfig, DataUpdate } from '../types'
import { parseDataUpdate } from '../parseUpdate'

/**
 * OPC UA 网关数据源适配器
 *
 * 浏览器无法直连 OPC UA 二进制协议，本适配器通过「OPC UA WebSocket 网关」接入：
 * 网关作为 OPC UA 客户端订阅服务器节点，把数据变更以 JSON 推送给浏览器。
 *
 * 握手协议（本适配器 → 网关，连接建立后发送）：
 *   { "action": "subscribe", "nodes": ["ns=2;s=motor_1.speed"], "samplingInterval": 1000 }
 *
 * 网关 → 本适配器（支持三种消息）：
 *   1. 单点数据变更: { "nodeId": "ns=2;s=motor_1.speed", "value": 1500 }
 *   2. 批量数据变更: { "changes": [{ "nodeId": "...", "value": ... }, ...] }
 *   3. 聚合映射:     { "motor_1": { "speed": 1500 } }（与 WebSocket 适配器格式一致）
 *
 * NodeId 映射规则：取 s= 之后的 "设备.变量"，如 "ns=2;s=motor_1.speed" → 设备 motor_1 的 speed 变量。
 * 订阅节点列表通过配置 options.nodes 传入。
 */
export class OpcUaGatewayAdapter implements DataSourceAdapter {
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
    if (!config.url) {
      this.status = 'error'
      this.errorCallback?.(new Error('OPC UA 网关地址不能为空'))
      return
    }

    this.config = config
    this.manualClosed = false
    this.open()
  }

  private open() {
    if (!this.config?.url) return

    try {
      this.ws = new WebSocket(this.config.url)
    } catch (e) {
      this.status = 'error'
      this.errorCallback?.(new Error(`网关连接创建失败: ${e}`))
      return
    }

    this.ws.onopen = () => {
      this.status = 'connected'
      // 发送订阅握手
      const nodes = this.config?.options?.nodes ?? []
      this.ws?.send(JSON.stringify({
        action: 'subscribe',
        nodes,
        samplingInterval: this.config?.interval ?? 1000,
      }))
    }

    this.ws.onmessage = (event: MessageEvent) => {
      let update: DataUpdate | null = null
      try {
        update = this.parseGatewayMessage(event.data)
      } catch {
        return
      }
      if (update) {
        Object.keys(update).forEach(id => this.observedDevices.add(id))
        this.updateCallback?.(update)
      }
    }

    this.ws.onerror = () => {
      this.status = 'error'
      this.errorCallback?.(new Error('OPC UA 网关连接错误'))
    }

    this.ws.onclose = () => {
      if (this.manualClosed) {
        this.status = 'disconnected'
        return
      }
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

  /** 解析网关消息为统一 DataUpdate 格式 */
  private parseGatewayMessage(raw: unknown): DataUpdate | null {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data || typeof data !== 'object') return null

    // 格式2: 批量数据变更
    if (Array.isArray((data as any).changes)) {
      const update: DataUpdate = {}
      for (const change of (data as any).changes) {
        const pair = this.parseNodeId(change?.nodeId)
        if (pair) {
          update[pair.deviceId] = {
            ...update[pair.deviceId] as Record<string, any>,
            [pair.variable]: change.value,
          }
        }
      }
      return Object.keys(update).length ? update : null
    }

    // 格式1: 单点数据变更
    if (typeof (data as any).nodeId === 'string') {
      const pair = this.parseNodeId((data as any).nodeId)
      if (!pair) return null
      return { [pair.deviceId]: { [pair.variable]: (data as any).value } }
    }

    // 格式3: 聚合映射
    return parseDataUpdate(data)
  }

  /** 解析 NodeId: "ns=2;s=motor_1.speed" → { deviceId: "motor_1", variable: "speed" } */
  private parseNodeId(nodeId: string): { deviceId: string; variable: string } | null {
    const path = nodeId.includes('s=')
      ? nodeId.slice(nodeId.lastIndexOf('s=') + 2)
      : nodeId
    const dot = path.lastIndexOf('.')
    if (dot <= 0 || dot === path.length - 1) return null
    return { deviceId: path.slice(0, dot), variable: path.slice(dot + 1) }
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
