/** 组件分组 */
export type ComponentGroup =
  | 'basic'
  | 'pipeline'
  | 'electrical'
  | 'coal'
  | 'power'
  | 'chemical'
  | 'water'
  | 'custom'

/** 组件定义（注册时使用） */
export interface ComponentDefinition {
  type: string
  name: string
  group: ComponentGroup
  icon: string
  defaultWidth: number
  defaultHeight: number
  defaultConfig: Record<string, any>
  statusRules: StatusRule[]
  dataBindings: DataBinding[]
  properties: PropertyDefinition[]
}

/** 组件实例（画布中使用） */
export interface ComponentInstance {
  id: string
  type: string
  /** 绑定的数据源设备ID，实时状态与数值展示按此设备取数 */
  deviceId?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  name: string
  layerId: string
  /** 元素级锁定：锁定后不可拖动/缩放/旋转 */
  locked?: boolean
  properties: Record<string, any>
  statusRules: StatusRule[]
  dataBindings: DataBinding[]
}

/** 属性定义 */
export interface PropertyDefinition {
  key: string
  label: string
  type: 'number' | 'string' | 'boolean' | 'color' | 'select' | 'range'
  default: any
  options?: Array<{ label: string; value: any }>
  min?: number
  max?: number
  step?: number
  group?: string
}

/** 状态规则 */
export interface StatusRule {
  id: string
  name: string
  color: string
  condition: Condition
  priority: number
}

/** 条件类型 */
export type Condition =
  | CompareCondition
  | RangeCondition
  | AndCondition
  | OrCondition
  | ExpressionCondition

export interface CompareCondition {
  type: 'compare'
  variable: string
  operator: '>' | '<' | '=' | '>=' | '<=' | '!='
  value: number
}

export interface RangeCondition {
  type: 'range'
  variable: string
  min: number
  max: number
}

export interface AndCondition {
  type: 'and'
  conditions: Condition[]
}

export interface OrCondition {
  type: 'or'
  conditions: Condition[]
}

export interface ExpressionCondition {
  type: 'expression'
  expr: string
}

/** 数据绑定 */
export interface DataBinding {
  property: string
  variable: string
  transform?: string
}
