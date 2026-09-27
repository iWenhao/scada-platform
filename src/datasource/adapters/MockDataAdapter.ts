import type { DataSourceAdapter, DataSourceConfig, DataUpdate } from '../types'

export class MockDataAdapter implements DataSourceAdapter {
  private interval: number | null = null
  private updateCallback: ((update: DataUpdate) => void) | null = null
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected'

  async connect(config: DataSourceConfig): Promise<void> {
    this.status = 'connected'
    const interval = config.interval || 1000

    // 按配置间隔生成模拟数据
    this.interval = window.setInterval(() => {
      const update: DataUpdate = {
        motor_1: {
          speed: Math.random() * 3000,
          temp: 40 + Math.random() * 40,
          vibration: Math.random() * 10,
        },
        pump_1: {
          speed: Math.random() * 3000,
          flow: Math.random() * 100,
          pressure: Math.random() * 10,
        },
        valve_1: {
          openDegree: Math.random() > 0.5 ? 100 : 0,
        },
        tank_1: {
          level: Math.random() * 100,
          temp: 20 + Math.random() * 30,
        },
        pipe_1: {
          flowRate: Math.random() > 0.3 ? Math.random() * 100 : 0,
        },
        sensor_1: {
          value: Math.random() * 120,
        },
      }
      this.updateCallback?.(update)
    }, interval)
  }

  /** 可绑定的模拟设备清单 */
  listDevices(): string[] {
    return ['motor_1', 'pump_1', 'valve_1', 'tank_1', 'pipe_1', 'sensor_1']
  }

  disconnect() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.status = 'disconnected'
  }

  onUpdate(callback: (update: DataUpdate) => void) {
    this.updateCallback = callback
  }

  onError(_callback: (error: Error) => void) {
    // 模拟数据源不会产生错误
  }

  getStatus() {
    return this.status
  }
}
