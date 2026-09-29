import { getStorage } from '@/storage'
import { createTemplateId, type DeviceTemplate } from '@/types/template'
import type { StatusRule, DataBinding } from '@/types/scada'

const STORAGE_KEY = 'scada_device_templates'

/**
 * 设备模板库：持久化在存储后端/localStorage，与工程数据解耦，刷新后仍可用。
 */

function cloneTemplate(t: DeviceTemplate): DeviceTemplate {
  return JSON.parse(JSON.stringify(t)) as DeviceTemplate
}

/** 启动时恢复模板列表（坏数据过滤） */
export async function loadDeviceTemplates(): Promise<DeviceTemplate[]> {
  const raw = await getStorage().get(STORAGE_KEY)
  if (!raw) return []
  try {
    const list = JSON.parse(raw) as DeviceTemplate[]
    return list
      .filter(t => t && t.id && t.name && t.baseType)
      .map(t => ({
        ...t,
        properties: t.properties || {},
        statusRules: t.statusRules || [],
        dataBindings: t.dataBindings || [],
      }))
  } catch {
    return []
  }
}

async function persist(list: DeviceTemplate[]): Promise<void> {
  await getStorage().set(STORAGE_KEY, JSON.stringify(list))
  // 通知面板刷新（右键「存为模板」发生在画布，面板需要感知）
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('scada-templates-changed'))
  }
}

/** 新增（或同 id 覆盖） */
export async function saveDeviceTemplate(
  tpl: Omit<DeviceTemplate, 'id'> & { id?: string },
): Promise<DeviceTemplate> {
  const item = cloneTemplate({
    id: tpl.id || createTemplateId(),
    name: tpl.name,
    baseType: tpl.baseType,
    width: tpl.width,
    height: tpl.height,
    properties: tpl.properties,
    statusRules: tpl.statusRules,
    dataBindings: tpl.dataBindings,
    locked: tpl.locked,
  })
  const list = (await loadDeviceTemplates()).filter(t => t.id !== item.id)
  list.push(item)
  await persist(list)
  return item
}

export async function removeDeviceTemplate(id: string): Promise<void> {
  const list = (await loadDeviceTemplates()).filter(t => t.id !== id)
  await persist(list)
}

/** 从画布元素生成模板体（不含 id） */
export function templateFromElement(
  element: {
    name: string
    type: string
    width: number
    height: number
    properties: Record<string, any>
    statusRules: StatusRule[]
    dataBindings: DataBinding[]
    locked?: boolean
  },
  name: string,
): Omit<DeviceTemplate, 'id'> {
  return {
    name,
    baseType: element.type,
    width: element.width,
    height: element.height,
    properties: JSON.parse(JSON.stringify(element.properties || {})),
    statusRules: JSON.parse(JSON.stringify(element.statusRules || [])),
    dataBindings: JSON.parse(JSON.stringify(element.dataBindings || [])),
    locked: element.locked,
  }
}
