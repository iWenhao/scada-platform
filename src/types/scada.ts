/** 组件分组 */
export type ComponentGroup =
  | 'basic'
  | 'pipeline'
  | 'electrical'
  | 'coal'
  | 'power'
  | 'chemical'
  | 'water'
  | 'chart'
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
  /** 是否在画布上显示名称与实时数值（默认 true，旧数据无此字段视为显示） */
  showLabel?: boolean
  /**
   * 运行时点击跳转的目标画面 ID（多画面导航）。
   * 未设置表示不跳转；目标画面不存在时预览端忽略。
   */
  navigateTo?: string
  /** 来源设备模板 ID（可选，便于「从模板更新」等扩展） */
  templateId?: string
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

/** 报警级别：决定该状态是否计入报警面板 */
export type AlarmSeverity = 'normal' | 'warning' | 'critical'

/** 状态规则 */
export interface StatusRule {
  id: string
  name: string
  color: string
  condition: Condition
  priority: number
  /**
   * 报警级别。未设置时按颜色兜底推断（历史数据兼容）。
   * 注意："关闭/停止"这类正常工艺状态即便用了红色也应标为 normal，
   * 否则设备停机就会刷满报警列表。
   */
  severity?: AlarmSeverity
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
