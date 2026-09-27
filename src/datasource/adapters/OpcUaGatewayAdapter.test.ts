import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpcUaGatewayAdapter } from './OpcUaGatewayAdapter'

class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.onclose?.()
  }
}

function lastSocket(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1]
}

describe('OpcUaGatewayAdapter', () => {
  let adapter: OpcUaGatewayAdapter

  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    adapter = new OpcUaGatewayAdapter()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('连接建立后应发送订阅握手', async () => {
    await adapter.connect({
      type: 'opcua',
      name: 'test',
      url: 'ws://gateway',
      interval: 2000,
      options: { nodes: ['ns=2;s=motor_1.speed', 'ns=2;s=motor_1.temp'] },
    })

    lastSocket().onopen?.()

    const handshake = JSON.parse(lastSocket().sent[0])
    expect(handshake).toEqual({
      action: 'subscribe',
      nodes: ['ns=2;s=motor_1.speed', 'ns=2;s=motor_1.temp'],
      samplingInterval: 2000,
    })
  })

  it('应解析单点数据变更并映射到设备变量', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'opcua', name: 'test', url: 'ws://gateway' })
    lastSocket().onopen?.()

    lastSocket().onmessage?.({ data: JSON.stringify({ nodeId: 'ns=2;s=motor_1.speed', value: 1500 }) })

    expect(callback).toHaveBeenCalledWith({ motor_1: { speed: 1500 } })
  })

  it('应解析批量数据变更', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'opcua', name: 'test', url: 'ws://gateway' })
    lastSocket().onopen?.()

    lastSocket().onmessage?.({
      data: JSON.stringify({
        changes: [
          { nodeId: 'ns=2;s=boiler_1.pressure', value: 8.5 },
          { nodeId: 'ns=2;s=boiler_1.level', value: 60 },
        ],
      }),
    })

    expect(callback).toHaveBeenCalledWith({
      boiler_1: { pressure: 8.5, level: 60 },
    })
  })

  it('NodeId 缺少变量段时应忽略', async () => {
    const callback = vi.fn()
    adapter.onUpdate(callback)
    await adapter.connect({ type: 'opcua', name: 'test', url: 'ws://gateway' })
    lastSocket().onopen?.()

    lastSocket().onmessage?.({ data: JSON.stringify({ nodeId: 'ns=2;s=motor_1', value: 1 }) })

    expect(callback).not.toHaveBeenCalled()
  })

  it('意外断开且开启重连时应自动重连', async () => {
    await adapter.connect({
      type: 'opcua',
      name: 'test',
      url: 'ws://gateway',
      reconnect: true,
      reconnectInterval: 2000,
    })

    lastSocket().onclose?.()
    vi.advanceTimersByTime(2000)

    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('手动断开后不应重连', async () => {
    await adapter.connect({
      type: 'opcua',
      name: 'test',
      url: 'ws://gateway',
      reconnect: true,
    })

    adapter.disconnect()
    vi.advanceTimersByTime(60000)

    expect(adapter.getStatus()).toBe('disconnected')
    expect(MockWebSocket.instances).toHaveLength(1)
  })
})
