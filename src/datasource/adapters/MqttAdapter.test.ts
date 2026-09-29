import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MqttAdapter } from './MqttAdapter'

/**
 * mqtt.js 客户端桩：EventEmitter 风格，记录订阅/发布并允许测试手动触发事件。
 */
class MockMqttClient {
  static instances: MockMqttClient[] = []

  connected = false
  reconnecting = false
  subscribed: Array<{ filter: string }> = []
  published: Array<{ topic: string; payload: string; opts?: any }> = []
  ended = false

  private handlers = new Map<string, Array<(...args: any[]) => void>>()

  constructor() {
    MockMqttClient.instances.push(this)
  }

  on(event: string, cb: (...args: any[]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push(cb)
    return this
  }

  emit(event: string, ...args: any[]) {
    for (const cb of this.handlers.get(event) ?? []) cb(...args)
  }

  subscribe(filter: string) {
    this.subscribed.push({ filter })
  }

  publish(topic: string, payload: string, opts?: any) {
    this.published.push({ topic, payload, opts })
  }

  end() {
    this.ended = true
    this.connected = false
  }

  /** 模拟连接建立 */
  simulateConnect() {
    this.connected = true
    this.emit('connect')
  }

  simulateMessage(topic: string, payload: string) {
    this.emit('message', topic, Buffer.from(payload))
  }
}

vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => new MockMqttClient()),
  },
}))

import mqtt from 'mqtt'

const mqttConnect = vi.mocked(mqtt.connect)

function lastClient(): MockMqttClient {
  return MockMqttClient.instances[MockMqttClient.instances.length - 1]
}

describe('MqttAdapter', () => {
  let adapter: MqttAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    MockMqttClient.instances = []
    adapter = new MqttAdapter()
  })

  afterEach(() => {
    adapter.disconnect()
  })

  it('连接成功后应按配置的过滤器订阅', async () => {
    await adapter.connect({
      type: 'mqtt',
      name: 'test',
      url: 'ws://broker:9001',
      options: { topicFilter: 'scada/#' },
    })
    lastClient().simulateConnect()

    expect(mqttConnect).toHaveBeenCalledWith(
      'ws://broker:9001',
      expect.objectContaining({ reconnectPeriod: 0 }),
    )
    expect(lastClient().subscribed).toEqual([{ filter: 'scada/#' }])
    expect(adapter.getStatus()).toBe('connected')
  })

  it('默认订阅 # 并开启自动重连', async () => {
    await adapter.connect({
      type: 'mqtt',
      name: 'test',
      url: 'ws://broker:9001',
      reconnect: true,
      reconnectInterval: 3000,
    })
    lastClient().simulateConnect()

    expect(lastClient().subscribed).toEqual([{ filter: '#' }])
    expect(mqttConnect).toHaveBeenCalledWith(
      'ws://broker:9001',
      expect.objectContaining({ reconnectPeriod: 3000 }),
    )
  })

  it('扁平变量表 payload 应归属主题对应的设备', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'mqtt', name: 'test', url: 'ws://broker:9001' })
    lastClient().simulateConnect()

    lastClient().simulateMessage('motor_1', JSON.stringify({ speed: 1500, temp: 60 }))

    expect(callback).toHaveBeenCalledWith({ motor_1: { speed: 1500, temp: 60 } })
    expect(adapter.listDevices()).toEqual(['motor_1'])
  })

  it('设备映射格式 payload 按其声明分发', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'mqtt', name: 'test', url: 'ws://broker:9001' })
    lastClient().simulateConnect()

    lastClient().simulateMessage('all', JSON.stringify({ motor_1: { speed: 5 } }))

    expect(callback).toHaveBeenCalledWith({ motor_1: { speed: 5 } })
  })

  it('topicPrefix 应从主题中剥离', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({
      type: 'mqtt',
      name: 'test',
      url: 'ws://broker:9001',
      options: { topicFilter: 'scada/#', topicPrefix: 'scada/' },
    })
    lastClient().simulateConnect()

    lastClient().simulateMessage('scada/motor_1', JSON.stringify({ speed: 1 }))

    expect(callback).toHaveBeenCalledWith({ motor_1: { speed: 1 } })
  })

  it('单设备对象格式 payload 同样支持', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'mqtt', name: 'test', url: 'ws://broker:9001' })
    lastClient().simulateConnect()

    lastClient().simulateMessage(
      'motor_1',
      JSON.stringify({ deviceId: 'motor_1', data: { speed: 5 } }),
    )

    expect(callback).toHaveBeenCalledWith({ motor_1: { speed: 5 } })
  })

  it('非 JSON payload 应忽略', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'mqtt', name: 'test', url: 'ws://broker:9001' })
    lastClient().simulateConnect()

    lastClient().simulateMessage('motor_1', 'not json')

    expect(callback).not.toHaveBeenCalled()
  })

  it('写值应发布到 <deviceId>/set，qos 1', async () => {
    await adapter.connect({ type: 'mqtt', name: 'test', url: 'ws://broker:9001' })
    lastClient().simulateConnect()

    await adapter.write({ deviceId: 'motor_1', variable: 'speed', value: 1200 })

    expect(lastClient().published).toEqual([
      { topic: 'motor_1/set', payload: JSON.stringify({ speed: 1200 }), opts: { qos: 1 } },
    ])
  })

  it('写值带 topicPrefix 时应拼在主题前', async () => {
    await adapter.connect({
      type: 'mqtt',
      name: 'test',
      url: 'ws://broker:9001',
      options: { topicPrefix: 'scada/' },
    })
    lastClient().simulateConnect()

    await adapter.write({ deviceId: 'motor_1', variable: 'speed', value: 1 })

    expect(lastClient().published[0].topic).toBe('scada/motor_1/set')
  })

  it('未连接时写值应抛错', async () => {
    await adapter.connect({ type: 'mqtt', name: 'test', url: 'ws://broker:9001' })

    await expect(adapter.write({ deviceId: 'm', variable: 'v', value: 1 }))
      .rejects.toThrow('MQTT 未连接')
  })

  it('disconnect 应结束客户端连接', async () => {
    await adapter.connect({ type: 'mqtt', name: 'test', url: 'ws://broker:9001' })
    lastClient().simulateConnect()

    adapter.disconnect()

    expect(lastClient().ended).toBe(true)
    expect(adapter.getStatus()).toBe('disconnected')
  })
})
