import type { ComponentDefinition } from '@/types/scada'

/** 沉淀池 */
export const SedimentTankDefinition: ComponentDefinition = {
  type: 'sediment_tank',
  name: '沉淀池',
  group: 'water',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 35 A30 8 0 0 0 80 35 L80 60 Q80 78 50 82 Q20 78 20 60 Z" data-face="front"/>
      <ellipse cx="50" cy="35" rx="30" ry="8" data-face="cap"/>
      <path d="M22 52 H78" stroke-dasharray="5 3" stroke-opacity="0.5"/>
      <path d="M50 35 V66" stroke-opacity="0.45"/>
      <path d="M34 66 H66" stroke-opacity="0.45"/>
    </g>
  </svg>`,
  defaultWidth: 85,
  defaultHeight: 80,
  defaultConfig: {
    level: 0,
    turbidity: 0,
  },
  statusRules: [
    {
      id: 'high-level',
      name: '高液位',
      color: '#ffa502',
      severity: 'warning',
      condition: { type: 'compare', variable: 'level', operator: '>', value: 85 },
      priority: 1,
    },
    {
      id: 'normal',
      name: '正常',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'level', min: 40, max: 85 },
      priority: 2,
    },
    {
      id: 'low-level',
      name: '低液位',
      color: '#ff4757',
      severity: 'critical',
      condition: { type: 'compare', variable: 'level', operator: '<', value: 40 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'level', variable: 'level' },
    { property: 'turbidity', variable: 'turbidity' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '沉淀池', group: '基本' },
    { key: 'turbidity', label: '浊度(NTU)', type: 'number', default: 0, min: 0, max: 100, group: '运行参数' },
  ],
}

/** 潜污泵 */
export const SubPumpDefinition: ComponentDefinition = {
  type: 'sub_pump',
  name: '潜污泵',
  group: 'water',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="52" cy="55" r="18" />
      <polygon points="34,55 18,46 18,64" />
      <path d="M20,24 Q30,14 40,24 T60,24 T80,24" />
      <path d="M25,37 Q35,27 45,37 T65,37" opacity="0.6" />
      <line x1="52" y1="73" x2="52" y2="86" />
      <line x1="36" y1="86" x2="68" y2="86" />
    </g>
  </svg>`,
  defaultWidth: 70,
  defaultHeight: 70,
  defaultConfig: {
    running: 0,
    flow: 0,
  },
  statusRules: [
    {
      id: 'running',
      name: '运行',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'running', operator: '=', value: 1 },
      priority: 1,
    },
    {
      id: 'stopped',
      name: '停止',
      color: '#666666',
      condition: { type: 'compare', variable: 'running', operator: '=', value: 0 },
      priority: 2,
    },
  ],
  dataBindings: [
    { property: 'running', variable: 'running' },
    { property: 'flow', variable: 'flow' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '潜污泵', group: '基本' },
    { key: 'flow', label: '流量(m³/h)', type: 'number', default: 0, min: 0, max: 500, group: '运行参数' },
  ],
}

export const waterComponents: ComponentDefinition[] = [
  SedimentTankDefinition,
  SubPumpDefinition,
]
