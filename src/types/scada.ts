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
  | 'deco'
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
 * 坐标与主图标同在**主图标自己的用户坐标系**里（手写图元通常是 `viewBox="0 0 100 100"`，
 * 素材导入的图元则沿用素材画布如 `0 0 610 232`）——渲染侧复用图标的 contain 变换把它
 * 摆回原位，因此圆心/图形可以直接照抄主图标里的坐标。
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

/**
 * 属性面板里「通用能力」分段的可见性开关。
 *
 * `ComponentInstance` 是扁平的单一接口——导航、绑定、状态规则对所有元素一视同仁，
 * 换来的是一套统一的渲染/交互/序列化管线。代价是属性面板会给某些类型暴露它根本
 * 消费不了的能力，典型两例：
 * - 日期/时间的时间文本只取本地时钟（`WidgetElement.vue`），配了数据绑定也只是
 *   在元素顶部多一行别处的值，并不会让外部变量驱动这个显示；
 * - overlay 类组件由 DOM 呈现、Konva 不再画线，`getElementColor` 对它没有输出
 *   通道，配状态规则等于配了个看不见的东西。
 *
 * capabilities **同时约束 UI 与运行时**：面板不给出该项入口，渲染层也不再产出
 * 该项效果。只裁 UI 是不够的——旧数据里已经打开的开关会变成「面板上找不到、却
 * 仍在生效」的死角，用户再也关不掉。
 * 全字段缺省 true——既有上百个设备定义无需逐个标注，只有要关的才显式写。
 */
export interface ElementCapabilities {
  /** 画面导航（点击跳转其他画面） */
  navigate?: boolean
  /** 数据绑定（数据源设备 + 绑定变量列表） */
  dataBinding?: boolean
  /** 状态规则（决定元素状态色） */
  statusRules?: boolean
  /** 底部名称条（文字内容是 element.name，缺省即组件类型名） */
  nameLabel?: boolean
  /** 「显示实时数值」开关（依赖数据绑定，无绑定时本就无效果） */
  valueLabel?: boolean
}

export interface ComponentDefinition {
  type: string
  name: string
  /**
   * 一句话用途说明，悬停组件库卡片时显示。
   *
   * 只给「名字看不出干什么」的组件写——设备图元（泵、风机）自带语义不必写，
   * 而报表/表格/网格图这类同为表格长相、数据模型却不同的最容易选错，必写。
   */
  description?: string
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
  /** 属性面板的能力裁剪开关（仅 UI 层生效，缺省视为全部支持） */
  capabilities?: ElementCapabilities
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
  /** string 输入框的占位提示（示例值优先于格式说明，更容易照着写） */
  placeholder?: string
  /** string 输入框的最大长度；设置后同时显示字数统计 */
  maxLength?: number
  /** 控件下方的辅助说明（占位符清单、取值口径等） */
  hint?: string
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
  /**
   * 命中该状态时强制停止运转动效（故障/停机类状态用）。
   *
   * 动效的「运转中」判定原本只看驱动变量的绝对值是否过阈值，与状态规则完全解耦——
   * 于是「报警 state=2」照样满足 `> 0.1`，故障的设备还在画面上转。这个字段把两套接回
   * 一起：缺省（undefined）沿用数值判定，显式 true 则在命中时直接停转。
   */
  stopMotion?: boolean
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
