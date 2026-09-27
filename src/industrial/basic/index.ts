import type { ComponentDefinition } from '@/types/scada'

export const ValveDefinition: ComponentDefinition = {
  type: 'valve',
  name: '阀门',
  group: 'basic',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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

export const basicComponents: ComponentDefinition[] = [
  ValveDefinition,
  PumpDefinition,
  TankDefinition,
]
