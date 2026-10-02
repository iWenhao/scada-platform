import type { DataSourceAdapter, DataSourceConfig, DataUpdate, WriteRequest } from '../types'
import { parseDataUpdate } from '../parseUpdate'
import { BaseWebSocketAdapter } from './BaseWebSocketAdapter'

/**
 * WebSocket 实时数据适配器
 *
 * 消息协议：服务端推送 JSON，支持两种格式
 * 1. 设备映射: { "motor_1": { "speed": 1500 }, ... }
 * 2. 单设备对象: { "deviceId": "motor_1", "data": { "speed": 1500 } }
 *
 * 写值协议：客户端发送 { "type": "write", "deviceId": "...", "variable": "...", "value": ... }，
 * 由网关/服务端转发到现场设备（与 OpcUaGatewayAdapter 的网关约定思路一致）。
 */
export class WebSocketAdapter extends BaseWebSocketAdapter implements DataSourceAdapter {
  constructor() {
    super({
      missingUrl: 'WebSocket 地址不能为空',
      openFailed: 'WebSocket 创建失败',
      connectionError: 'WebSocket 连接错误',
    })
  }

  protected parseMessage(raw: unknown): DataUpdate | null {
    return parseDataUpdate(raw)
  }

  /** 写值：向服务端发送命令帧；连接未就绪时直接报错而不是静默丢弃 */
  async write(req: WriteRequest): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 未连接，无法下发写值')
    }
    this.ws.send(JSON.stringify({ type: 'write', ...req }))
  }
}
