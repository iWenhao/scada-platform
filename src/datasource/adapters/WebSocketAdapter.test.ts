import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketAdapter } from './WebSocketAdapter'

/** 测试用 WebSocket 桩，记录实例并允许手动触发事件 */
class MockWebSocket {
  static instances: MockWebSocket[] = []
  static OPEN = 1
  static CONNECTING = 0
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState = MockWebSocket.CONNECTING
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  /** 模拟连接建立 */
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    // 与真实 WebSocket 一致：close() 会触发 onclose 回调
    this.onclose?.()
  }
}

function lastSocket(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1]
}

describe('WebSocketAdapter', () => {
  let adapter: WebSocketAdapter

  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    adapter = new WebSocketAdapter()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('应该按配置地址创建 WebSocket 连接', async () => {
    await adapter.connect({ type: 'websocket', name: 'test', url: 'ws://localhost:8080/rt' })

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(lastSocket().url).toBe('ws://localhost:8080/rt')
  })

  it('应该解析设备映射格式的消息', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'websocket', name: 'test', url: 'ws://x' })

    lastSocket().onmessage?.({ data: JSON.stringify({ motor_1: { speed: 1500 } }) })

    expect(callback).toHaveBeenCalledWith({ motor_1: { speed: 1500 } })
  })

  it('应该解析单设备对象格式的消息', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'websocket', name: 'test', url: 'ws://x' })

    lastSocket().onmessage?.({
      data: JSON.stringify({ deviceId: 'pump_1', data: { flow: 42 } }),
    })

    expect(callback).toHaveBeenCalledWith({ pump_1: { flow: 42 } })
  })

  it('应该忽略非 JSON 消息', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'websocket', name: 'test', url: 'ws://x' })

    lastSocket().onmessage?.({ data: 'not json' })

    expect(callback).not.toHaveBeenCalled()
  })

  it('应该从推送数据中记录观测到的设备', async () => {
    await adapter.connect({ type: 'websocket', name: 'test', url: 'ws://x' })

    lastSocket().onmessage?.({ data: JSON.stringify({ tank_1: { level: 10 } }) })

    expect(adapter.listDevices()).toEqual(['tank_1'])
  })

  it('意外断开且开启重连时应该自动重连', async () => {
    await adapter.connect({
      type: 'websocket',
      name: 'test',
      url: 'ws://x',
      reconnect: true,
      reconnectInterval: 3000,
    })

    // 模拟服务端断开
    lastSocket().onclose?.()
    expect(adapter.getStatus()).toBe('error')

    vi.advanceTimersByTime(3000)
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('未开启重连时意外断开不应该重连', async () => {
    await adapter.connect({ type: 'websocket', name: 'test', url: 'ws://x' })

    lastSocket().onclose?.()
    vi.advanceTimersByTime(60000)

    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('手动断开后不应该重连', async () => {
    await adapter.connect({
      type: 'websocket',
      name: 'test',
      url: 'ws://x',
      reconnect: true,
      reconnectInterval: 1000,
    })

    adapter.disconnect()
    expect(adapter.getStatus()).toBe('disconnected')

    vi.advanceTimersByTime(60000)
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('缺少地址时应该报错且不创建连接', async () => {
    const errorCallback = vi.fn()
    adapter.onError(errorCallback)

    await adapter.connect({ type: 'websocket', name: 'test' })

    expect(adapter.getStatus()).toBe('error')
    expect(errorCallback).toHaveBeenCalled()
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('连接就绪时写值应该发送 write 命令帧', async () => {
    await adapter.connect({ type: 'websocket', name: 'test', url: 'ws://x' })
    lastSocket().simulateOpen()

    await adapter.write({ deviceId: 'motor_1', variable: 'speed', value: 1200 })

    expect(lastSocket().sent).toEqual([
      JSON.stringify({ type: 'write', deviceId: 'motor_1', variable: 'speed', value: 1200 }),
    ])
  })

  it('未连接时写值应该抛错', async () => {
    await adapter.connect({ type: 'websocket', name: 'test', url: 'ws://x' })

    await expect(adapter.write({ deviceId: 'motor_1', variable: 'speed', value: 1 }))
      .rejects.toThrow('WebSocket 未连接')
  })
})
