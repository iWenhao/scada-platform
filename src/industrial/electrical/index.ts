import type { ComponentDefinition } from '@/types/scada'

export const MotorDefinition: ComponentDefinition = {
  type: 'motor',
  name: '电机',
  group: 'electrical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <rect x="25" y="30" width="50" height="40" rx="5" />
      <line x1="75" y1="50" x2="90" y2="50" />
      <circle cx="90" cy="50" r="5" />
      <rect x="35" y="20" width="20" height="10" />
      <line x1="40" y1="20" x2="40" y2="15" />
      <line x1="50" y1="20" x2="50" y2="15" />
      <line x1="45" y1="20" x2="45" y2="15" />
      <text x="50" y="55" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor">M</text>
    </g>
  </svg>`,
  defaultWidth: 80,
  defaultHeight: 70,
  defaultConfig: {
    speed: 0,
    temp: 25,
    vibration: 0,
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
    {
      id: 'high-temp',
      name: '高温',
      color: '#ffa502',
      condition: {
        type: 'and',
        conditions: [
          { type: 'compare', variable: 'temp', operator: '>', value: 80 },
          { type: 'compare', variable: 'speed', operator: '>', value: 0 },
        ],
      },
      priority: 3,
    },
  ],
  dataBindings: [],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '电机',
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
    {
      key: 'temp',
      label: '温度',
      type: 'number',
      default: 25,
      min: -20,
      max: 150,
      group: '运行参数',
    },
  ],
}

export const SensorDefinition: ComponentDefinition = {
  type: 'sensor',
  name: '传感器',
  group: 'electrical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <circle cx="50" cy="40" r="15" />
      <line x1="50" y1="55" x2="50" y2="85" />
      <rect x="45" y="80" width="10" height="10" />
      <line x1="50" y1="25" x2="50" y2="15" />
      <line x1="45" y1="15" x2="55" y2="15" />
      <circle cx="50" cy="40" r="5" fill="currentColor" />
      <line x1="50" y1="35" x2="50" y2="25" stroke-width="4" />
    </g>
  </svg>`,
  defaultWidth: 50,
  defaultHeight: 80,
  defaultConfig: {
    sensorType: 'temperature',
    value: 0,
    unit: '°C',
  },
  statusRules: [
    {
      id: 'high',
      name: '高报警',
      color: '#ff4757',
      condition: { type: 'compare', variable: 'value', operator: '>', value: 100 },
      priority: 1,
    },
    {
      id: 'normal',
      name: '正常',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'value', min: 0, max: 100 },
      priority: 2,
    },
    {
      id: 'low',
      name: '低报警',
      color: '#ffa502',
      condition: { type: 'compare', variable: 'value', operator: '<', value: 0 },
      priority: 3,
    },
  ],
  dataBindings: [],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '传感器',
      group: '基本',
    },
    {
      key: 'sensorType',
      label: '传感器类型',
      type: 'select',
      default: 'temperature',
      options: [
        { label: '温度', value: 'temperature' },
        { label: '压力', value: 'pressure' },
        { label: '流量', value: 'flow' },
        { label: '液位', value: 'level' },
      ],
      group: '参数',
    },
    {
      key: 'value',
      label: '当前值',
      type: 'number',
      default: 0,
      group: '运行参数',
    },
  ],
}

export const electricalComponents: ComponentDefinition[] = [
  MotorDefinition,
  SensorDefinition,
]
