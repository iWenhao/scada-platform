/** 数据源类型 */
export type DataSourceType = 'mock' | 'websocket' | 'http' | 'opcua'

/** 数据源配置 */
export interface DataSourceConfig {
  type: DataSourceType
  name: string
  url?: string
  /** 更新/轮询间隔（毫秒） */
  interval?: number
  /** 断线后是否自动重连 */
  reconnect?: boolean
  /** 重连间隔（毫秒） */
  reconnectInterval?: number
  options?: Record<string, any>
}

/** 数据更新 */
export interface DataUpdate {
  [deviceId: string]: {
    [variable: string]: number | string | boolean
  }
}

/** 连接状态 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error'

/** 数据源适配器接口 */
export interface DataSourceAdapter {
  connect(config: DataSourceConfig): Promise<void>
  disconnect(): void
  onUpdate(callback: (update: DataUpdate) => void): void
  onError(callback: (error: Error) => void): void
  getStatus(): ConnectionStatus
  /** 可绑定的设备/变量清单（如数据源支持枚举） */
  listDevices?(): string[]
}
