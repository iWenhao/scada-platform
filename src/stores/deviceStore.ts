import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dataSourceManager } from '@/datasource/DataSourceManager'
import type { DataUpdate } from '@/datasource/types'

export const useDeviceStore = defineStore('device', () => {
  // 设备实时数据
  const deviceData = ref<Record<string, Record<string, any>>>({})
  
  // 连接状态
  const connectionStatus = ref<'connected' | 'disconnected' | 'error'>('disconnected')
  
  // 最后更新时间
  const lastUpdateTime = ref<number>(0)

  /**
   * 初始化数据源连接
   */
  async function initDataSource(config: { type: string; url?: string }) {
    // 注册数据更新回调
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

    // 连接数据源
    await dataSourceManager.connect({
      type: config.type as any,
      name: 'default',
      url: config.url,
    })

    connectionStatus.value = dataSourceManager.getStatus()
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
    lastUpdateTime.value = 0
  }

  return {
    deviceData,
    connectionStatus,
    lastUpdateTime,
    initDataSource,
    getDeviceData,
    getVariableValue,
    disconnect,
    reset,
  }
})
