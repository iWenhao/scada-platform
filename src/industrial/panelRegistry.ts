/**
 * 组件面板的数据层：内置组件注册、Tab 覆盖的分组清单、分组显示名。
 *
 * 从 ComponentPanel.vue 拆出——「注册哪些组件」是应用启动行为，与面板 UI 无关；
 * 拆分同时让面板文件留出实现搜索与「最常使用」的行数空间（.vue 上限 400 行）。
 * ComponentPanel.vue 以副作用方式 import 本模块完成注册。
 */
import { registerComponents } from '@/industrial/registry'
import { basicComponents } from '@/industrial/basic'
import { basicShapeComponents } from '@/industrial/basic/shapes'
import { generalComponents } from '@/industrial/general'
import { pipelineComponents } from '@/industrial/pipeline'
import { electricalComponents } from '@/industrial/electrical'
import { coalComponents } from '@/industrial/coal'
import { powerComponents } from '@/industrial/power'
import { chemicalComponents } from '@/industrial/chemical'
import { waterComponents } from '@/industrial/water'
import { transportComponents } from '@/industrial/transport'
import { ventilationComponents } from '@/industrial/ventilation'
import { washComponents } from '@/industrial/wash'
import { thermalComponents } from '@/industrial/thermal'
import { decoComponents } from '@/industrial/deco'
import {
  widgetComponents,
  DateDefinition,
  ClockDefinition,
  VideoDefinition,
  IframeDefinition,
  SuperTextDefinition,
} from '@/industrial/widget'
import { textComponents } from '@/industrial/basic/text'
import { chartComponents } from '@/industrial/chart'
import type { ComponentDefinition, ComponentGroup } from '@/types/scada'

/**
 * 基础 Tab 的面板顺序（注册顺序即面板顺序）：
 * 7 个基础图形 → 日期/时间/视频/网页 → 文字 → 超文本 → 设备类。
 * 依据是组态场景的使用频率——图形与信息类组件天天用，设备类按需取。
 * 新增基础组件默认追加在设备类之后；要前置就往这个数组里挪。
 */
const basicPanelComponents: ComponentDefinition[] = [
  ...basicShapeComponents,
  DateDefinition,
  ClockDefinition,
  VideoDefinition,
  IframeDefinition,
  ...textComponents,
  SuperTextDefinition,
  ...basicComponents,
]

// 注册内置组件（自定义从存储恢复后单独注册）
registerComponents([
  ...basicPanelComponents,
  ...generalComponents,
  ...pipelineComponents,
  ...electricalComponents,
  ...coalComponents,
  ...powerComponents,
  ...chemicalComponents,
  ...waterComponents,
  ...transportComponents,
  ...ventilationComponents,
  ...washComponents,
  ...thermalComponents,
  ...decoComponents,
  // chart 分组的 4 个数据展示挂件在此注册；basic 分组的 5 个（日期/时间/视频/网页/超文本）
  // 已随 basicPanelComponents 注册——同 key 重复注册只覆盖值、不改变位置，面板顺序不受影响
  ...widgetComponents,
  ...chartComponents,
])

/** 基础 Tab 覆盖的注册分组（图表组件 2026-10-18 上移到「基础组件」之后：图表是高频件，沉在装饰下面难找） */
export const BASIC_GROUPS: ComponentGroup[] = ['basic', 'chart', 'general', 'deco']
/** 行业 Tab 覆盖的注册分组（管道 / 电气 2026-10-18 由基础 Tab 移入，属行业现场设备） */
export const INDUSTRY_GROUPS: ComponentGroup[] = [
  'coal',
  'transport',
  'ventilation',
  'wash',
  'thermal',
  'power',
  'chemical',
  'water',
  'electrical',
  'pipeline',
]

/** 分组显示名（面板分组标题与搜索匹配共用一份） */
const groupNames: Record<string, string> = {
  basic: '基础组件',
  general: '通用设备',
  pipeline: '管道组件',
  electrical: '电气组件',
  coal: '综采系统',
  transport: '主运输系统',
  ventilation: '主通风系统',
  wash: '洗选系统',
  thermal: '热力系统',
  power: '电厂组件',
  chemical: '化工组件',
  water: '水处理组件',
  chart: '图表组件',
  deco: '装饰组件',
  custom: '自定义组件',
}

export function getGroupName(group: string): string {
  return groupNames[group] || group
}
