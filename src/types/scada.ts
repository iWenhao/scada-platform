/** 组件分组 */
export type ComponentGroup =
  | 'basic'
  | 'general'
  | 'pipeline'
  | 'electrical'
  | 'coal'
  | 'power'
  | 'chemical'
  | 'water'
  | 'transport'
  | 'ventilation'
  | 'wash'
  | 'thermal'
  | 'chart'
  | 'custom'

/**
 * 画布元素渲染风格：
 * - `2d`  平面（默认，纯线条稿）
 * - `25d` 立体感（地面投影 + 侧面体积 + 顶面高光）
 *
 * 属于工程级显示设置，随工程持久化；编辑器侧切换，运行端（预览页）只读跟随，
 * 不提供运行期切换入口，保证「编辑所见 = 运行所见」。
 */
export type ViewMode = '2d' | '25d'

/** 组件定义（注册时使用） */
/**
 * 可动件（旋转）：绕给定圆心转动的图形片段。
 *
 * 坐标与主图标同在 `viewBox="0 0 100 100"` 的用户坐标系里——渲染侧复用图标的
 * contain 变换把它摆到同一位置，因此圆心/图形可以直接照抄主图标里的坐标。
 * 片段必须从 `icon` 中移除（见 motion 字段说明），否则会出现「静止齿 + 转动齿」重影。
 */
export interface MotionRotor {
  /** 图形片段（含自己的 stroke="currentColor"，颜色跟随元素状态色） */
  svg: string
  /** 旋转中心（用户坐标） */
  cx: number
  cy: number
  /** 转动方向：1 顺时针（缺省）/ -1 逆时针 */
  direction?: 1 | -1
}

/**
 * 可动件（流动）：输送带面上的滚动标记，沿元素水平方向滚动。
 * 实体带面无法用位图局部平移，改用推进 dashOffset 的竖线标记（与管道流动同一手法）。
 */
export interface MotionBelt {
  x1: number
  x2: number
  /** 标记所在高度（用户坐标），通常取带面中线 */
  y: number
  /**
   * 带面厚度（用户单位，即上下带边之间的距离）：滚动标记的高度按它取值。
   * 必须显式给出——否则只能猜一个像素高度，在带面上会糊成一条细线，
   * 既看不出在动，也不再是「输送带」的样子。
   */
  bandHeight: number
  /** 输送方向：1 向右（缺省）/ -1 向左 */
  direction?: 1 | -1
}

/**
 * 数据驱动的运转动效定义。
 *
 * 设备图标是「整体光栅化成一张位图」后交给 Konva 的，位图里的某个圆无法单独旋转，
 * 因此可动件必须从 icon 里拆出来、作为独立节点渲染（见 core/canvas/elementMotion.ts）。
 * 代价是图形定义要写两处（静态机身 + 可动件），改动图形时需同步——这是局部旋转绕不开的。
 */
export interface ComponentMotion {
  /** 驱动变量名（对应 dataBindings 里的 variable）；缺省取第一个绑定 */
  driveVariable?: string
  /** 「运转中」的判定阈值（缺省 0.1，与 statusRules 里 speed > 0.1 的口径一致） */
  threshold?: number
  /** 角速度系数（度/秒 每单位速度值）：不同设备的视觉转速差异靠它调 */
  degPerUnit?: number
  rotors?: MotionRotor[]
  belts?: MotionBelt[]
}

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
  /** 运转动效（可选）：仅有可动件的设备需要声明 */
  motion?: ComponentMotion
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
  /**
   * 旧版合并开关：名称与实时数值一起显示/隐藏（默认 true，旧数据无此字段视为显示）。
   * 已拆分为 showName / showValue；拆分字段缺省时依次回退到本字段，保证旧画面渲染不变。
   */
  showLabel?: boolean
  /** 是否显示名称标签条（新组件默认 false，仅当未设置时回退 showLabel） */
  showName?: boolean
  /** 是否显示实时数值（新组件默认 false，仅当未设置时回退 showLabel） */
  showValue?: boolean
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
