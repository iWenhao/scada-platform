import type { ComponentDefinition } from '@/types/scada'
import { buildAssetComponents, type AssetMotionSpec } from '../assetComponents'
import { coalAssetIcons, coalAssetMeta } from './assets.generated'

/**
 * 综采采煤机（素材导入）的两只截割滚筒。
 *
 * 滚筒在素材里是一整个带 transform 链的 `<g>`，buildAssetComponents 按锚点把它从机身
 * 挖出来做旋转件（挖法与回落条件见 assetComponents.ts 的 AssetRotorSpec）。
 * 圆心取各分组 transform 的不动点：左滚筒 `translate(cx,cy) rotate(-45) translate(-cx,-cy)`
 * 与右滚筒 `translate(cx,cy) scale(-1,1) translate(-cx,-cy)`，与图元尾部的中心定位点
 * `circle cx=78.5/553.5` 相互印证。右滚筒是左滚筒的镜像，配反向转动才与机身对称。
 */
const coalAssetMotion: Record<string, AssetMotionSpec> = {
  coal_shearer_wide: {
    driveVariable: 'state',
    rotors: [
      { anchor: 'translate(78.441366, 78.441366) rotate(-45.000000)', cx: 78.441366, cy: 78.441366 },
      {
        anchor: 'translate(553.742025, 152.190819) scale(-1, 1)',
        cx: 553.742025,
        cy: 152.190819,
        direction: -1,
      },
    ],
  },
}

/** 掘进机 */
export const RoadheaderDefinition: ComponentDefinition = {
  type: 'roadheader',
  name: '掘进机',
  group: 'coal',
  // 截割头的截齿要随截割头转动，已移入 motion.rotors（悬臂与机身保持静止）
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="40" y="64" width="46" height="16" rx="8" />
      <circle cx="53" cy="72" r="4" />
      <circle cx="74" cy="72" r="4" />
      <rect x="44" y="42" width="34" height="22" />
      <line x1="44" y1="52" x2="23" y2="38" />
      <circle cx="16" cy="33" r="11" />
    </g>
  </svg>`,
  defaultWidth: 100,
  defaultHeight: 60,
  defaultConfig: {
    cutting: 0,
    load: 0,
    animate: true,
  },
  // 截齿绕截割头圆心（16,33）转动
  motion: {
    driveVariable: 'cutting',
    degPerUnit: 120,
    rotors: [
      {
        cx: 16,
        cy: 33,
        svg: `<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
          <line x1="9" y1="25" x2="5" y2="21" />
          <line x1="23" y1="24" x2="27" y2="20" />
          <line x1="6" y1="33" x2="1" y2="33" />
          <line x1="24" y1="41" x2="28" y2="44" />
        </g>`,
      },
    ],
  },
  statusRules: [
    {
      id: 'overload',
      name: '截割过载',
      color: '#ffa502',
      severity: 'critical',
      condition: {
        type: 'and',
        conditions: [
          { type: 'compare', variable: 'cutting', operator: '=', value: 1 },
          { type: 'compare', variable: 'load', operator: '>', value: 90 },
        ],
      },
      priority: 1,
    },
    {
      id: 'driving',
      name: '掘进中',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'cutting', operator: '=', value: 1 },
      priority: 2,
    },
    {
      id: 'stopped',
      name: '停机',
      color: '#666666',
      condition: { type: 'compare', variable: 'cutting', operator: '=', value: 0 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'cutting', variable: 'cutting' },
    { property: 'load', variable: 'load' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '掘进机', group: '基本' },
    { key: 'animate', label: '运转动效', type: 'boolean', default: true, group: '基本' },
    { key: 'load', label: '截割载荷(%)', type: 'number', default: 0, min: 0, max: 120, group: '运行参数' },
  ],
}

/** 皮带输送机 */
export const ConveyorDefinition: ComponentDefinition = {
  type: 'conveyor',
  name: '皮带输送机',
  group: 'coal',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
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
    animate: true,
  },
  // 带面滚动：在上下带边（y=53..71，厚 18）之间推进竖线标记，表达输送方向与带速
  motion: {
    driveVariable: 'speed',
    belts: [{ x1: 20, x2: 80, y: 62, bandHeight: 18, direction: 1 }],
  },
  statusRules: [
    {
      id: 'overload',
      name: '超载',
      color: '#ffa502',
      severity: 'critical',
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
    { key: 'animate', label: '运转动效', type: 'boolean', default: true, group: '基本' },
    { key: 'beltSpeed', label: '带速(m/s)', type: 'number', default: 0, min: 0, max: 4, group: '运行参数' },
  ],
}

/** 矿用通风机 */
export const FanDefinition: ComponentDefinition = {
  type: 'fan',
  name: '通风机',
  group: 'coal',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
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
      severity: 'warning',
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
      severity: 'normal',
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
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
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
      severity: 'critical',
      condition: { type: 'compare', variable: 'density', operator: '>', value: 1 },
      priority: 1,
    },
    {
      id: 'warning',
      name: '预警',
      color: '#ffa502',
      severity: 'warning',
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
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
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
      severity: 'critical',
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

/** 原煤仓 */
export const CoalBunkerDefinition: ComponentDefinition = {
  type: 'coal_bunker',
  name: '原煤仓',
  group: 'coal',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30,14 L70,14 L70,50 L58,76 L42,76 L30,50 Z" />
      <line x1="30" y1="28" x2="70" y2="28" stroke-dasharray="5,3" opacity="0.6" />
      <rect x="44" y="76" width="12" height="8" />
      <line x1="38" y1="76" x2="34" y2="92" />
      <line x1="62" y1="76" x2="66" y2="92" />
      <line x1="28" y1="92" x2="72" y2="92" />
    </g>
  </svg>`,
  defaultWidth: 70,
  defaultHeight: 105,
  defaultConfig: {
    level: 0,
    temp: 25,
  },
  statusRules: [
    {
      id: 'high-level',
      name: '高煤位',
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
      name: '低煤位',
      color: '#ff4757',
      severity: 'critical',
      condition: { type: 'compare', variable: 'level', operator: '<', value: 40 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'level', variable: 'level' },
    { property: 'temp', variable: 'temp' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '原煤仓', group: '基本' },
    { key: 'level', label: '煤位(%)', type: 'range', default: 0, min: 0, max: 100, step: 1, group: '运行参数' },
  ],
}

export const coalComponents: ComponentDefinition[] = [
  RoadheaderDefinition,
  ConveyorDefinition,
  FanDefinition,
  GasSensorDefinition,
  HoistDefinition,
  CoalBunkerDefinition,
  // 综采系统（外部素材导入，9 台）：组合开关/采煤机/液压支架/破碎机/转载机等。
  // 手写的 ShearerDefinition 已移除——它与素材「采煤机」同名且同为综采设备，
  // 线条稿版本是早期占位，保留素材图元；溯源见 scripts/subunit-manifest.json
  // 采煤机的两只滚筒按 coalAssetMotion 声明挖成旋转件，其余图元保持静止
  ...buildAssetComponents('coal', coalAssetIcons, coalAssetMeta, coalAssetMotion),
]
