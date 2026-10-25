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

/**
 * 杆式传感器：底座、立柱、探头全按 2:1 箱体画，探头镜面用 `hole` 表达暗孔，
 * 天线与信号弧线保持普通线条（弧线是装饰，不能标 `data-edge` 抢轮廓）。
 */
export const SensorDefinition: ComponentDefinition = {
  type: 'sensor',
  name: '传感器',
  group: 'electrical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="89" rx="18" ry="3.5" data-shadow="1"/>
      <polygon points="38,79 50,85 62,79 50,73" data-face="deck"/>
      <polygon points="38,79 50,85 50,89 38,83" data-face="front"/>
      <polygon points="50,85 62,79 62,83 50,89" data-face="side"/>
      <path d="M38 79 L50 73 L62 79" data-edge="hi"/>
      <path d="M38 83 L50 89 L62 83" data-edge="lo"/>
      <polygon points="46,54 50,56 54,54 50,52" data-face="deck"/>
      <polygon points="46,54 50,56 50,78 46,76" data-face="front"/>
      <polygon points="50,56 54,54 54,76 50,78" data-face="side"/>
      <path d="M46 54 L50 52 L54 54" data-edge="hi"/>
      <path d="M46 54 L46 76" data-edge="hi"/>
      <path d="M46 76 L50 78 L54 76" data-edge="lo"/>
      <polygon points="34,30 50,38 66,30 50,22" data-face="top"/>
      <polygon points="34,30 50,38 50,52 34,44" data-face="front"/>
      <polygon points="50,38 66,30 66,44 50,52" data-face="side"/>
      <path d="M34 30 L50 22 L66 30" data-edge="hi"/>
      <path d="M34 30 L34 44" data-edge="hi"/>
      <path d="M34 44 L50 52 L66 44" data-edge="lo"/>
      <ellipse cx="42" cy="42" rx="3" ry="5" data-face="hole"/>
      <ellipse cx="42" cy="42" rx="3" ry="5" data-edge="hi" stroke-width="1"/>
      <path d="M58 30 L58 12" data-pipe="base"/>
      <path d="M56.4 30 L56.4 12" data-pipe="hi"/>
      <path d="M53 12 L63 12" data-pipe="base"/>
      <path d="M53 10.4 L63 10.4" data-pipe="hi"/>
      <path d="M68 26 Q74 34 68 42" stroke-opacity="0.5"/>
      <path d="M73 22 Q81 34 73 46" stroke-opacity="0.5"/>
    </g>
  </svg>`,
  defaultWidth: 52,
  defaultHeight: 88,
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

/**
 * 电气组素材件的面基覆盖表（2.5D）。
 *
 * 口径（2026-10-25 需求方确认）：22 台素材件里只有 8 台立体设备做面基化；
 * 其余 14 台是电气简图符号（绝缘子串、双圆变压器符号、接地、开关、指示灯等），
 * 类似指南 §9.3 的平面图形件——标了会生效但不是正确的立体表达，保持线条稿。
 * 画法遵循「同姿态重绘」：viewBox 逐字沿用原稿、外沿不越原稿轮廓，
 * 只把线换成「面 + 棱线 + 接触阴影」，2D 原稿留在生成文件的 icon 里不动。
 */
const illustratedAssets: Record<string, { icon25d: string; name?: string }> = {
  // 变电 1：箱体 + 穿体斜杠 + 上下引线 + 三层阶梯底座
  elec_substation_1: {
    icon25d: `<svg viewBox="0 0 49 86" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="22.3" cy="80.5" rx="13.5" ry="0.9" data-shadow="1"/>
      <line x1="22.6" y1="0" x2="22.6" y2="13.3" data-pipe="base" stroke-width="3"/>
      <line x1="21.9" y1="0" x2="21.9" y2="13.3" data-pipe="hi" stroke-width="1"/>
      <line x1="22.6" y1="52.1" x2="22.6" y2="68.5" data-pipe="base" stroke-width="3"/>
      <line x1="21.9" y1="52.1" x2="21.9" y2="68.5" data-pipe="hi" stroke-width="1"/>
      <polygon points="10.9,13.3 33.6,13.3 33.6,15.9 29.8,17.1 10.9,17.1" data-face="top"/>
      <polygon points="29.8,17.1 33.6,15.9 33.6,52.1 29.8,52.1" data-face="side"/>
      <polygon points="10.9,17.1 29.8,17.1 29.8,52.1 10.9,52.1" data-face="front"/>
      <path d="M10.9,13.3 L10.9,52.1" data-edge="hi"/>
      <path d="M10.9,17.1 L29.8,17.1" data-edge="hi"/>
      <path d="M29.8,17.1 L33.6,15.9" data-edge="lo"/>
      <path d="M29.8,17.1 L29.8,52.1" data-edge="lo"/>
      <path d="M10.9,52.1 L33.6,52.1" data-edge="lo"/>
      <path d="M45.2,18.7 L33.6,18.7 L11.5,46.3 L0,46.3" data-edge="lo" stroke-width="1.2"/>
      <path d="M8.51,68.47 L36.24,68.47" data-edge="lo"/>
      <path d="M15.38,74.93 L29.45,74.93" data-edge="lo"/>
      <path d="M17.91,81.39 L27.57,81.39" data-edge="lo"/>
    </g>
  </svg>`,
  },
  // 变电 5：圆表盘仪表（cap 盘面 + hole 表底），指针与外弧沿用原稿线条
  elec_substation_5: {
    icon25d: `<svg viewBox="0 0 68 89" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="32.6" cy="83.8" rx="19" ry="1" data-shadow="1"/>
      <line x1="32.2" y1="0" x2="32.2" y2="25.6" data-pipe="base" stroke-width="3"/>
      <line x1="31.5" y1="0" x2="31.5" y2="25.6" data-pipe="hi" stroke-width="1"/>
      <circle cx="32.6" cy="60.2" r="24.6" data-face="cap"/>
      <circle cx="32.6" cy="60.2" r="24.6" data-edge="hi"/>
      <circle cx="32.6" cy="60.2" r="19.5" data-face="hole"/>
      <circle cx="32.6" cy="60.2" r="19.5" data-edge="lo" stroke-width="1.1"/>
      <path d="M12.04,44.42 C4.56,33.08 7.69,17.78 19.04,10.3 C30.38,2.83 45.68,5.95 53.16,17.3 C58.5,25.38 58.59,35.86 53.42,44.03" stroke-width="2"/>
      <path d="M53.33,44.16 C46.03,55.63 30.82,59.07 19.3,51.77 C16.34,49.9 13.87,47.42 11.91,44.55"/>
      <path d="M0,42.12 L63.28,11.61" stroke-width="2.4"/>
      <path d="M32.38,25.69 L22.17,32.51 M32.38,25.69 L44.55,32.51"/>
      <path d="M35.95,61.79 L43.89,77.68 C44.12,78.13 43.94,78.67 43.49,78.9 C43.36,78.96 43.22,79 43.08,79 L27.19,79 C26.69,79 26.28,78.59 26.28,78.09 C26.28,77.95 26.31,77.81 26.38,77.68 L34.32,61.79 C34.55,61.34 35.09,61.16 35.54,61.38 C35.72,61.47 35.86,61.61 35.95,61.79 Z"/>
      <polyline transform="translate(58.51,13.78) rotate(-75) translate(-58.51,-13.78)" points="63.34,8.95 63.34,18.61 53.68,18.61" stroke-width="3"/>
    </g>
  </svg>`,
  },
  // 变电 9：箱体 + 穿体斜杠 + 上下引线（无底座）
  elec_substation_9: {
    icon25d: `<svg viewBox="0 0 46 86" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="20.1" cy="65.7" rx="13" ry="1.1" data-shadow="1"/>
      <line x1="20.6" y1="0" x2="20.6" y2="20.3" data-pipe="base" stroke-width="3"/>
      <line x1="19.9" y1="0" x2="19.9" y2="20.3" data-pipe="hi" stroke-width="1"/>
      <line x1="20.6" y1="64.6" x2="20.6" y2="81.8" data-pipe="base" stroke-width="3"/>
      <line x1="19.9" y1="64.6" x2="19.9" y2="81.8" data-pipe="hi" stroke-width="1"/>
      <polygon points="9.4,20.3 30.8,20.3 30.8,22.7 27.2,23.8 9.4,23.8" data-face="top"/>
      <polygon points="27.2,23.8 30.8,22.7 30.8,64.6 27.2,64.6" data-face="side"/>
      <polygon points="9.4,23.8 27.2,23.8 27.2,64.6 9.4,64.6" data-face="front"/>
      <path d="M9.4,20.3 L9.4,64.6" data-edge="hi"/>
      <path d="M9.4,23.8 L27.2,23.8" data-edge="hi"/>
      <path d="M27.2,23.8 L30.8,22.7" data-edge="lo"/>
      <path d="M27.2,23.8 L27.2,64.6" data-edge="lo"/>
      <path d="M9.4,64.6 L30.8,64.6" data-edge="lo"/>
      <path d="M41.3,17.3 L41.3,26.8 L0,59.5 L0,69.7" data-edge="lo" stroke-width="1.2"/>
    </g>
  </svg>`,
  },
  // 变电 10：实心本体 + 两端带箭头引线
  elec_substation_10: {
    icon25d: `<svg viewBox="0 0 27 96" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="11.8" cy="67.9" rx="13" ry="1.1" data-shadow="1"/>
      <line x1="11.8" y1="4.6" x2="11.8" y2="24.4" data-pipe="base" stroke-width="3"/>
      <line x1="11.1" y1="4.6" x2="11.1" y2="24.4" data-pipe="hi" stroke-width="1"/>
      <line x1="11.8" y1="66.8" x2="11.8" y2="85.8" data-pipe="base" stroke-width="3"/>
      <line x1="11.1" y1="66.8" x2="11.1" y2="85.8" data-pipe="hi" stroke-width="1"/>
      <polyline transform="translate(11.91,10.65) rotate(-135) translate(-11.91,-10.65)" points="19.5,3.17 16.66,15.33 4.33,18.13" stroke-width="3"/>
      <polyline transform="translate(11.91,79.69) scale(1,-1) rotate(-135) translate(-11.91,-79.69)" points="19.5,72.21 16.66,84.37 4.33,87.17" stroke-width="3"/>
      <polygon points="0,24.4 23.7,24.4 23.7,27 20,28.1 0,28.1" data-face="top"/>
      <polygon points="20,28.1 23.7,27 23.7,66.8 20,66.8" data-face="side"/>
      <polygon points="0,28.1 20,28.1 20,66.8 0,66.8" data-face="front"/>
      <path d="M0,24.4 L0,66.8" data-edge="hi"/>
      <path d="M0,28.1 L20,28.1" data-edge="hi"/>
      <path d="M20,28.1 L23.7,27" data-edge="lo"/>
      <path d="M20,28.1 L20,66.8" data-edge="lo"/>
      <path d="M0,66.8 L23.7,66.8" data-edge="lo"/>
    </g>
  </svg>`,
  },
  // 变电 13：屏柜（外箱体 + hole 暗屏，屏内符号沿用原稿线条）
  elec_substation_13: {
    icon25d: `<svg viewBox="0 0 86 56" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="40.9" cy="51.4" rx="42" ry="0.8" data-shadow="1"/>
      <polygon points="0,0 81.8,0 81.8,2.6 78,3.7 0,3.7" data-face="top"/>
      <polygon points="78,3.7 81.8,2.6 81.8,52.2 78,52.2" data-face="side"/>
      <polygon points="0,3.7 78,3.7 78,52.2 0,52.2" data-face="front"/>
      <path d="M0,0 L0,52.2" data-edge="hi"/>
      <path d="M0,3.7 L78,3.7" data-edge="hi"/>
      <path d="M78,3.7 L81.8,2.6" data-edge="lo"/>
      <path d="M78,3.7 L78,52.2" data-edge="lo"/>
      <path d="M0,52.2 L81.8,52.2" data-edge="lo"/>
      <rect x="9.5" y="6.1" width="62.7" height="40" data-face="hole"/>
      <rect x="9.5" y="6.1" width="62.7" height="40" data-edge="lo" stroke-width="1.1"/>
      <path d="M23.9,23.1 L23.9,32.1 M29.1,17.6 L29.1,36.1 M56.7,15.1 L56.7,19.1 M56.7,30.7 L56.7,35.5 M52.7,20.4 L60.7,20.4" stroke-width="2.4"/>
      <polyline transform="translate(44.453370, 25.349763) scale(-1, 1) translate(-44.453370, -25.349763)" points="29.71,15.09 48.35,15.09 59.2,25.28 48.35,35.61 29.71,35.61" stroke-width="2.4"/>
    </g>
  </svg>`,
  },
  // 高压配电：柜体 + 顶部母线拱罩（管画法）——本批样稿，需求方已确认
  elec_hv_switchgear: {
    icon25d: `<svg viewBox="0 0 54 70" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="25.2" cy="66.2" rx="15" ry="0.8" data-shadow="1"/>
      <path d="M50.5,21.7 C48.6,9.4 38,0 25.2,0 C12.5,0 1.9,9.4 0,21.7" data-pipe="base" stroke-width="3"/>
      <path d="M50.5,21.7 C48.6,9.4 38,0 25.2,0 C12.5,0 1.9,9.4 0,21.7" data-pipe="hi" stroke-width="1.2"/>
      <polygon points="12.5,23.8 38,23.8 38,25.7 33.8,26.9 12.5,26.9" data-face="top"/>
      <polygon points="33.8,26.9 38,25.7 38,67 33.8,67" data-face="side"/>
      <polygon points="12.5,26.9 33.8,26.9 33.8,67 12.5,67" data-face="front"/>
      <path d="M12.5,23.8 L12.5,67" data-edge="hi"/>
      <path d="M12.5,26.9 L33.8,26.9" data-edge="hi"/>
      <path d="M33.8,26.9 L38,25.7" data-edge="lo"/>
      <path d="M33.8,26.9 L33.8,67" data-edge="lo"/>
      <path d="M12.5,67 L38,67" data-edge="lo"/>
    </g>
  </svg>`,
  },
  // 高压断路器：实心本体 + 上下引线 + 两端双箭头（箭头沿用原稿）
  elec_hv_breaker: {
    icon25d: `<svg viewBox="0 0 41 106" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="18.2" cy="68.2" rx="12.5" ry="1.2" data-shadow="1"/>
      <line x1="18.2" y1="18.2" x2="18.2" y2="32.9" data-pipe="base" stroke-width="3"/>
      <line x1="17.5" y1="18.2" x2="17.5" y2="32.9" data-pipe="hi" stroke-width="1"/>
      <line x1="18.2" y1="67.1" x2="18.2" y2="82.1" data-pipe="base" stroke-width="3"/>
      <line x1="17.5" y1="67.1" x2="17.5" y2="82.1" data-pipe="hi" stroke-width="1"/>
      <polyline transform="translate(18.19,27.29) rotate(-135) translate(-18.19,-27.29)" points="31.05,14.43 24.63,33.73 5.33,40.16" stroke-width="3"/>
      <polyline transform="translate(18.19,72.86) rotate(45) translate(-18.19,-72.86)" points="31.05,60 24.63,79.3 5.33,85.73" stroke-width="3"/>
      <polyline transform="translate(18.19,81.97) rotate(45) translate(-18.19,-81.97)" points="31.05,69.1 24.63,88.4 5.33,94.83" stroke-width="3"/>
      <polyline transform="translate(18.19,18.19) rotate(-135) translate(-18.19,-18.19)" points="31.05,5.33 24.63,24.63 5.33,31.05" stroke-width="3"/>
      <polygon points="7.2,32.9 29.1,32.9 29.1,35.9 25.3,37 7.2,37" data-face="top"/>
      <polygon points="25.3,37 29.1,35.9 29.1,67.1 25.3,67.1" data-face="side"/>
      <polygon points="7.2,37 25.3,37 25.3,67.1 7.2,67.1" data-face="front"/>
      <path d="M7.2,32.9 L7.2,67.1" data-edge="hi"/>
      <path d="M7.2,37 L25.3,37" data-edge="hi"/>
      <path d="M25.3,37 L29.1,35.9" data-edge="lo"/>
      <path d="M25.3,37 L25.3,67.1" data-edge="lo"/>
      <path d="M7.2,67.1 L29.1,67.1" data-edge="lo"/>
    </g>
  </svg>`,
  },
  // 三相变压器：三圆品字（正对圆盘 cap + hi 轮廓），叠放顺序沿用原稿
  elec_three_phase_transformer: {
    icon25d: `<svg viewBox="0 0 86 83" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="41" cy="78.2" rx="34" ry="0.9" data-shadow="1"/>
      <ellipse cx="42" cy="25.4" rx="24.4" ry="25.4" data-face="cap"/>
      <ellipse cx="42" cy="25.4" rx="24.4" ry="25.4" data-edge="hi"/>
      <ellipse cx="24.4" cy="52.8" rx="24.4" ry="25.4" data-face="cap"/>
      <ellipse cx="24.4" cy="52.8" rx="24.4" ry="25.4" data-edge="hi"/>
      <ellipse cx="57.4" cy="53.7" rx="24.4" ry="25.4" data-face="cap"/>
      <ellipse cx="57.4" cy="53.7" rx="24.4" ry="25.4" data-edge="hi"/>
    </g>
  </svg>`,
  },
}

const electricalAssetComponents = buildAssetComponents(
  'electrical',
  electricalAssetIcons,
  electricalAssetMeta,
).map((def) => {
  const art = illustratedAssets[def.type]
  if (!art) return def
  const name = art.name ?? def.name
  return {
    ...def,
    name,
    icon25d: art.icon25d,
    properties: def.properties.map((p) => (p.key === 'name' ? { ...p, default: name } : p)),
  }
})

export const electricalComponents: ComponentDefinition[] = [
  MotorDefinition,
  SensorDefinition,
  CabinetDefinition,
  // 电力系统（外部素材导入，22 台）：变电/变压器/互感器/断路器/开关等。
  // 其中 8 台立体设备已做面基化（见上方 illustratedAssets），14 台电气符号件保持线条稿；
  // 溯源见 scripts/subunit-manifest.json
  ...electricalAssetComponents,
]
