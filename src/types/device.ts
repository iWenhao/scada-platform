/** 设备状态 */
export interface DeviceStatus {
  id: string
  name: string
  color: string
  timestamp: number
}

/** 设备数据 */
export interface DeviceData {
  [variable: string]: number | string | boolean
}

/** 设备信息 */
export interface DeviceInfo {
  id: string
  name: string
  type: string
  status: DeviceStatus | null
  data: DeviceData
}
