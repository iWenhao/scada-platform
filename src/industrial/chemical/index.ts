import type { ComponentDefinition } from '@/types/scada'

/** 反应釜 */
export const ReactorDefinition: ComponentDefinition = {
  type: 'reactor',
  name: '反应釜',
  group: 'chemical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <path d="M30,22 L70,22 L70,58 Q70,80 50,84 Q30,80 30,58 Z" />
      <rect x="44" y="8" width="12" height="10" />
      <line x1="50" y1="18" x2="50" y2="62" />
      <line x1="38" y1="46" x2="62" y2="46" />
      <line x1="38" y1="56" x2="62" y2="56" />
      <line x1="70" y1="34" x2="84" y2="34" />
      <line x1="30" y1="40" x2="16" y2="40" />
    </g>
  </svg>`,
  defaultWidth: 70,
  defaultHeight: 90,
  defaultConfig: {
    temp: 25,
    pressure: 0.1,
  },
  statusRules: [
    {
      id: 'over-temp',
      name: '超温',
      color: '#ff4757',
      condition: { type: 'compare', variable: 'temp', operator: '>', value: 180 },
      priority: 1,
    },
    {
      id: 'reacting',
      name: '反应中',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'temp', min: 60, max: 180 },
      priority: 2,
    },
    {
      id: 'standby',
      name: '待机',
      color: '#666666',
      condition: { type: 'compare', variable: 'temp', operator: '<', value: 60 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'temp', variable: 'temp' },
    { property: 'pressure', variable: 'pressure' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '反应釜', group: '基本' },
    { key: 'temp', label: '釜内温度(℃)', type: 'number', default: 25, min: -20, max: 300, group: '运行参数' },
  ],
}

/** 换热器 */
export const HeatExchangerDefinition: ComponentDefinition = {
  type: 'heat_exchanger',
  name: '换热器',
  group: 'chemical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <circle cx="50" cy="50" r="28" />
      <path d="M22,50 L34,38 L46,62 L58,38 L70,62 L78,50" />
    </g>
  </svg>`,
  defaultWidth: 70,
  defaultHeight: 70,
  defaultConfig: {
    flow: 0,
    tempOut: 25,
  },
  statusRules: [
    {
      id: 'exchanging',
      name: '换热中',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'flow', operator: '>', value: 0 },
      priority: 1,
    },
    {
      id: 'stopped',
      name: '停用',
      color: '#666666',
      condition: { type: 'compare', variable: 'flow', operator: '=', value: 0 },
      priority: 2,
    },
  ],
  dataBindings: [
    { property: 'flow', variable: 'flow' },
    { property: 'tempOut', variable: 'tempOut' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '换热器', group: '基本' },
    { key: 'tempOut', label: '出口温度(℃)', type: 'number', default: 25, min: 0, max: 200, group: '运行参数' },
  ],
}

export const chemicalComponents: ComponentDefinition[] = [
  ReactorDefinition,
  HeatExchangerDefinition,
]
