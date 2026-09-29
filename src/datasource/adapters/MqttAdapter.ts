import mqtt from 'mqtt'
import type { DataSourceAdapter, DataSourceConfig, DataUpdate, WriteRequest } from '../types'
import { parseDataUpdate } from '../parseUpdate'

/**
 * MQTT over WebSocket 适配器（浏览器可原生直连，无需网关）。
 *
 * 主题约定：
 *   - 订阅 `options.topicFilter`（默认 `#`）
 *   - 设备 ID = 去除 `options.topicPrefix`（默认空）后的完整 topic；
 *     例如订阅 `scada/#` 且 topicPrefix 为 `scada/` 时，topic `scada/motor_1` → 设备 `motor_1`
 *   - payload 支持两种：
 *     1) 扁平变量表（MQTT 惯用，推荐）：`{"speed": 1500, "temp": 60}`，归属本主题设备
 *     2) 统一格式：单设备对象 `{"deviceId":"motor_1","data":{...}}` 或读数数组
 *   - 写值发布到 `${topicPrefix}${deviceId}/set`，payload 为 `{ 变量: 值 }` 的 JSON，
 *     由现场侧程序（Node-RED / 网关服务）订阅并下发到设备
 */
export class MqttAdapter implements DataSourceAdapter {
  private client: mqtt.MqttClient | null = null
  private config: DataSourceConfig | null = null
  private updateCallback: ((update: DataUpdate) => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected'

  private readonly observedDevices = new Set<string>()

  async connect(config: DataSourceConfig): Promise<void> {
    this.config = config
    const opts = config.options ?? {}

    if (!config.url) {
      this.status = 'error'
      this.errorCallback?.(new Error('MQTT Broker 地址不能为空'))
      return
    }

    this.client = mqtt.connect(config.url, {
      username: typeof opts.username === 'string' ? opts.username : undefined,
      password: typeof opts.password === 'string' ? opts.password : undefined,
      clientId: typeof opts.clientId === 'string' ? opts.clientId : undefined,
      // mqtt.js 内置自动重连：关闭重连时把周期设为 0
      reconnectPeriod: config.reconnect ? (config.reconnectInterval ?? 5000) : 0,
      connectTimeout: 10_000,
    })

    this.client.on('connect', () => {
      this.status = 'connected'
      const filter = typeof opts.topicFilter === 'string' ? opts.topicFilter : '#'
      this.client?.subscribe(filter)
    })

    this.client.on('message', (topic, payload) => {
      const deviceId = this.deviceIdFromTopic(topic)
      if (!deviceId) return
      const raw = payload.toString()
      try {
        // 优先按统一格式解析（单设备对象 / 读数数组 / 设备映射）；
        // 解析不出时退回 MQTT 惯用的扁平变量表：payload 即该主题设备的变量键值
        // （如 `{"speed": 1500}`），这正是单主题单设备场景最常见的发布方式
        const parsed = parseDataUpdate(raw)
        const update: DataUpdate = {}
        if (parsed) {
          for (const [dev, vars] of Object.entries(parsed)) {
            update[dev] = { ...update[dev], ...vars }
          }
        } else {
          update[deviceId] = JSON.parse(raw)
        }
        if (Object.keys(update).length === 0) return
        for (const id of Object.keys(update)) this.observedDevices.add(id)
        this.updateCallback?.(update)
      } catch {
        // 非 JSON payload 忽略
      }
    })

    this.client.on('error', () => {
      this.status = 'error'
      this.errorCallback?.(new Error('MQTT 连接错误'))
    })

    this.client.on('close', () => {
      // mqtt.js 自动重连中会反复 close；只有不重连时才算断开
      if (!this.client?.reconnecting) {
        this.status = this.status === 'connected' && config.reconnect ? 'error' : 'disconnected'
      }
    })
  }

  private deviceIdFromTopic(topic: string): string | null {
    const prefix = typeof this.config?.options?.topicPrefix === 'string'
      ? this.config.options.topicPrefix
      : ''
    const id = prefix && topic.startsWith(prefix) ? topic.slice(prefix.length) : topic
    return id || null
  }

  disconnect() {
    this.client?.end(true)
    this.client = null
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

  /** 从推送消息中观测到的设备清单 */
  listDevices(): string[] {
    return [...this.observedDevices]
  }

  /** 写值：发布到 `<prefix><deviceId>/set`，payload 为单变量键值 JSON */
  async write(req: WriteRequest): Promise<void> {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT 未连接，无法下发写值')
    }
    const prefix = typeof this.config?.options?.topicPrefix === 'string'
      ? this.config.options.topicPrefix
      : ''
    const topic = `${prefix}${req.deviceId}/set`
    // qos 1 至少送达一次；现场写值宁可靠重试也不愿静默丢失
    this.client.publish(topic, JSON.stringify({ [req.variable]: req.value }), { qos: 1 })
  }
}
