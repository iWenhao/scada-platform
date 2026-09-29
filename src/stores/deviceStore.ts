import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dataSourceManager } from '@/datasource/DataSourceManager'
import type { DataUpdate } from '@/datasource/types'

/** 单个历史数据点 */
export interface HistoryPoint {
  /** 时间戳(ms) */
  t: number
  /** 值 */
  v: number
}

/** 每个设备+变量组合的环形缓冲区大小 */
const MAX_HISTORY_PER_VARIABLE = 300

export const useDeviceStore = defineStore('device', () => {
  // 设备实时数据
  const deviceData = ref<Record<string, Record<string, any>>>({})

  // 连接状态
  const connectionStatus = ref<'connected' | 'disconnected' | 'error'>('disconnected')

  // 当前数据源可绑定的设备清单
  const availableDevices = ref<string[]>([])

  // 最后更新时间
  const lastUpdateTime = ref<number>(0)

  // 历史数据: { "motor_1.speed": [{t, v}, ...] }
  const historyData = ref<Record<string, HistoryPoint[]>>({})

  // 注册数据更新回调（store 生命周期内仅注册一次，避免重复监听）
  dataSourceManager.onUpdate((update: DataUpdate) => {
    // 合并更新
    for (const [deviceId, variables] of Object.entries(update)) {
      if (!deviceData.value[deviceId]) {
        deviceData.value[deviceId] = {}
      }
      Object.assign(deviceData.value[deviceId], variables)

      // 采集历史数据（仅数值类型）
      const now = Date.now()
      for (const [varName, val] of Object.entries(variables)) {
        if (typeof val !== 'number') continue
        const key = `${deviceId}.${varName}`
        if (!historyData.value[key]) {
          historyData.value[key] = []
        }
        const arr = historyData.value[key]
        arr.push({ t: now, v: val })
        if (arr.length > MAX_HISTORY_PER_VARIABLE) {
          arr.shift()
        }
      }
    }
    lastUpdateTime.value = Date.now()
  })

  /**
   * 初始化数据源连接
   */
  async function initDataSource(config: {
    type: string
    name?: string
    url?: string
    interval?: number
    reconnect?: boolean
    reconnectInterval?: number
    options?: Record<string, any>
  }) {
    // 连接数据源
    await dataSourceManager.connect({
      type: config.type as any,
      name: config.name || 'default',
      url: config.url,
      interval: config.interval,
      reconnect: config.reconnect,
      reconnectInterval: config.reconnectInterval,
      options: config.options,
    })

    connectionStatus.value = dataSourceManager.getStatus()
    availableDevices.value = dataSourceManager.listDevices()
  }

  /**
   * 获取指定设备数据
   */
  function getDeviceData(deviceId: string): Record<string, any> {
    return deviceData.value[deviceId] || {}
  }

  /**
   * 获取变量值
   */
  function getVariableValue(deviceId: string, variable: string): any {
    return deviceData.value[deviceId]?.[variable]
  }

  /**
   * 按组件类型推荐要绑定的设备（如 motor -> motor_1）
   */
  function suggestDeviceId(componentType: string): string | undefined {
    const lower = componentType.toLowerCase()
    return availableDevices.value.find(device =>
      device.toLowerCase().startsWith(lower)
    )
  }

  /** 当前数据源是否支持写值（UI 据此决定是否展示控制入口） */
  function canWrite(): boolean {
    return dataSourceManager.canWrite()
  }

  /**
   * 下行写值：委托数据源管理器。失败原样向上抛，由调用方提示操作者；
   * Mock 数据源写入后本地数据立即生效。
   */
  async function writeValue(deviceId: string, variable: string, value: number | string | boolean) {
    await dataSourceManager.write({ deviceId, variable, value })
  }

  /**
   * 获取某个设备+变量的历史数据
   */
  function getHistory(deviceId: string, variable: string): HistoryPoint[] {
    return historyData.value[`${deviceId}.${variable}`] || []
  }

  /**
   * 清空历史数据
   */
  function clearHistory() {
    historyData.value = {}
  }

  /**
   * 断开数据源
   */
  function disconnect() {
    dataSourceManager.disconnect()
    connectionStatus.value = 'disconnected'
  }

  /**
   * 重置状态
   */
  function reset() {
    deviceData.value = {}
    connectionStatus.value = 'disconnected'
    availableDevices.value = []
    historyData.value = {}
    lastUpdateTime.value = 0
  }

  return {
    deviceData,
    connectionStatus,
    availableDevices,
    historyData,
    lastUpdateTime,
    initDataSource,
    getDeviceData,
    getVariableValue,
    getHistory,
    clearHistory,
    suggestDeviceId,
    canWrite,
    writeValue,
    disconnect,
    reset,
  }
})
