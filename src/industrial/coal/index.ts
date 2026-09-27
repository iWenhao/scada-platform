import type { ComponentDefinition } from '@/types/scada'

/** 皮带输送机 */
export const ConveyorDefinition: ComponentDefinition = {
  type: 'conveyor',
  name: '皮带输送机',
  group: 'coal',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <circle cx="18" cy="62" r="9" />
      <circle cx="82" cy="62" r="9" />
      <line x1="18" y1="53" x2="82" y2="53" />
      <line x1="18" y1="71" x2="82" y2="71" />
      <line x1="30" y1="71" x2="30" y2="90" />
      <line x1="70" y1="71" x2="70" y2="90" />
      <polygon points="38,53 62,53 55,38 45,38" />
      <line x1="26" y1="46" x2="34" y2="46" />
      <line x1="66" y1="46" x2="74" y2="46" />
    </g>
  </svg>`,
  defaultWidth: 110,
  defaultHeight: 50,
  defaultConfig: {
    beltSpeed: 0,
    length: 100,
  },
  statusRules: [
    {
      id: 'overload',
      name: '超载',
      color: '#ffa502',
      condition: { type: 'compare', variable: 'load', operator: '>', value: 90 },
      priority: 1,
    },
    {
      id: 'running',
      name: '运行',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'speed', operator: '>', value: 0.1 },
      priority: 2,
    },
    {
      id: 'stopped',
      name: '停止',
      color: '#666666',
      condition: { type: 'compare', variable: 'speed', operator: '=', value: 0 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'beltSpeed', variable: 'speed' },
    { property: 'load', variable: 'load' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '皮带输送机', group: '基本' },
    { key: 'beltSpeed', label: '带速(m/s)', type: 'number', default: 0, min: 0, max: 4, group: '运行参数' },
  ],
}

/** 矿用通风机 */
export const FanDefinition: ComponentDefinition = {
  type: 'fan',
  name: '通风机',
  group: 'coal',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <rect x="22" y="22" width="56" height="56" rx="4" />
      <circle cx="50" cy="50" r="6" />
      <line x1="50" y1="50" x2="30" y2="30" />
      <line x1="50" y1="50" x2="70" y2="30" />
      <line x1="50" y1="50" x2="30" y2="70" />
      <line x1="50" y1="50" x2="70" y2="70" />
    </g>
  </svg>`,
  defaultWidth: 70,
  defaultHeight: 70,
  defaultConfig: {
    speed: 0,
    airVolume: 0,
  },
  statusRules: [
    {
      id: 'high-vibration',
      name: '振动超标',
      color: '#ffa502',
      condition: {
        type: 'and',
        conditions: [
          { type: 'compare', variable: 'vibration', operator: '>', value: 5 },
          { type: 'compare', variable: 'speed', operator: '>', value: 0 },
        ],
      },
      priority: 1,
    },
    {
      id: 'running',
      name: '运行',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'speed', operator: '>', value: 0 },
      priority: 2,
    },
    {
      id: 'stopped',
      name: '停止',
      color: '#ff4757',
      condition: { type: 'compare', variable: 'speed', operator: '=', value: 0 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'speed', variable: 'speed' },
    { property: 'vibration', variable: 'vibration' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '通风机', group: '基本' },
    { key: 'airVolume', label: '风量(m³/min)', type: 'number', default: 0, min: 0, max: 10000, group: '运行参数' },
  ],
}

/** 瓦斯传感器 */
export const GasSensorDefinition: ComponentDefinition = {
  type: 'gas_sensor',
  name: '瓦斯传感器',
  group: 'coal',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <rect x="30" y="48" width="40" height="34" rx="3" />
      <text x="50" y="70" text-anchor="middle" font-size="13" font-weight="bold" fill="currentColor" stroke="none">CH4</text>
      <line x1="50" y1="48" x2="50" y2="34" />
      <circle cx="50" cy="30" r="4" />
      <path d="M60,22 Q66,30 60,38" />
      <path d="M67,16 Q76,30 67,44" />
    </g>
  </svg>`,
  defaultWidth: 55,
  defaultHeight: 80,
  defaultConfig: {
    density: 0,
    alarmThreshold: 1.0,
  },
  statusRules: [
    {
      id: 'alarm',
      name: '瓦斯报警',
      color: '#ff4757',
      condition: { type: 'compare', variable: 'density', operator: '>', value: 1 },
      priority: 1,
    },
    {
      id: 'warning',
      name: '预警',
      color: '#ffa502',
      condition: { type: 'range', variable: 'density', min: 0.8, max: 1 },
      priority: 2,
    },
    {
      id: 'normal',
      name: '正常',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'density', min: 0, max: 0.8 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'density', variable: 'density' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '瓦斯传感器', group: '基本' },
    { key: 'alarmThreshold', label: '报警阈值(%CH4)', type: 'number', default: 1.0, min: 0.5, max: 3, group: '参数' },
  ],
}

/** 提升机 */
export const HoistDefinition: ComponentDefinition = {
  type: 'hoist',
  name: '提升机',
  group: 'coal',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <polygon points="28,90 50,28 72,90" />
      <circle cx="50" cy="22" r="8" />
      <line x1="50" y1="30" x2="50" y2="58" />
      <rect x="40" y="58" width="20" height="18" />
      <line x1="15" y1="90" x2="85" y2="90" />
    </g>
  </svg>`,
  defaultWidth: 70,
  defaultHeight: 90,
  defaultConfig: {
    speed: 0,
    load: 0,
  },
  statusRules: [
    {
      id: 'overload',
      name: '超载',
      color: '#ffa502',
      condition: { type: 'compare', variable: 'load', operator: '>', value: 90 },
      priority: 1,
    },
    {
      id: 'running',
      name: '运行',
      color: '#00d4aa',
      condition: { type: 'expression', expr: 'speed > 0 OR speed < 0' },
      priority: 2,
    },
    {
      id: 'stopped',
      name: '停止',
      color: '#666666',
      condition: { type: 'compare', variable: 'speed', operator: '=', value: 0 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'speed', variable: 'speed' },
    { property: 'load', variable: 'load' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '提升机', group: '基本' },
    { key: 'load', label: '载荷(t)', type: 'number', default: 0, min: 0, max: 100, group: '运行参数' },
  ],
}

export const coalComponents: ComponentDefinition[] = [
  ConveyorDefinition,
  FanDefinition,
  GasSensorDefinition,
  HoistDefinition,
]
