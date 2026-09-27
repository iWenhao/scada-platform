import type { ComponentDefinition } from '@/types/scada'

/** 沉淀池 */
export const SedimentTankDefinition: ComponentDefinition = {
  type: 'sediment_tank',
  name: '沉淀池',
  group: 'water',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="3">
      <path d="M20,35 L20,60 Q20,80 50,84 Q80,80 80,60 L80,35" />
      <line x1="14" y1="35" x2="86" y2="35" />
      <line x1="22" y1="50" x2="78" y2="50" stroke-dasharray="5,3" opacity="0.6" />
      <line x1="50" y1="35" x2="50" y2="68" />
      <line x1="34" y1="68" x2="66" y2="68" />
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
    <g fill="none" stroke="currentColor" stroke-width="3">
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
