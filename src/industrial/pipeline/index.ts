import type { ComponentDefinition } from '@/types/scada'

export const PipeDefinition: ComponentDefinition = {
  type: 'pipe',
  name: '管道',
  group: 'pipeline',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <line x1="10" y1="35" x2="90" y2="35" />
      <line x1="10" y1="65" x2="90" y2="65" />
      <line x1="10" y1="40" x2="90" y2="40" stroke-width="1" opacity="0.5" />
      <line x1="10" y1="60" x2="90" y2="60" stroke-width="1" opacity="0.5" />
      <polygon points="80,50 70,45 70,55" fill="currentColor" />
      <rect x="10" y="30" width="8" height="40" />
      <rect x="82" y="30" width="8" height="40" />
    </g>
  </svg>`,
  defaultWidth: 120,
  defaultHeight: 40,
  defaultConfig: {
    diameter: 50,
    flowRate: 0,
    showFlow: true,
    flowDirection: 'forward',
    flowSpeed: 1,
  },
  statusRules: [
    {
      id: 'flowing',
      name: '流动',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'flowRate', operator: '>', value: 0 },
      priority: 1,
    },
    {
      id: 'stopped',
      name: '静止',
      color: '#666666',
      condition: { type: 'compare', variable: 'flowRate', operator: '=', value: 0 },
      priority: 2,
    },
  ],
  dataBindings: [
    { property: 'flowRate', variable: 'flowRate' },
  ],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '管道',
      group: '基本',
    },
    {
      key: 'diameter',
      label: '管径',
      type: 'number',
      default: 50,
      min: 10,
      max: 500,
      group: '参数',
    },
    {
      key: 'showFlow',
      label: '显示流动',
      type: 'boolean',
      default: true,
      group: '流向',
    },
    {
      key: 'flowDirection',
      label: '流向',
      type: 'select',
      default: 'forward',
      options: [
        { label: '正向 →', value: 'forward' },
        { label: '反向 ←', value: 'reverse' },
      ],
      group: '流向',
    },
    {
      key: 'flowSpeed',
      label: '流速',
      type: 'range',
      default: 1,
      min: 0.2,
      max: 5,
      step: 0.2,
      group: '流向',
    },
  ],
}

export const pipelineComponents: ComponentDefinition[] = [
  PipeDefinition,
]
