import type { ComponentDefinition } from '@/types/scada'
import { buildAssetComponents } from '../assetComponents'
import {
  electricalAssetIcons,
  electricalAssetMeta,
} from './assets.generated'

export const MotorDefinition: ComponentDefinition = {
  type: 'motor',
  name: '电机',
  group: 'electrical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="84" rx="28" ry="6" data-shadow="1"/>
      <polygon points="50,22 74,34 50,46 26,34" data-face="top"/>
      <polygon points="26,34 50,46 50,82 26,70" data-face="front"/>
      <polygon points="50,46 74,34 74,70 50,82" data-face="side"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="32" y1="37" x2="32" y2="73"/>
        <line x1="38" y1="40" x2="38" y2="76"/>
        <line x1="44" y1="43" x2="44" y2="79"/>
      </g>
      <path d="M26 34 L50 46 L74 34" data-edge="hi"/>
      <path d="M26 34 L26 70" data-edge="hi"/>
      <path d="M26 70 L50 82 L74 70" data-edge="lo"/>
      <polygon points="46,14 56,19 46,24 36,19" data-face="top"/>
      <polygon points="36,19 46,24 46,31 36,26" data-face="front"/>
      <polygon points="46,24 56,19 56,26 46,31" data-face="side"/>
      <path d="M36 19 L46 14 L56 19" data-edge="hi"/>
      <path d="M36 26 L46 31" data-edge="lo"/>
      <ellipse cx="67" cy="52" rx="5.5" ry="10" data-face="cap"/>
      <ellipse cx="67" cy="52" rx="5.5" ry="10" data-edge="hi"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="67" y1="44" x2="67" y2="60"/>
        <line x1="63" y1="48" x2="71" y2="56"/>
        <line x1="71" y1="48" x2="63" y2="56"/>
      </g>
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
      severity: 'normal',
      condition: { type: 'compare', variable: 'speed', operator: '=', value: 0 },
      priority: 2,
    },
    {
      id: 'high-temp',
      name: '高温',
      color: '#ffa502',
      severity: 'critical',
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
  dataBindings: [
    { property: 'speed', variable: 'speed' },
    { property: 'temp', variable: 'temp' },
  ],
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
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
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
      severity: 'critical',
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
      severity: 'critical',
      condition: { type: 'compare', variable: 'value', operator: '<', value: 0 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'value', variable: 'value' },
  ],
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

/** 控制柜：2.5D 样板批新增，图元按面基等轴测绘制（见 docs/2.5D_ILLUSTRATION_GUIDE.md §4） */
export const CabinetDefinition: ComponentDefinition = {
  type: 'cabinet',
  name: '控制柜',
  group: 'electrical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="54" cy="86" rx="19" ry="5" data-shadow="1"/>
      <polygon points="32,68 50,77 50,81 32,72" data-face="front"/>
      <polygon points="50,77 68,68 68,72 50,81" data-face="side"/>
      <polygon points="50,10 69,19.5 50,29 31,19.5" data-face="top"/>
      <polygon points="31,19.5 50,29 50,76 31,66.5" data-face="front"/>
      <polygon points="50,29 69,19.5 69,66.5 50,76" data-face="side"/>
      <path d="M31 19.5 L50 29 L69 19.5" data-edge="hi"/>
      <path d="M50 29 L50 76" data-edge="lo"/>
      <path d="M31 66.5 L50 76" data-edge="lo"/>
      <path d="M35 25 L47 31 L47 71 L35 65 Z" data-edge="lo" stroke-width="1.2"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="36.5" y1="55" x2="44" y2="58.8"/>
        <line x1="36.5" y1="58.5" x2="44" y2="62.3"/>
        <line x1="36.5" y1="62" x2="44" y2="65.8"/>
      </g>
      <polygon points="54,45 60,42 60,50 54,53" data-face="cap"/>
    </g>
  </svg>`,
  defaultWidth: 60,
  defaultHeight: 85,
  defaultConfig: {
    temp: 25,
    current: 0,
  },
  statusRules: [
    {
      id: 'overheat',
      name: '柜内高温',
      color: '#ff4757',
      severity: 'critical',
      condition: { type: 'compare', variable: 'temp', operator: '>', value: 60 },
      priority: 1,
    },
    {
      id: 'normal',
      name: '正常',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'temp', min: 0, max: 60 },
      priority: 2,
    },
  ],
  dataBindings: [
    { property: 'temp', variable: 'temp' },
    { property: 'current', variable: 'current' },
  ],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '控制柜',
      group: '基本',
    },
    {
      key: 'temp',
      label: '柜内温度(℃)',
      type: 'number',
      default: 25,
      min: -20,
      max: 120,
      group: '运行参数',
    },
    {
      key: 'current',
      label: '电流(A)',
      type: 'number',
      default: 0,
      min: 0,
      max: 630,
      group: '运行参数',
    },
  ],
}

export const electricalComponents: ComponentDefinition[] = [
  MotorDefinition,
  SensorDefinition,
  CabinetDefinition,
  // 电力系统（外部素材导入，22 台）：变电/变压器/互感器/断路器/开关等。
  // 图元为单色线条稿，状态走统一 state 契约；溯源见 scripts/subunit-manifest.json
  ...buildAssetComponents('electrical', electricalAssetIcons, electricalAssetMeta),
]
