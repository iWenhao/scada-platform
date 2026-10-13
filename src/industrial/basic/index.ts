import type { ComponentDefinition } from '@/types/scada'
import { ImageDefinition } from './image'
import { basicShapeComponents } from './shapes'

export const ValveDefinition: ComponentDefinition = {
  type: 'valve',
  name: '阀门',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 50 V18"/>
      <path d="M18 22 L50 50 L18 78 Z" data-face="front"/>
      <path d="M82 22 L50 50 L82 78 Z" data-face="side"/>
      <circle cx="50" cy="13" r="7.5" data-face="cap"/>
      <path d="M42.5 13 H57.5" stroke-opacity="0.7"/>
      <circle cx="50" cy="50" r="3.2" fill="currentColor" stroke="none"/>
    </g>
  </svg>`,
  defaultWidth: 60,
  defaultHeight: 90,
  defaultConfig: {
    valveType: 'gate',
    openDegree: 0,
  },
  statusRules: [
    {
      id: 'open',
      name: '开启',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'openDegree', operator: '>', value: 0 },
      priority: 1,
    },
    {
      id: 'closed',
      name: '关闭',
      color: '#ff4757',
      severity: 'normal',
      condition: { type: 'compare', variable: 'openDegree', operator: '=', value: 0 },
      priority: 2,
    },
  ],
  dataBindings: [
    { property: 'openDegree', variable: 'openDegree' },
  ],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '阀门',
      group: '基本',
    },
    {
      key: 'valveType',
      label: '阀门类型',
      type: 'select',
      default: 'gate',
      options: [
        { label: '闸阀', value: 'gate' },
        { label: '球阀', value: 'ball' },
        { label: '蝶阀', value: 'butterfly' },
      ],
      group: '基本',
    },
    {
      key: 'openDegree',
      label: '开度',
      type: 'range',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: '运行参数',
    },
  ],
}

export const PumpDefinition: ComponentDefinition = {
  type: 'pump',
  name: '泵',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 52 H42" data-pipe="base"/>
      <path d="M16 50.5 H42" data-pipe="hi"/>
      <path d="M52 20 V42" data-pipe="base"/>
      <path d="M50.5 20 V42" data-pipe="hi"/>
      <circle cx="52" cy="52" r="28" data-face="cap"/>
      <path d="M52 52 C42 42 38 36 48 32 C58 30 64 38 52 52 Z" stroke="currentColor" stroke-width="2" stroke-opacity="0.85"/>
      <path d="M52 52 C62 42 66 36 56 32" stroke="currentColor" stroke-width="2" stroke-opacity="0.55"/>
      <circle cx="52" cy="52" r="3" fill="currentColor" stroke="none"/>
    </g>
  </svg>`,
  defaultWidth: 80,
  defaultHeight: 80,
  defaultConfig: {
    speed: 0,
    flow: 0,
  },
  statusRules: [
    {
      id: 'running',
      name: '运行',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'speed', operator: '>', value: 0 },
      priority: 1,
    },
    {
      id: 'stopped',
      name: '停止',
      color: '#ff4757',
      severity: 'normal',
      condition: { type: 'compare', variable: 'speed', operator: '=', value: 0 },
      priority: 2,
    },
  ],
  dataBindings: [
    { property: 'speed', variable: 'speed' },
  ],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '泵',
      group: '基本',
    },
    {
      key: 'speed',
      label: '转速',
      type: 'number',
      default: 0,
      min: 0,
      max: 3000,
      group: '运行参数',
    },
  ],
}

export const TankDefinition: ComponentDefinition = {
  type: 'tank',
  name: '储罐',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 24 A28 9 0 0 0 78 24 L78 72 A28 9 0 0 1 22 72 Z" data-face="front"/>
      <ellipse cx="50" cy="24" rx="28" ry="9" data-face="cap"/>
      <path d="M24 58 H76" stroke-dasharray="4 3" stroke-opacity="0.5"/>
      <path d="M50 81 V90"/>
      <rect x="44" y="90" width="12" height="6" rx="1.5" data-face="cap"/>
    </g>
  </svg>`,
  defaultWidth: 80,
  defaultHeight: 100,
  defaultConfig: {
    level: 0,
    temp: 25,
  },
  statusRules: [
    {
      id: 'high',
      name: '高液位',
      color: '#ffa502',
      severity: 'warning',
      condition: { type: 'compare', variable: 'level', operator: '>', value: 80 },
      priority: 1,
    },
    {
      id: 'normal',
      name: '正常',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'level', min: 20, max: 80 },
      priority: 2,
    },
    {
      id: 'low',
      name: '低液位',
      color: '#ff4757',
      severity: 'critical',
      condition: { type: 'compare', variable: 'level', operator: '<', value: 20 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'level', variable: 'level' },
  ],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '储罐',
      group: '基本',
    },
    {
      key: 'level',
      label: '液位',
      type: 'range',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: '运行参数',
    },
  ],
}

export const SetpointDefinition: ComponentDefinition = {
  type: 'setpoint',
  name: '设定值',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <rect x="12" y="30" width="76" height="40" rx="4" />
      <line x1="22" y1="50" x2="46" y2="50" />
      <line x1="34" y1="38" x2="34" y2="62" />
      <line x1="54" y1="50" x2="78" y2="50" stroke-dasharray="4,3" />
      <polygon points="72,44 80,50 72,56" />
      <path d="M 30,20 L 40,20" />
      <line x1="35" y1="12" x2="35" y2="24" />
    </g>
  </svg>`,
  defaultWidth: 90,
  defaultHeight: 50,
  defaultConfig: {
    unit: '',
  },
  // 写值目标控件：没有预置绑定（每个工程的目标设备/变量都不同），由使用者在属性面板手动绑定
  statusRules: [],
  dataBindings: [],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '设定值',
      group: '基本',
    },
    {
      key: 'unit',
      label: '单位',
      type: 'string',
      default: '',
      group: '基本',
    },
  ],
}

/**
 * 操作按钮：下发值在配置期写死，运行期点一下即走写值链路（角色 / 写值锁 /
 * 点表策略 / 量程 / 二次确认 / 审计，与「设定值」同一套关卡）。
 *
 * 与「设定值」的分工——设定值每次点击都要在弹窗里输数值，适合需要频繁调整的
 * 连续量（目标温度、频率给定）；按钮把下发值固化在属性里，适合启停 / 复位 /
 * 模式切换这类离散指令。
 *
 * 能力裁剪三条：
 * - navigate 关：点击语义已被写值占用。若同时允许跳转，两者只能靠优先级硬判，
 *   配了导航的按钮就成了哑的，不如在面板上不给入口；
 * - nameLabel / valueLabel 关：按钮面上已经写着指令名，再补名称条或实时值
 *   是重复信息，且会挤掉按钮本体高度。
 */
export const CommandButtonDefinition: ComponentDefinition = {
  type: 'command-button',
  name: '操作按钮',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
      <rect x="8" y="32" width="84" height="36" rx="9" />
      <line x1="32" y1="50" x2="68" y2="50" />
    </g>
  </svg>`,
  defaultWidth: 100,
  defaultHeight: 40,
  defaultConfig: {
    label: '启动',
    writeValue: '1',
    confirm: true,
    fontSize: 14,
    accent: '',
  },
  // 写值目标同「设定值」：没有预置绑定，由使用者在属性面板绑定设备与变量
  statusRules: [],
  dataBindings: [],
  capabilities: { navigate: false, nameLabel: false, valueLabel: false },
  properties: [
    {
      key: 'label',
      label: '按钮文字',
      type: 'string',
      default: '启动',
      maxLength: 20,
      group: '基本',
    },
    {
      key: 'fontSize',
      label: '字号',
      type: 'number',
      default: 14,
      min: 10,
      max: 48,
      group: '基本',
    },
    {
      key: 'accent',
      label: '强调色',
      type: 'color',
      default: '',
      group: '基本',
      hint: '留空时描边与文字跟随元素状态色；需要「红停绿开」这类固定配色时在此指定。',
    },
    {
      key: 'writeValue',
      label: '下发值',
      type: 'string',
      default: '1',
      group: '指令',
      placeholder: '如：1 / true / start',
      hint: '按点表的数据类型自动转换：布尔量认 1/true/on/yes，数值量转数字，其余按字符串下发。',
    },
    {
      key: 'confirm',
      label: '下发前二次确认',
      type: 'boolean',
      default: true,
      group: '指令',
    },
  ],
}

export const DisplayDefinition: ComponentDefinition = {
  type: 'display',
  name: '数值显示',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <rect x="10" y="30" width="80" height="40" rx="4" />
      <text x="50" y="58" text-anchor="middle" font-size="24" font-family="monospace" fill="currentColor" stroke="none">8.8</text>
    </g>
  </svg>`,
  defaultWidth: 120,
  defaultHeight: 50,
  defaultConfig: {
    decimals: 1,
    unit: '',
    factor: 1,
    offset: 0,
  },
  // 只读数值显示：绑定目标由使用者按需指定，无预置绑定
  statusRules: [],
  dataBindings: [],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '数值显示',
      group: '基本',
    },
    {
      key: 'unit',
      label: '单位',
      type: 'string',
      default: '',
      group: '显示',
    },
    {
      key: 'decimals',
      label: '小数位数',
      type: 'number',
      default: 1,
      min: 0,
      max: 3,
      group: '显示',
    },
    {
      key: 'factor',
      label: '倍率(×)',
      type: 'number',
      default: 1,
      step: 0.001,
      group: '换算',
    },
    {
      key: 'offset',
      label: '偏移(+)',
      type: 'number',
      default: 0,
      step: 0.1,
      group: '换算',
    },
  ],
}

export const basicComponents: ComponentDefinition[] = [
  ValveDefinition,
  PumpDefinition,
  TankDefinition,
  SetpointDefinition,
  CommandButtonDefinition,
  DisplayDefinition,
  ImageDefinition,
  // 基础图形 7 个：矩形/圆/三角/横线/竖线/虚横线/虚竖线（源产品只给了 PNG 缩略图，
  // 这里手绘成 currentColor 线条稿，理由见 shapes.ts 头部注释）
  ...basicShapeComponents,
]
