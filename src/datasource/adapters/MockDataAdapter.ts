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
        conveyor_1: {
          speed: Math.random() > 0.25 ? Math.random() * 2 : 0,
          load: Math.random() * 100,
        },
        shearer_1: {
          speed: Math.random() > 0.3 ? Math.random() * 8 : 0,
          load: Math.random() * 100,
        },
        coal_bunker_1: {
          level: 20 + Math.random() * 75,
          temp: 20 + Math.random() * 40,
        },
        roadheader_1: {
          cutting: Math.random() > 0.35 ? 1 : 0,
          load: 30 + Math.random() * 70,
        },
        fan_1: {
          speed: Math.random() > 0.15 ? 1480 : 0,
          vibration: Math.random() * 8,
        },
        gas_sensor_1: {
          density: Math.random() * 1.5,
        },
        hoist_1: {
          speed: Math.random() > 0.3 ? (Math.random() > 0.5 ? 3.5 : -3.5) : 0,
          load: 20 + Math.random() * 75,
        },
        turbine_1: {
          speed: 2900 + Math.random() * 420,
          temp: 400 + Math.random() * 120,
        },
        generator_1: {
          power: Math.random() * 620,
          voltage: 10.5 + Math.random() * 0.8,
        },
        boiler_1: {
          pressure: 4 + Math.random() * 10,
          level: 30 + Math.random() * 60,
          temp: 300 + Math.random() * 200,
        },
        transformer_1: {
          temp: 35 + Math.random() * 70,
          load: Math.random() * 120,
        },
        breaker_1: {
          closed: Math.random() > 0.3 ? 1 : 0,
        },
        reactor_1: {
          temp: 40 + Math.random() * 220,
          pressure: 0.5 + Math.random() * 2,
          level: 40 + Math.random() * 55,
        },
        heat_exchanger_1: {
          flow: Math.random() > 0.25 ? Math.random() * 100 : 0,
          tempIn: 60 + Math.random() * 60,
          tempOut: 30 + Math.random() * 20,
        },
        sediment_tank_1: {
          level: 20 + Math.random() * 75,
          turbidity: Math.random() * 60,
        },
        sub_pump_1: {
          running: Math.random() > 0.4 ? 1 : 0,
          flow: Math.random() * 200,
        },
      }
      this.updateCallback?.(update)
    }, interval)
  }

  /** 可绑定的模拟设备清单 */
  listDevices(): string[] {
    return [
      'motor_1', 'pump_1', 'valve_1', 'tank_1', 'pipe_1', 'sensor_1',
      'conveyor_1', 'fan_1', 'gas_sensor_1', 'hoist_1',
      'shearer_1', 'roadheader_1', 'coal_bunker_1',
      'turbine_1', 'generator_1', 'boiler_1', 'transformer_1', 'breaker_1',
      'reactor_1', 'heat_exchanger_1',
      'sediment_tank_1', 'sub_pump_1',
    ]
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
