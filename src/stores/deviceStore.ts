import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dataSourceManager } from '@/datasource/DataSourceManager'
import type { DataUpdate } from '@/datasource/types'

export const useDeviceStore = defineStore('device', () => {
  // 设备实时数据
  const deviceData = ref<Record<string, Record<string, any>>>({})
  
  // 连接状态
  const connectionStatus = ref<'connected' | 'disconnected' | 'error'>('disconnected')

  // 当前数据源可绑定的设备清单
  const availableDevices = ref<string[]>([])

  // 最后更新时间
  const lastUpdateTime = ref<number>(0)

  // 注册数据更新回调（store 生命周期内仅注册一次，避免重复监听）
  dataSourceManager.onUpdate((update: DataUpdate) => {
    // 合并更新
    for (const [deviceId, variables] of Object.entries(update)) {
      if (!deviceData.value[deviceId]) {
        deviceData.value[deviceId] = {}
      }
      Object.assign(deviceData.value[deviceId], variables)
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
    lastUpdateTime.value = 0
  }

  return {
    deviceData,
    connectionStatus,
    availableDevices,
    lastUpdateTime,
    initDataSource,
    getDeviceData,
    getVariableValue,
    suggestDeviceId,
    disconnect,
    reset,
  }
})
