import type { DataUpdate } from '../types'
import { parseDataUpdate } from '../parseUpdate'
import { BaseWebSocketAdapter } from './BaseWebSocketAdapter'

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
export class OpcUaGatewayAdapter extends BaseWebSocketAdapter {
  constructor() {
    super({
      missingUrl: 'OPC UA 网关地址不能为空',
      openFailed: '网关连接创建失败',
      connectionError: 'OPC UA 网关连接错误',
    })
  }

  /** 连接建立后向网关发送订阅握手 */
  protected onOpen() {
    this.status = 'connected'
    const nodes = this.config?.options?.nodes ?? []
    this.ws?.send(JSON.stringify({
      action: 'subscribe',
      nodes,
      samplingInterval: this.config?.interval ?? 1000,
    }))
  }

  /** 解析网关消息为统一 DataUpdate 格式 */
  protected parseMessage(raw: unknown): DataUpdate | null {
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
}
