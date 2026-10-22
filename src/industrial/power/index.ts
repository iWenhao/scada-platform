import type { ComponentDefinition } from '@/types/scada'

/** 汽轮机 */
export const TurbineDefinition: ComponentDefinition = {
  type: 'turbine',
  name: '汽轮机',
  group: 'power',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="93" rx="30" ry="5" data-shadow="1"/>
      <polygon points="50,64 76,77 50,90 24,77" data-face="deck"/>
      <polygon points="24,77 50,90 50,93 24,80" data-face="front"/>
      <polygon points="50,90 76,77 76,80 50,93" data-face="side"/>
      <path d="M24 77 L50 64 L76 77" data-edge="hi"/>
      <path d="M24 80 L50 93 L76 80" data-edge="lo"/>
      <polygon points="50,32 74,44 50,56 26,44" data-face="top"/>
      <polygon points="26,44 50,56 50,80 26,68" data-face="front"/>
      <polygon points="50,56 74,44 74,68 50,80" data-face="side"/>
      <path d="M26 44 L50 32 L74 44" data-edge="hi"/>
      <path d="M26 44 L26 68" data-edge="hi"/>
      <path d="M26 68 L50 80 L74 68" data-edge="lo"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="32" y1="47" x2="32" y2="71"/>
        <line x1="38" y1="50" x2="38" y2="74"/>
        <line x1="44" y1="53" x2="44" y2="77"/>
      </g>
      <ellipse cx="68" cy="59" rx="5.5" ry="8" data-face="cap"/>
      <ellipse cx="68" cy="59" rx="5.5" ry="8" data-edge="hi" stroke-width="1.3"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="68" y1="53" x2="68" y2="65"/>
        <line x1="64.5" y1="56" x2="71.5" y2="62"/>
        <line x1="71.5" y1="56" x2="64.5" y2="62"/>
      </g>
      <path d="M74 59 L88 52" data-pipe="base"/>
      <path d="M74 57.4 L88 50.4" data-pipe="hi"/>
      <ellipse cx="88" cy="52" rx="2" ry="4" data-face="cap"/>
      <path d="M38 44 L38 26" data-pipe="base"/>
      <path d="M36.4 44 L36.4 26" data-pipe="hi"/>
      <ellipse cx="38" cy="44" rx="4" ry="2" data-face="cap"/>
      <ellipse cx="38" cy="26" rx="5" ry="2.5" data-face="cap"/>
      <ellipse cx="38" cy="26" rx="5" ry="2.5" data-edge="hi" stroke-width="1.1"/>
      <path d="M60 42 L60 31" data-pipe="base"/>
      <path d="M58.4 42 L58.4 31" data-pipe="hi"/>
      <ellipse cx="60" cy="42" rx="3" ry="1.5" data-face="cap"/>
      <ellipse cx="60" cy="31" rx="3" ry="1.5" data-face="cap"/>
    </g>
  </svg>`,
  defaultWidth: 90,
  defaultHeight: 95,
  defaultConfig: {
    speed: 0,
    inletTemp: 25,
  },
  statusRules: [
    {
      id: 'overspeed',
      name: '超速',
      color: '#ff4757',
      severity: 'critical',
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
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="87" rx="27" ry="5" data-shadow="1"/>
      <polygon points="50,66 74,78 50,90 26,78" data-face="deck"/>
      <polygon points="26,78 50,90 50,93 26,81" data-face="front"/>
      <polygon points="50,90 74,78 74,81 50,93" data-face="side"/>
      <path d="M26 78 L50 66 L74 78" data-edge="hi"/>
      <path d="M26 81 L50 93 L74 81" data-edge="lo"/>
      <polygon points="50,26 72,37 50,48 28,37" data-face="top"/>
      <polygon points="28,37 50,48 50,76 28,65" data-face="front"/>
      <polygon points="50,48 72,37 72,65 50,76" data-face="side"/>
      <path d="M28 37 L50 26 L72 37" data-edge="hi"/>
      <path d="M28 37 L28 65" data-edge="hi"/>
      <path d="M28 65 L50 76 L72 65" data-edge="lo"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="33" y1="39.5" x2="33" y2="67.5"/>
        <line x1="39" y1="42.5" x2="39" y2="70.5"/>
        <line x1="45" y1="45.5" x2="45" y2="73.5"/>
        <line x1="55" y1="45.5" x2="55" y2="73.5"/>
        <line x1="59" y1="43.5" x2="59" y2="71.5"/>
      </g>
      <ellipse cx="66" cy="54" rx="5" ry="8" data-face="cap"/>
      <ellipse cx="66" cy="54" rx="5" ry="8" data-edge="hi" stroke-width="1.3"/>
      <ellipse cx="66" cy="54" rx="1.8" ry="3.2" data-face="hole"/>
      <polygon points="50,16 60,21 50,26 40,21" data-face="top"/>
      <polygon points="40,21 50,26 50,32 40,27" data-face="front"/>
      <polygon points="50,26 60,21 60,27 50,32" data-face="side"/>
      <path d="M40 21 L50 16 L60 21" data-edge="hi"/>
      <path d="M40 27 L50 32" data-edge="lo"/>
      <path d="M50 18 L50 8" data-pipe="base"/>
      <path d="M48.4 18 L48.4 8" data-pipe="hi"/>
      <ellipse cx="50" cy="18" rx="2.5" ry="1.2" data-face="cap"/>
      <ellipse cx="50" cy="8" rx="3" ry="1.5" data-face="cap"/>
    </g>
  </svg>`,
  defaultWidth: 64,
  defaultHeight: 95,
  defaultConfig: {
    power: 0,
    voltage: 10.5,
  },
  statusRules: [
    {
      id: 'overload',
      name: '过载',
      color: '#ffa502',
      severity: 'critical',
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
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="90" rx="26" ry="5" data-shadow="1"/>
      <path d="M26 24 A24 12 0 0 1 74 24 L74 78 A24 12 0 0 1 26 78 Z" data-face="body"/>
      <path d="M26 52 A24 12 0 0 0 74 52" data-edge="lo"/>
      <ellipse cx="50" cy="24" rx="24" ry="12" data-face="cap"/>
      <ellipse cx="50" cy="24" rx="24" ry="12" data-edge="hi"/>
      <path d="M26 78 A24 12 0 0 0 74 78" data-edge="lo"/>
      <path d="M30 46 A21 10.5 0 0 0 70 46" stroke-dasharray="5 3" stroke-opacity="0.7"/>
      <path d="M62 18 L62 6" data-pipe="base"/>
      <path d="M60.4 18 L60.4 6" data-pipe="hi"/>
      <ellipse cx="62" cy="18" rx="3.5" ry="1.8" data-face="cap"/>
      <ellipse cx="62" cy="6" rx="4" ry="2" data-face="cap"/>
      <ellipse cx="62" cy="6" rx="4" ry="2" data-edge="hi" stroke-width="1.1"/>
      <path d="M40 20 L40 11" data-pipe="base"/>
      <path d="M38.4 20 L38.4 11" data-pipe="hi"/>
      <ellipse cx="40" cy="20" rx="3" ry="1.5" data-face="cap"/>
      <ellipse cx="40" cy="11" rx="3" ry="1.5" data-face="cap"/>
      <path d="M74 70 L88 77" data-pipe="base"/>
      <path d="M74 68.4 L88 75.4" data-pipe="hi"/>
      <ellipse cx="88" cy="77" rx="2" ry="4" data-face="cap"/>
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
      severity: 'critical',
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
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="88" rx="26" ry="5" data-shadow="1"/>
      <polygon points="50,28 73,39.5 50,51 27,39.5" data-face="top"/>
      <polygon points="27,39.5 50,51 50,87 27,75.5" data-face="front"/>
      <polygon points="50,51 73,39.5 73,75.5 50,87" data-face="side"/>
      <path d="M27 39.5 L50 28 L73 39.5" data-edge="hi"/>
      <path d="M27 39.5 L27 75.5" data-edge="hi"/>
      <path d="M27 75.5 L50 87 L73 75.5" data-edge="lo"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="32" y1="42" x2="32" y2="78"/>
        <line x1="37" y1="44.5" x2="37" y2="80.5"/>
        <line x1="42" y1="47" x2="42" y2="83"/>
        <line x1="55" y1="48.5" x2="55" y2="84.5"/>
        <line x1="60" y1="46" x2="60" y2="82"/>
        <line x1="65" y1="43.5" x2="65" y2="79.5"/>
      </g>
      <path d="M31 61 L42 66.5 L42 71 L31 65.5 Z" data-edge="lo"/>
      <rect x="34.6" y="24" width="2.8" height="17" data-face="body"/>
      <ellipse cx="36" cy="41" rx="3.2" ry="1.6" data-face="cap"/>
      <ellipse cx="36" cy="24" rx="2.6" ry="1.3" data-face="cap"/>
      <rect x="48.6" y="24" width="2.8" height="17" data-face="body"/>
      <ellipse cx="50" cy="41" rx="3.2" ry="1.6" data-face="cap"/>
      <ellipse cx="50" cy="24" rx="2.6" ry="1.3" data-face="cap"/>
      <rect x="62.6" y="24" width="2.8" height="17" data-face="body"/>
      <ellipse cx="64" cy="41" rx="3.2" ry="1.6" data-face="cap"/>
      <ellipse cx="64" cy="24" rx="2.6" ry="1.3" data-face="cap"/>
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
      severity: 'critical',
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
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="51" cy="84" rx="22" ry="4.5" data-shadow="1"/>
      <polygon points="50,32 68,41 50,50 32,41" data-face="top"/>
      <polygon points="32,41 50,50 50,82 32,71" data-face="front"/>
      <polygon points="50,50 68,41 68,71 50,82" data-face="side"/>
      <path d="M32 41 L50 32 L68 41" data-edge="hi"/>
      <path d="M32 41 L32 71" data-edge="hi"/>
      <path d="M32 71 L50 82 L68 71" data-edge="lo"/>
      <path d="M36 46 L46 51 L46 73 L36 68 Z" data-edge="lo"/>
      <path d="M38 68 L38 57" data-pipe="base"/>
      <path d="M36.4 68 L36.4 57" data-pipe="hi"/>
      <ellipse cx="38" cy="57" rx="3.2" ry="3.2" data-face="cap"/>
      <ellipse cx="38" cy="57" rx="3.2" ry="3.2" data-edge="hi" stroke-width="1.2"/>
      <ellipse cx="40" cy="41" rx="3.5" ry="1.75" data-face="cap"/>
      <rect x="38.6" y="26" width="2.8" height="15" data-face="body"/>
      <ellipse cx="40" cy="26" rx="2.6" ry="1.3" data-face="cap"/>
      <ellipse cx="50" cy="41" rx="3.5" ry="1.75" data-face="cap"/>
      <rect x="48.6" y="26" width="2.8" height="15" data-face="body"/>
      <ellipse cx="50" cy="26" rx="2.6" ry="1.3" data-face="cap"/>
      <ellipse cx="60" cy="41" rx="3.5" ry="1.75" data-face="cap"/>
      <rect x="58.6" y="26" width="2.8" height="15" data-face="body"/>
      <ellipse cx="60" cy="26" rx="2.6" ry="1.3" data-face="cap"/>
    </g>
  </svg>`,
  defaultWidth: 60,
  defaultHeight: 84,
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
