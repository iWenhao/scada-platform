import type { DataSourceAdapter, DataSourceConfig, DataUpdate } from '../types'

/**
 * 模拟数据源。
 *
 * 数值采用均值回复的随机游走（离散 OU 过程）而非逐次独立抽样：
 * 独立抽样会让每个 tick 的数字毫无关联，趋势图画成一片白噪声，
 * 报警条件也每秒随机进出，报警列表疯狂闪烁。加入游走惯性后，
 * 数据呈现斜坡与平台，逼近工业现场的真实观感。
 */
export class MockDataAdapter implements DataSourceAdapter {
  private interval: number | null = null
  private updateCallback: ((update: DataUpdate) => void) | null = null
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected'

  /** 上一次输出的数值，按 `${设备}.${变量}` 缓存 */
  private values = new Map<string, number>()

  /**
   * 带惯性的连续量：在上次值基础上小步游走，并向量程中点轻微回复，
   * 避免在边界长期堆积（堆积会让报警一直挂在上面不再恢复）。
   */
  private walk(device: string, variable: string, min: number, max: number, rate = 0.06): number {
    const key = `${device}.${variable}`
    const span = max - min
    const prev = this.values.get(key) ?? min + span * 0.5
    const mean = min + span * 0.5
    const next = prev + (mean - prev) * 0.02 + (Math.random() - 0.5) * span * rate * 2
    const clamped = Math.min(max, Math.max(min, next))
    this.values.set(key, clamped)
    return Number(clamped.toFixed(2))
  }

  /** 开关量：按给定的翻转概率切换，未触发时保持原状态 */
  private toggle(
    device: string,
    variable: string,
    onValue: number,
    offValue: number,
    flipChance = 0.05,
  ): number {
    const key = `${device}.${variable}`
    const prev = this.values.get(key) ?? onValue
    const next = Math.random() < flipChance
      ? (prev === onValue ? offValue : onValue)
      : prev
    this.values.set(key, next)
    return next
  }

  /** 设备启停门控：用于「停机时该变量直接归零」的场景 */
  private gateOpen(device: string, flipChance = 0.03): boolean {
    const key = `${device}#gate`
    const prev = this.values.get(key) ?? 1
    const next = Math.random() < flipChance ? (prev === 1 ? 0 : 1) : prev
    this.values.set(key, next)
    return next === 1
  }

  async connect(config: DataSourceConfig): Promise<void> {
    this.status = 'connected'
    const interval = config.interval || 1000

    // 按配置间隔生成模拟数据
    this.interval = window.setInterval(() => {
      const update: DataUpdate = {
        motor_1: {
          speed: this.walk('motor_1', 'speed', 0, 3000, 0.05),
          temp: this.walk('motor_1', 'temp', 40, 80, 0.04),
          vibration: this.walk('motor_1', 'vibration', 0, 10, 0.08),
        },
        pump_1: {
          speed: this.walk('pump_1', 'speed', 0, 3000, 0.05),
          flow: this.walk('pump_1', 'flow', 0, 100, 0.06),
          pressure: this.walk('pump_1', 'pressure', 0, 10, 0.06),
        },
        valve_1: {
          openDegree: this.walk('valve_1', 'openDegree', 0, 100, 0.1),
        },
        tank_1: {
          level: this.walk('tank_1', 'level', 0, 100, 0.07),
          temp: this.walk('tank_1', 'temp', 20, 50, 0.04),
        },
        pipe_1: {
          // 停流时输出 0，恢复后继续游走而不是换一个全新量级
          flowRate: this.gateOpen('pipe_1', 0.04)
            ? this.walk('pipe_1', 'flowRate', 0, 100, 0.08)
            : 0,
        },
        sensor_1: {
          value: this.walk('sensor_1', 'value', 0, 120, 0.06),
        },
        conveyor_1: {
          speed: this.walk('conveyor_1', 'speed', 0, 2, 0.06),
          load: this.walk('conveyor_1', 'load', 0, 100, 0.07),
        },
        shearer_1: {
          speed: this.walk('shearer_1', 'speed', 0, 8, 0.06),
          load: this.walk('shearer_1', 'load', 0, 100, 0.07),
        },
        coal_bunker_1: {
          level: this.walk('coal_bunker_1', 'level', 20, 95, 0.05),
          temp: this.walk('coal_bunker_1', 'temp', 20, 60, 0.03),
        },
        roadheader_1: {
          cutting: this.toggle('roadheader_1', 'cutting', 1, 0, 0.03),
          load: this.walk('roadheader_1', 'load', 30, 100, 0.07),
        },
        fan_1: {
          speed: this.walk('fan_1', 'speed', 0, 1600, 0.05),
          vibration: this.walk('fan_1', 'vibration', 0, 8, 0.08),
        },
        gas_sensor_1: {
          density: this.walk('gas_sensor_1', 'density', 0, 1.5, 0.06),
        },
        hoist_1: {
          speed: this.walk('hoist_1', 'speed', -3.5, 3.5, 0.1),
          load: this.walk('hoist_1', 'load', 20, 95, 0.06),
        },
        turbine_1: {
          speed: this.walk('turbine_1', 'speed', 2900, 3320, 0.02),
          temp: this.walk('turbine_1', 'temp', 400, 520, 0.03),
        },
        generator_1: {
          power: this.walk('generator_1', 'power', 0, 620, 0.05),
          voltage: this.walk('generator_1', 'voltage', 10.5, 11.3, 0.02),
        },
        boiler_1: {
          pressure: this.walk('boiler_1', 'pressure', 4, 14, 0.05),
          level: this.walk('boiler_1', 'level', 30, 90, 0.05),
          temp: this.walk('boiler_1', 'temp', 300, 500, 0.03),
        },
        transformer_1: {
          temp: this.walk('transformer_1', 'temp', 35, 105, 0.05),
          load: this.walk('transformer_1', 'load', 0, 120, 0.06),
        },
        breaker_1: {
          closed: this.toggle('breaker_1', 'closed', 1, 0, 0.02),
        },
        reactor_1: {
          temp: this.walk('reactor_1', 'temp', 40, 260, 0.05),
          pressure: this.walk('reactor_1', 'pressure', 0.5, 2.5, 0.05),
          level: this.walk('reactor_1', 'level', 40, 95, 0.05),
        },
        heat_exchanger_1: {
          flow: this.walk('heat_exchanger_1', 'flow', 0, 100, 0.08),
          tempIn: this.walk('heat_exchanger_1', 'tempIn', 60, 120, 0.04),
          tempOut: this.walk('heat_exchanger_1', 'tempOut', 30, 50, 0.04),
        },
        sediment_tank_1: {
          level: this.walk('sediment_tank_1', 'level', 20, 95, 0.05),
          turbidity: this.walk('sediment_tank_1', 'turbidity', 0, 60, 0.07),
        },
        sub_pump_1: {
          running: this.toggle('sub_pump_1', 'running', 1, 0, 0.03),
          flow: this.walk('sub_pump_1', 'flow', 0, 200, 0.07),
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
