import type { DataSourceAdapter, DataSourceConfig, DataUpdate } from '../types'

export class MockDataAdapter implements DataSourceAdapter {
  private interval: number | null = null
  private updateCallback: ((update: DataUpdate) => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected'

  async connect(config: DataSourceConfig): Promise<void> {
    this.status = 'connected'
    
    // 每秒生成模拟数据
    this.interval = window.setInterval(() => {
      const update: DataUpdate = {
        motor_1: {
          speed: Math.random() * 3000,
          temp: 40 + Math.random() * 40,
          vibration: Math.random() * 10,
        },
        pump_1: {
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
      }
      this.updateCallback?.(update)
    }, 1000)
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

  onError(callback: (error: Error) => void) {
    this.errorCallback = callback
  }

  getStatus() {
    return this.status
  }
}
