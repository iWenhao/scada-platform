import type { DataUpdate } from './types'

/**
 * 把数据源原始消息解析为统一的 DataUpdate 格式。
 * WebSocket / HTTP 轮询等适配器共用。
 *
 * 支持三种格式：
 * 1. 设备映射: { "motor_1": { "speed": 1500 } }
 * 2. 单设备对象: { "deviceId": "motor_1", "data": { "speed": 1500 } }
 * 3. 读数数组: [{ "deviceId": "motor_1", "data": { "speed": 1500 } }, ...]
 */
export function parseDataUpdate(raw: unknown): DataUpdate | null {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw

  if (!data || typeof data !== 'object') return null

  // 格式2: 单设备对象
  if (typeof (data as any).deviceId === 'string') {
    const variables = (data as any).data ?? (data as any).variables ?? {}
    return { [(data as any).deviceId]: variables }
  }

  // 格式3: 读数数组
  if (Array.isArray(data)) {
    const update: DataUpdate = {}
    for (const item of data) {
      if (item && typeof item === 'object' && typeof (item as any).deviceId === 'string') {
        const variables = (item as any).data ?? (item as any).variables ?? {}
        update[(item as any).deviceId] = {
          ...update[(item as any).deviceId],
          ...variables,
        }
      }
    }
    return Object.keys(update).length ? update : null
  }

  // 格式1: 设备映射
  const update: DataUpdate = {}
  for (const [deviceId, variables] of Object.entries(data as Record<string, unknown>)) {
    if (variables && typeof variables === 'object') {
      update[deviceId] = variables as Record<string, any>
    }
  }
  return Object.keys(update).length ? update : null
}
