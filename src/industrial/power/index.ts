import type { ComponentDefinition } from '@/types/scada'

/** 汽轮机 */
export const TurbineDefinition: ComponentDefinition = {
  type: 'turbine',
  name: '汽轮机',
  group: 'power',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <polygon points="20,35 80,35 70,65 30,65" />
      <line x1="30" y1="35" x2="30" y2="65" />
      <line x1="40" y1="35" x2="40" y2="65" />
      <line x1="50" y1="35" x2="50" y2="65" />
      <line x1="60" y1="35" x2="60" y2="65" />
      <line x1="8" y1="50" x2="20" y2="50" />
      <line x1="80" y1="50" x2="92" y2="50" />
    </g>
  </svg>`,
  defaultWidth: 110,
  defaultHeight: 55,
  defaultConfig: {
    speed: 0,
    inletTemp: 25,
  },
  statusRules: [
    {
      id: 'overspeed',
      name: '超速',
      color: '#ff4757',
      condition: { type: 'compare', variable: 'speed', operator: '>', value: 3200 },
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
      name: '停机',
      color: '#666666',
      condition: { type: 'compare', variable: 'speed', operator: '=', value: 0 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'speed', variable: 'speed' },
    { property: 'inletTemp', variable: 'temp' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '汽轮机', group: '基本' },
    { key: 'speed', label: '转速(rpm)', type: 'number', default: 0, min: 0, max: 3600, group: '运行参数' },
  ],
}

/** 发电机 */
export const GeneratorDefinition: ComponentDefinition = {
  type: 'generator',
  name: '发电机',
  group: 'power',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <circle cx="50" cy="50" r="30" />
      <text x="50" y="59" text-anchor="middle" font-size="26" font-weight="bold" fill="currentColor" stroke="none">G</text>
      <line x1="20" y1="80" x2="80" y2="80" />
      <line x1="30" y1="80" x2="30" y2="88" />
      <line x1="70" y1="80" x2="70" y2="88" />
    </g>
  </svg>`,
  defaultWidth: 80,
  defaultHeight: 80,
  defaultConfig: {
    power: 0,
    voltage: 10.5,
  },
  statusRules: [
    {
      id: 'overload',
      name: '过载',
      color: '#ffa502',
      condition: { type: 'compare', variable: 'power', operator: '>', value: 550 },
      priority: 1,
    },
    {
      id: 'generating',
      name: '发电',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'power', operator: '>', value: 0 },
      priority: 2,
    },
    {
      id: 'stopped',
      name: '停机',
      color: '#666666',
      condition: { type: 'compare', variable: 'power', operator: '=', value: 0 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'power', variable: 'power' },
    { property: 'voltage', variable: 'voltage' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '发电机', group: '基本' },
    { key: 'power', label: '有功功率(MW)', type: 'number', default: 0, min: 0, max: 1000, group: '运行参数' },
  ],
}

/** 锅炉 */
export const BoilerDefinition: ComponentDefinition = {
  type: 'boiler',
  name: '锅炉',
  group: 'power',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <path d="M30,25 Q30,14 41,14 L59,14 Q70,14 70,25 L70,74 L30,74 Z" />
      <line x1="30" y1="56" x2="70" y2="56" stroke-dasharray="5,3" opacity="0.6" />
      <line x1="36" y1="14" x2="36" y2="5" />
      <line x1="50" y1="14" x2="50" y2="5" />
      <path d="M40,92 Q50,76 60,92" />
      <path d="M45,92 Q50,84 55,92" />
    </g>
  </svg>`,
  defaultWidth: 70,
  defaultHeight: 95,
  defaultConfig: {
    pressure: 0,
    drumLevel: 50,
  },
  statusRules: [
    {
      id: 'over-pressure',
      name: '超压',
      color: '#ff4757',
      condition: { type: 'compare', variable: 'pressure', operator: '>', value: 12 },
      priority: 1,
    },
    {
      id: 'normal',
      name: '运行',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'pressure', min: 5, max: 12 },
      priority: 2,
    },
    {
      id: 'stopped',
      name: '停炉',
      color: '#666666',
      condition: { type: 'compare', variable: 'pressure', operator: '<', value: 1 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'pressure', variable: 'pressure' },
    { property: 'drumLevel', variable: 'level' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '锅炉', group: '基本' },
    { key: 'pressure', label: '汽包压力(MPa)', type: 'number', default: 0, min: 0, max: 20, group: '运行参数' },
  ],
}

/** 变压器 */
export const TransformerDefinition: ComponentDefinition = {
  type: 'transformer',
  name: '变压器',
  group: 'power',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <circle cx="35" cy="50" r="18" />
      <circle cx="65" cy="50" r="18" />
      <line x1="35" y1="32" x2="35" y2="12" />
      <line x1="65" y1="32" x2="65" y2="12" />
      <line x1="35" y1="68" x2="35" y2="88" />
      <line x1="65" y1="68" x2="65" y2="88" />
    </g>
  </svg>`,
  defaultWidth: 60,
  defaultHeight: 90,
  defaultConfig: {
    temp: 25,
    loadRate: 0,
  },
  statusRules: [
    {
      id: 'overheat',
      name: '高温',
      color: '#ff4757',
      condition: { type: 'compare', variable: 'temp', operator: '>', value: 85 },
      priority: 1,
    },
    {
      id: 'normal',
      name: '正常',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'temp', min: 30, max: 85 },
      priority: 2,
    },
    {
      id: 'standby',
      name: '轻载',
      color: '#666666',
      condition: { type: 'compare', variable: 'temp', operator: '<', value: 30 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'temp', variable: 'temp' },
    { property: 'loadRate', variable: 'load' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '变压器', group: '基本' },
    { key: 'loadRate', label: '负载率(%)', type: 'number', default: 0, min: 0, max: 120, group: '运行参数' },
  ],
}

/** 断路器 */
export const BreakerDefinition: ComponentDefinition = {
  type: 'breaker',
  name: '断路器',
  group: 'power',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <line x1="12" y1="55" x2="40" y2="55" />
      <circle cx="44" cy="55" r="3" />
      <line x1="48" y1="55" x2="70" y2="34" />
      <rect x="65" y="26" width="9" height="9" />
      <circle cx="74" cy="55" r="3" />
      <line x1="78" y1="55" x2="92" y2="55" />
    </g>
  </svg>`,
  defaultWidth: 80,
  defaultHeight: 45,
  defaultConfig: {
    closed: 1,
    ratedCurrent: 630,
  },
  statusRules: [
    {
      id: 'closed',
      name: '合闸',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'closed', operator: '=', value: 1 },
      priority: 1,
    },
    {
      id: 'open',
      name: '分闸',
      color: '#666666',
      condition: { type: 'compare', variable: 'closed', operator: '=', value: 0 },
      priority: 2,
    },
  ],
  dataBindings: [
    { property: 'closed', variable: 'closed' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '断路器', group: '基本' },
    { key: 'ratedCurrent', label: '额定电流(A)', type: 'number', default: 630, min: 100, max: 4000, group: '参数' },
  ],
}

export const powerComponents: ComponentDefinition[] = [
  TurbineDefinition,
  GeneratorDefinition,
  BoilerDefinition,
  TransformerDefinition,
  BreakerDefinition,
]
