import type { ComponentDefinition } from '@/types/scada'

export const ValveDefinition: ComponentDefinition = {
  type: 'valve',
  name: '阀门',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 22 L50 50 L18 78 Z" fill="currentColor" fill-opacity="0.12"/>
      <path d="M82 22 L50 50 L82 78 Z" fill="currentColor" fill-opacity="0.12"/>
      <path d="M50 50 V18"/>
      <circle cx="50" cy="13" r="7.5"/>
      <path d="M42.5 13 H57.5"/>
      <circle cx="50" cy="50" r="3.2" fill="currentColor" stroke="none" opacity="0.85"/>
    </g>
  </svg>`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <polygon points="15,25 50,50 15,75" />
      <polygon points="85,25 50,50 85,75" />
      <line x1="50" y1="50" x2="50" y2="15" />
      <circle cx="50" cy="12" r="8" />
      <line x1="42" y1="12" x2="58" y2="12" />
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
      <circle cx="52" cy="52" r="28" fill="currentColor" fill-opacity="0.1"/>
      <path d="M52 52 C42 42 38 36 48 32 C58 30 64 38 52 52 Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="2"/>
      <path d="M52 52 C62 42 66 36 56 32" stroke="currentColor" stroke-width="2" opacity="0.55"/>
      <path d="M18 52 H42"/>
      <path d="M36 47 L42 52 L36 57"/>
      <path d="M52 22 V40"/>
      <path d="M47 27 L52 21 L57 27"/>
      <circle cx="52" cy="52" r="3" fill="currentColor" stroke="none"/>
    </g>
  </svg>`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <circle cx="50" cy="50" r="30" />
      <path d="M 50,50 L 35,35 Q 50,30 65,35 L 50,50" />
      <path d="M 50,50 L 35,65 Q 50,70 65,65 L 50,50" />
      <line x1="20" y1="50" x2="50" y2="50" />
      <polygon points="15,45 20,50 15,55" />
      <line x1="50" y1="50" x2="50" y2="20" />
      <polygon points="45,15 50,20 55,15" />
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
      <ellipse cx="50" cy="24" rx="28" ry="9" fill="currentColor" fill-opacity="0.08"/>
      <path d="M22 24 V72"/>
      <path d="M78 24 V72"/>
      <ellipse cx="50" cy="72" rx="28" ry="9" fill="currentColor" fill-opacity="0.12"/>
      <path d="M24 58 H76" stroke-dasharray="4 3" opacity="0.45"/>
      <path d="M50 81 V92"/>
      <rect x="44" y="92" width="12" height="5" rx="1.5" fill="currentColor" fill-opacity="0.2"/>
    </g>
  </svg>`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <ellipse cx="50" cy="25" rx="30" ry="10" />
      <line x1="20" y1="25" x2="20" y2="75" />
      <line x1="80" y1="25" x2="80" y2="75" />
      <ellipse cx="50" cy="75" rx="30" ry="10" />
      <line x1="25" y1="60" x2="75" y2="60" stroke-dasharray="5,3" opacity="0.5" />
      <line x1="50" y1="85" x2="50" y2="95" />
      <rect x="45" y="95" width="10" height="5" />
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
  DisplayDefinition,
]
