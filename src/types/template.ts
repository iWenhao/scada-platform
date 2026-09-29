import type { DataBinding, StatusRule } from './scada'

/**
 * 设备模板：可复用的「图形 + 属性 + 绑定 + 状态规则」包。
 * 与自定义组件（图形定义）不同——模板基于已注册组件类型，拖入即带出工程配置。
 */
export interface DeviceTemplate {
  id: string
  /** 模板名称（面板展示） */
  name: string
  /** 基础组件 type，实例化时写入元素 type */
  baseType: string
  width: number
  height: number
  properties: Record<string, any>
  statusRules: StatusRule[]
  dataBindings: DataBinding[]
  locked?: boolean
}

export function createTemplateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
