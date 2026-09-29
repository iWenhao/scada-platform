import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { dataSourceManager } from '@/datasource/DataSourceManager'
import { pushSample } from '@/history/historian'
import {
  DEFAULT_COMM_TIMEOUT_MS,
  DEFAULT_STALE_MS,
  qualityFromAge,
  isUsable,
  sanitizeVariables,
  type Quality,
  type VariableMeta,
} from '@/types/quality'
import { tagKey } from '@/types/tag'
import { useProjectStore } from './projectStore'
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

  // ---- 数据质量 ----
  /** 点位采集元信息: { "motor_1.speed": { t, q } } */
  const variableMeta = ref<Record<string, VariableMeta>>({})
  /** 陈旧判定阈值（毫秒），可由数据源配置覆盖 */
  const staleMs = ref<number>(DEFAULT_STALE_MS)
  /** 通信中断判定阈值（毫秒） */
  const commTimeoutMs = ref<number>(DEFAULT_COMM_TIMEOUT_MS)
  /**
   * 质量时钟：质量会随时间退化（超时未刷新 → stale），
   * 但没有新数据推送时不会有响应式变化，需要一个周期信号驱动 UI 重算。
   * 懒启动——只有在收到过数据之后才跑，避免空转。
   */
  const dataTick = ref(0)
  let clockTimer: number | null = null

  /**
   * 点位历史入库死区索引：`deviceId.variable` → deadband。
   * 点表在 deviceStore 之后初始化不会有问题——这里是 computed，
   * 推送回调执行时才求值。
   */
  const deadbandMap = computed(() => {
    const map = new Map<string, number>()
    try {
      const { tagTable } = useProjectStore()
      for (const t of tagTable) {
        if (typeof t.deadband === 'number' && t.deadband > 0) {
          map.set(tagKey(t), t.deadband)
        }
      }
    } catch {
      // pinia 未激活时（极端初始化顺序）忽略死区，历史照常全量记录
    }
    return map
  })

  function ensureClock() {
    if (clockTimer !== null) return
    clockTimer = window.setInterval(() => {
      dataTick.value++
    }, 1000)
  }

  /** 当前点位质量（随时间退化，依赖质量时钟刷新） */
  function qualityOf(deviceId: string, variable: string): Quality {
    void dataTick.value
    const meta = variableMeta.value[`${deviceId}.${variable}`]
    return qualityFromAge(
      meta?.t,
      Date.now(),
      staleMs.value,
      connectionStatus.value === 'connected',
    )
  }

  /** 该点位的值是否可信（可用于报警判定与展示） */
  function isDataUsable(deviceId: string, variable: string): boolean {
    return isUsable(qualityOf(deviceId, variable))
  }

  /** 链路是否中断：适配器报断连，或整体数据停更超过通信超时阈值 */
  const commLost = computed(() => {
    void dataTick.value
    if (connectionStatus.value !== 'connected') return true
    if (!lastUpdateTime.value) return false // 从未收到过数据，不算中断（尚未开始）
    return Date.now() - lastUpdateTime.value > commTimeoutMs.value
  })

  // 注册数据更新回调（store 生命周期内仅注册一次，避免重复监听）
  dataSourceManager.onUpdate((update: DataUpdate) => {
    // 合并更新
    const now = Date.now()
    for (const [deviceId, variables] of Object.entries(update)) {
      if (!deviceData.value[deviceId]) {
        deviceData.value[deviceId] = {}
      }

      // 脏值防护：NaN/Infinity 既不覆盖画面上的旧值，也不进历史，
      // 否则一个坏采样会同时污染实时显示与趋势曲线
      for (const item of sanitizeVariables(variables)) {
        const key = `${deviceId}.${item.name}`
        if (!item.usable) {
          variableMeta.value[key] = { t: now, q: 'bad' }
          continue
        }
        deviceData.value[deviceId][item.name] = item.value
        variableMeta.value[key] = { t: now, q: 'good' }

        // 采集历史数据（仅数值类型）：内存缓冲供实时曲线，同时喂给
        // historian 批量落盘（刷新后趋势仍可查历史区间）。
        // 点表设置了入库死区的点位：变化幅度小于死区时跳过记录，
        // 慢变量不再产生大量重复点（实时值照常更新，画面不受影响）
        if (item.numeric) {
          if (!historyData.value[key]) {
            historyData.value[key] = []
          }
          const arr = historyData.value[key]
          const deadband = deadbandMap.value.get(key) ?? 0
          const lastPoint = arr[arr.length - 1]
          if (deadband > 0 && lastPoint !== undefined) {
            if (Math.abs((item.value as number) - lastPoint.v) < deadband) {
              continue
            }
          }
          arr.push({ t: now, v: item.value as number })
          if (arr.length > MAX_HISTORY_PER_VARIABLE) {
            arr.shift()
          }
          pushSample(key, now, item.value as number)
        }
      }
    }
    lastUpdateTime.value = now
    ensureClock()
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

  /** 由数据源配置注入陈旧/通信超时阈值（毫秒），缺省用默认值 */
  function setQualityThresholds(stale?: number, commTimeout?: number) {
    if (typeof stale === 'number' && stale > 0) staleMs.value = stale
    if (typeof commTimeout === 'number' && commTimeout > 0) commTimeoutMs.value = commTimeout
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
    variableMeta.value = {}
  }

  return {
    deviceData,
    connectionStatus,
    availableDevices,
    historyData,
    lastUpdateTime,
    variableMeta,
    staleMs,
    commTimeoutMs,
    commLost,
    dataTick,
    initDataSource,
    getDeviceData,
    getVariableValue,
    qualityOf,
    isDataUsable,
    setQualityThresholds,
    getHistory,
    clearHistory,
    suggestDeviceId,
    canWrite,
    writeValue,
    disconnect,
    reset,
  }
})
