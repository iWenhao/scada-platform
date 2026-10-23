import type { ComponentDefinition } from '@/types/scada'
import { buildAssetComponents } from '../assetComponents'
import { waterAssetIcons, waterAssetMeta } from './assets.generated'

/** 沉淀池 */
export const SedimentTankDefinition: ComponentDefinition = {
  type: 'sediment_tank',
  name: '沉淀池',
  group: 'water',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="84" rx="30" ry="5" data-shadow="1"/>
      <path d="M20 35 A30 8 0 0 0 80 35 L80 60 Q80 78 50 82 Q20 78 20 60 Z" data-face="front"/>
      <ellipse cx="50" cy="35" rx="30" ry="8" data-face="cap"/>
      <ellipse cx="50" cy="35" rx="30" ry="8" data-edge="hi"/>
      <path d="M20 35 L20 60" data-edge="hi"/>
      <path d="M80 35 L80 60" data-edge="hi"/>
      <path d="M20 60 Q20 78 50 82 Q80 78 80 60" data-edge="lo"/>
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

/**
 * 潜污泵：泵体与电机是同轴竖圆柱（`body` + `cap`），底座按箱体画，进出水口走
 * `data-pipe` + 竖侧圆端口；水面上方的波纹是装饰，保留普通 path。
 */
export const SubPumpDefinition: ComponentDefinition = {
  type: 'sub_pump',
  name: '潜污泵',
  group: 'water',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="86" rx="22" ry="4.5" data-shadow="1"/>
      <path d="M14 18 Q20 13 26 18 T38 18 T50 18" stroke-opacity="0.5"/>
      <path d="M16 28 Q22 23 28 28 T40 28" stroke-opacity="0.5"/>
      <path d="M35 42 A17 8.5 0 0 1 69 42 L69 74 A17 8.5 0 0 1 35 74 Z" data-face="body"/>
      <path d="M35 74 A17 8.5 0 0 0 69 74" data-edge="lo"/>
      <path d="M35 58 A17 8.5 0 0 0 69 58" data-edge="lo"/>
      <ellipse cx="52" cy="42" rx="17" ry="8.5" data-face="cap"/>
      <ellipse cx="52" cy="42" rx="17" ry="8.5" data-edge="hi"/>
      <path d="M42 28 A10 5 0 0 1 62 28 L62 42 A10 5 0 0 1 42 42 Z" data-face="body"/>
      <path d="M42 42 A10 5 0 0 0 62 42" data-edge="lo"/>
      <ellipse cx="52" cy="28" rx="10" ry="5" data-face="cap"/>
      <ellipse cx="52" cy="28" rx="10" ry="5" data-edge="hi"/>
      <path d="M64 48 L64 26" data-pipe="base"/>
      <path d="M62.4 48 L62.4 26" data-pipe="hi"/>
      <ellipse cx="64" cy="26" rx="4.5" ry="2.2" data-face="cap"/>
      <ellipse cx="64" cy="26" rx="4.5" ry="2.2" data-edge="hi" stroke-width="1.1"/>
      <path d="M35 62 L21 55" data-pipe="base"/>
      <path d="M35 60.4 L21 53.4" data-pipe="hi"/>
      <ellipse cx="21" cy="55" rx="3" ry="5.5" data-face="hole"/>
      <ellipse cx="21" cy="55" rx="3" ry="5.5" data-edge="hi" stroke-width="1"/>
    </g>
  </svg>`,
  defaultWidth: 60,
  defaultHeight: 88,
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

/**
 * 2.5D 迁移：素材图元是线条稿，这里按面基等轴测重绘（见 docs/2.5D_ILLUSTRATION_GUIDE.md §4.5）。
 * 覆盖发生在组装之后，生成文件保持原样，重新导出素材不会把这层改动冲掉。
 * 几何换了，默认尺寸一并对齐新画幅；名称属性同步改，否则属性面板里的默认名仍是素材原名。
 */
const illustratedAssets: Record<
  string,
  { icon: string; name?: string; width: number; height: number }
> = {
  water_pump: {
    name: '离心泵',
    width: 64,
    height: 80,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="94" rx="28" ry="5" data-shadow="1"/>
      <polygon points="50,68 74,80 50,92 26,80" data-face="deck"/>
      <polygon points="26,80 50,92 50,95 26,83" data-face="front"/>
      <polygon points="50,92 74,80 74,83 50,95" data-face="side"/>
      <polygon points="72,44 86,51 72,58 58,51" data-face="top"/>
      <polygon points="58,51 72,58 72,78 58,71" data-face="front"/>
      <polygon points="72,58 86,51 86,71 72,78" data-face="side"/>
      <path d="M58 51 L72 44 L86 51" data-edge="hi"/>
      <path d="M58 71 L72 78 L86 71" data-edge="lo"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="63" y1="53.5" x2="63" y2="73.5"/>
        <line x1="68" y1="56" x2="68" y2="76"/>
      </g>
      <path d="M35 46 A15 7.5 0 0 1 65 46 L65 70 A15 7.5 0 0 1 35 70 Z" data-face="body"/>
      <ellipse cx="50" cy="46" rx="15" ry="7.5" data-face="cap"/>
      <ellipse cx="50" cy="46" rx="15" ry="7.5" data-edge="hi"/>
      <path d="M35 70 A15 7.5 0 0 0 65 70" data-edge="lo"/>
      <path d="M58 44 L58 20" data-pipe="base"/>
      <path d="M58 44 L58 20" data-pipe="hi"/>
      <ellipse cx="58" cy="44" rx="5" ry="2.5" data-face="cap"/>
      <ellipse cx="58" cy="20" rx="5" ry="2.5" data-face="cap"/>
      <path d="M35 62 L13 51" data-pipe="base"/>
      <path d="M35 60.4 L13 49.4" data-pipe="hi"/>
      <ellipse cx="33" cy="61.5" rx="2" ry="5.5" transform="rotate(26.57 33 61.5)" data-face="cap"/>
      <ellipse cx="13" cy="51.5" rx="2" ry="5.5" transform="rotate(26.57 13 51.5)" data-face="cap"/>
      <ellipse cx="50" cy="71" rx="3" ry="1.5" data-face="cap"/>
      <ellipse cx="38" cy="84" rx="1.6" ry="0.9" data-face="cap"/>
      <ellipse cx="62" cy="84" rx="1.6" ry="0.9" data-face="cap"/>
    </g>
  </svg>`,
  },
  water_valve: {
    width: 74,
    height: 54,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="90" rx="28" ry="5" data-shadow="1"/>
      <path d="M8 46 L33 58.5" data-pipe="base"/>
      <path d="M8 44.4 L33 56.9" data-pipe="hi"/>
      <path d="M67 72.5 L92 85" data-pipe="base"/>
      <path d="M67 70.9 L92 83.4" data-pipe="hi"/>
      <ellipse cx="30" cy="57.5" rx="2" ry="5.5" transform="rotate(26.57 30 57.5)" data-face="cap"/>
      <ellipse cx="70" cy="74.5" rx="2" ry="5.5" transform="rotate(26.57 70 74.5)" data-face="cap"/>
      <ellipse cx="10" cy="47.6" rx="2" ry="5.5" transform="rotate(26.57 10 47.6)" data-face="cap"/>
      <polygon points="33,53 55,64 55,84 33,73" data-face="front"/>
      <polygon points="55,64 67,58 67,78 55,84" data-face="side"/>
      <polygon points="55,64 67,58 45,47 33,53" data-face="top"/>
      <path d="M33 53 L55 64 L67 58" data-edge="hi"/>
      <path d="M33 53 L33 73" data-edge="hi"/>
      <path d="M33 73 L55 84 L67 78" data-edge="lo"/>
      <polygon points="50,48 56,45 50,42 44,45" data-face="top"/>
      <polygon points="44,45 50,48 50,54 44,51" data-face="front"/>
      <polygon points="50,48 56,45 56,51 50,54" data-face="side"/>
      <rect x="48.6" y="30" width="2.8" height="17" data-face="body"/>
      <ellipse cx="50" cy="30" rx="12" ry="5.5" data-edge="hi" stroke-width="2.4"/>
      <ellipse cx="50" cy="30" rx="9" ry="4" data-edge="lo" stroke-width="1.2"/>
      <line x1="38" y1="30" x2="62" y2="30" data-edge="hi" stroke-width="1.1"/>
      <line x1="50" y1="24.5" x2="50" y2="35.5" data-edge="hi" stroke-width="1.1"/>
      <ellipse cx="50" cy="30" rx="2.2" ry="1.1" data-face="cap"/>
    </g>
  </svg>`,
  },
  water_tank: {
    width: 46,
    height: 76,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="90" rx="24" ry="4.5" data-shadow="1"/>
      <path d="M30 26 A20 10 0 0 1 70 26 L70 82 A20 10 0 0 1 30 82 Z" data-face="body"/>
      <path d="M30 82 A20 10 0 0 0 70 82" data-edge="lo"/>
      <ellipse cx="50" cy="26" rx="20" ry="10" data-face="cap"/>
      <ellipse cx="50" cy="26" rx="20" ry="10" data-edge="hi"/>
      <ellipse cx="50" cy="26" rx="7" ry="3.5" data-edge="lo" stroke-width="1.2"/>
      <ellipse cx="50" cy="26" rx="4.5" ry="2.2" data-face="cap"/>
      <path d="M30 58 A20 10 0 0 0 70 58" stroke-dasharray="4 3" stroke-opacity="0.45"/>
    </g>
  </svg>`,
  },
  water_dosing_tank: {
    width: 44,
    height: 80,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="90" rx="24" ry="4.5" data-shadow="1"/>
      <path d="M28 34 A22 11 0 0 1 72 34 L72 82 A22 11 0 0 1 28 82 Z" data-face="body"/>
      <path d="M28 82 A22 11 0 0 0 72 82" data-edge="lo"/>
      <ellipse cx="50" cy="34" rx="22" ry="11" data-face="cap"/>
      <ellipse cx="50" cy="34" rx="22" ry="11" data-edge="hi"/>
      <path d="M43 18 A7 3.5 0 0 1 57 18 L57 32 A7 3.5 0 0 1 43 32 Z" data-face="body"/>
      <path d="M43 32 A7 3.5 0 0 0 57 32" data-edge="lo"/>
      <ellipse cx="50" cy="18" rx="7" ry="3.5" data-face="cap"/>
      <ellipse cx="50" cy="18" rx="7" ry="3.5" data-edge="hi"/>
      <path d="M29 58 A22 11 0 0 0 71 58" stroke-dasharray="4 3" stroke-opacity="0.45"/>
    </g>
  </svg>`,
  },
  water_exhaust_tank: {
    width: 46,
    height: 88,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="90" rx="24" ry="4.5" data-shadow="1"/>
      <path d="M28 28 L72 28 L72 82 A22 11 0 0 1 28 82 Z" data-face="body"/>
      <path d="M28 82 A22 11 0 0 0 72 82" data-edge="lo"/>
      <path d="M28 28 A22 13 0 0 1 72 28 Z" data-face="cap"/>
      <path d="M28 28 A22 13 0 0 1 72 28" data-edge="hi"/>
      <path d="M46 16 L46 6" data-pipe="base"/>
      <path d="M44.4 16 L44.4 6" data-pipe="hi"/>
      <ellipse cx="46" cy="6" rx="4.5" ry="2.2" data-face="cap"/>
      <ellipse cx="46" cy="6" rx="4.5" ry="2.2" data-edge="hi" stroke-width="1.1"/>
      <path d="M28 48 A22 11 0 0 0 72 48" data-edge="lo" stroke-width="1.1"/>
      <path d="M28 64 A22 11 0 0 0 72 64" data-edge="lo" stroke-width="1.1"/>
    </g>
  </svg>`,
  },
  water_pool: {
    width: 108,
    height: 88,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="86" rx="44" ry="5" data-shadow="1"/>
      <polygon points="5,40 50,62.5 50,75 5,52.5" data-face="front"/>
      <polygon points="50,62.5 95,40 95,52.5 50,75" data-face="side"/>
      <path d="M5 40 L50 17.5 L95 40" data-edge="hi"/>
      <path d="M5 40 L5 52.5" data-edge="hi"/>
      <path d="M5 52.5 L50 75 L95 52.5" data-edge="lo"/>
      <path d="M5 40 L50 17.5 L95 40 L50 62.5 Z M13 40 L50 21.5 L87 40 L50 58.5 Z" fill-rule="evenodd" data-face="top"/>
      <polygon points="13,40 50,21.5 87,40 50,58.5" data-face="deck"/>
      <path d="M13 40 L50 21.5 L87 40" data-edge="lo" stroke-width="1.1"/>
    </g>
  </svg>`,
  },
  water_sedimentation_tank: {
    width: 108,
    height: 88,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="86" rx="44" ry="5" data-shadow="1"/>
      <polygon points="6,44 50,66 50,79 6,57" data-face="front"/>
      <polygon points="50,66 94,44 94,57 50,79" data-face="side"/>
      <path d="M6 44 L50 22 L94 44" data-edge="hi"/>
      <path d="M6 44 L6 57" data-edge="hi"/>
      <path d="M6 57 L50 79 L94 57" data-edge="lo"/>
      <path d="M6 44 L50 22 L94 44 L50 66 Z M14 44 L50 26 L86 44 L50 62 Z" fill-rule="evenodd" data-face="top"/>
      <polygon points="14,44 50,26 86,44 50,62" data-face="deck"/>
      <path d="M14 44 L50 26 L86 44" data-edge="lo" stroke-width="1.1"/>
      <path d="M26 34 L70 56 L75 53.5 L31 31.5 Z" data-face="top"/>
      <polygon points="26,34 70,56 70,60 26,38" data-face="front"/>
      <path d="M26 34 L31 31.5 L75 53.5" data-edge="hi"/>
      <path d="M26 38 L70 60" data-edge="lo"/>
      <path d="M40 33 A6 3 0 0 1 52 33 L52 40 A6 3 0 0 1 40 40 Z" data-face="body"/>
      <ellipse cx="46" cy="33" rx="6" ry="3" data-face="cap"/>
      <ellipse cx="46" cy="33" rx="6" ry="3" data-edge="hi"/>
      <path d="M40 40 A6 3 0 0 0 52 40" data-edge="lo"/>
      <path d="M14 44 L4 39" data-pipe="base"/>
      <path d="M14 42.4 L4 37.4" data-pipe="hi"/>
      <ellipse cx="4" cy="39" rx="2.5" ry="5.5" transform="rotate(26.57 4 39)" data-face="cap"/>
    </g>
  </svg>`,
  },
  water_purifier: {
    width: 58,
    height: 88,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="88" rx="28" ry="4.5" data-shadow="1"/>
      <polygon points="36,70 42,73 42,82 36,79" data-face="front"/>
      <polygon points="42,73 45,71.5 45,80.5 42,82" data-face="side"/>
      <path d="M36 79 L42 82 L45 80.5" data-edge="lo"/>
      <polygon points="56,70 62,73 62,82 56,79" data-face="front"/>
      <polygon points="62,73 65,71.5 65,80.5 62,82" data-face="side"/>
      <path d="M56 79 L62 82 L65 80.5" data-edge="lo"/>
      <circle cx="50" cy="46" r="28" data-face="cap"/>
      <circle cx="50" cy="46" r="28" data-edge="hi"/>
      <circle cx="50" cy="46" r="21" data-face="front"/>
      <circle cx="50" cy="46" r="21" data-edge="lo"/>
      <circle cx="50" cy="46" r="8" data-face="cap"/>
      <circle cx="50" cy="46" r="8" data-edge="hi"/>
      <circle cx="50" cy="46" r="3.2" data-edge="lo" stroke-width="2"/>
      <path d="M50 18 L50 8" data-pipe="base"/>
      <path d="M48.4 18 L48.4 8" data-pipe="hi"/>
      <ellipse cx="50" cy="8" rx="5" ry="2.5" data-face="cap"/>
      <ellipse cx="50" cy="8" rx="5" ry="2.5" data-edge="hi" stroke-width="1.1"/>
    </g>
  </svg>`,
  },
  water_dosing_pump: {
    width: 58,
    height: 88,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="92" rx="22" ry="4.5" data-shadow="1"/>
      <polygon points="30,78 50,68 70,78 50,88" data-face="deck"/>
      <polygon points="30,78 50,88 50,92 30,82" data-face="front"/>
      <polygon points="50,88 70,78 70,82 50,92" data-face="side"/>
      <path d="M30 82 L50 92 L70 82" data-edge="lo"/>
      <path d="M36 70 L20 62" data-pipe="base"/>
      <path d="M36 68.4 L20 60.4" data-pipe="hi"/>
      <ellipse cx="20" cy="62" rx="2" ry="5" transform="rotate(26.57 20 62)" data-face="cap"/>
      <polygon points="36,60 50,53 64,60 50,67" data-face="top"/>
      <polygon points="36,60 50,67 50,79 36,72" data-face="front"/>
      <polygon points="50,67 64,60 64,72 50,79" data-face="side"/>
      <path d="M36 60 L50 53 L64 60" data-edge="hi"/>
      <path d="M36 60 L36 72" data-edge="hi"/>
      <path d="M36 72 L50 79 L64 72" data-edge="lo"/>
      <path d="M42 26 A8 4 0 0 1 58 26 L58 58 A8 4 0 0 1 42 58 Z" data-face="body"/>
      <ellipse cx="50" cy="26" rx="8" ry="4" data-face="cap"/>
      <ellipse cx="50" cy="26" rx="8" ry="4" data-edge="hi"/>
      <path d="M42 58 A8 4 0 0 0 58 58" data-edge="lo"/>
      <path d="M45 31 L45 55" data-edge="lo" stroke-width="1.1"/>
      <path d="M50 31 L50 55" data-edge="lo" stroke-width="1.1"/>
      <path d="M55 31 L55 55" data-edge="lo" stroke-width="1.1"/>
      <path d="M64 66 L80 74" data-pipe="base"/>
      <path d="M64 64.4 L80 72.4" data-pipe="hi"/>
      <ellipse cx="80" cy="74" rx="2" ry="5" transform="rotate(26.57 80 74)" data-face="cap"/>
    </g>
  </svg>`,
  },
  water_metering_pump: {
    width: 60,
    height: 90,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="92" rx="26" ry="5" data-shadow="1"/>
      <polygon points="26,80 50,68 74,80 50,92" data-face="deck"/>
      <polygon points="26,80 50,92 50,96 26,84" data-face="front"/>
      <polygon points="50,92 74,80 74,84 50,96" data-face="side"/>
      <path d="M26 84 L50 96 L74 84" data-edge="lo"/>
      <path d="M38 70 L22 61" data-pipe="base"/>
      <path d="M38 68.4 L22 59.4" data-pipe="hi"/>
      <ellipse cx="22" cy="61" rx="2" ry="5" transform="rotate(26.57 22 61)" data-face="cap"/>
      <path d="M38 40 A12 6 0 0 1 62 40 L62 78 A12 6 0 0 1 38 78 Z" data-face="body"/>
      <path d="M38 78 A12 6 0 0 0 62 78" data-edge="lo"/>
      <path d="M38 56 A12 6 0 0 0 62 56" data-edge="lo" stroke-width="1.1"/>
      <path d="M38 66 A12 6 0 0 0 62 66" data-edge="lo" stroke-width="1.1"/>
      <ellipse cx="50" cy="40" rx="12" ry="6" data-face="cap"/>
      <ellipse cx="50" cy="40" rx="12" ry="6" data-edge="hi"/>
      <path d="M42 22 A8 4 0 0 1 58 22 L58 40 A8 4 0 0 1 42 40 Z" data-face="body"/>
      <ellipse cx="50" cy="22" rx="8" ry="4" data-face="cap"/>
      <ellipse cx="50" cy="22" rx="8" ry="4" data-edge="hi"/>
      <path d="M42 40 A8 4 0 0 0 58 40" data-edge="lo"/>
      <circle cx="50" cy="61" r="4.5" data-face="cap"/>
      <circle cx="50" cy="61" r="4.5" data-edge="hi" stroke-width="1.1"/>
      <circle cx="50" cy="61" r="2" data-edge="lo" stroke-width="1.2"/>
      <path d="M62 52 L76 45" data-pipe="base"/>
      <path d="M62 50.4 L76 43.4" data-pipe="hi"/>
      <ellipse cx="76" cy="45" rx="2" ry="4.5" transform="rotate(26.57 76 45)" data-face="cap"/>
    </g>
  </svg>`,
  },
  water_backup_pump: {
    width: 54,
    height: 90,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="92" rx="22" ry="4.5" data-shadow="1"/>
      <polygon points="32,80 50,71 68,80 50,89" data-face="deck"/>
      <polygon points="32,80 50,89 50,93 32,84" data-face="front"/>
      <polygon points="50,89 68,80 68,84 50,93" data-face="side"/>
      <path d="M32 84 L50 93 L68 84" data-edge="lo"/>
      <path d="M38 70 L22 61" data-pipe="base"/>
      <path d="M38 68.4 L22 59.4" data-pipe="hi"/>
      <ellipse cx="22" cy="61" rx="2" ry="5" transform="rotate(26.57 22 61)" data-face="cap"/>
      <path d="M38 34 A12 6 0 0 1 62 34 L62 78 A12 6 0 0 1 38 78 Z" data-face="body"/>
      <path d="M38 78 A12 6 0 0 0 62 78" data-edge="lo"/>
      <path d="M38 48 A12 6 0 0 0 62 48" data-edge="lo" stroke-width="1.1"/>
      <path d="M38 60 A12 6 0 0 0 62 60" data-edge="lo" stroke-width="1.1"/>
      <ellipse cx="50" cy="34" rx="12" ry="6" data-face="cap"/>
      <ellipse cx="50" cy="34" rx="12" ry="6" data-edge="hi"/>
      <path d="M43 16 A7 3.5 0 0 1 57 16 L57 34 A7 3.5 0 0 1 43 34 Z" data-face="body"/>
      <ellipse cx="50" cy="16" rx="7" ry="3.5" data-face="cap"/>
      <ellipse cx="50" cy="16" rx="7" ry="3.5" data-edge="hi"/>
      <path d="M43 34 A7 3.5 0 0 0 57 34" data-edge="lo"/>
      <path d="M62 46 L78 54" data-pipe="base"/>
      <path d="M62 44.4 L78 52.4" data-pipe="hi"/>
      <ellipse cx="78" cy="54" rx="2" ry="5" transform="rotate(26.57 78 54)" data-face="cap"/>
    </g>
  </svg>`,
  },
  water_high_pressure_pump: {
    width: 86,
    height: 72,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="85" rx="29" ry="4.5" data-shadow="1"/>
      <polygon points="40,64 46,67 46,74 40,71" data-face="front"/>
      <polygon points="46,67 49,65.5 49,72.5 46,74" data-face="side"/>
      <path d="M40 71 L46 74 L49 72.5" data-edge="lo"/>
      <polygon points="58,73 64,76 64,83 58,80" data-face="front"/>
      <polygon points="64,76 67,74.5 67,81.5 64,83" data-face="side"/>
      <path d="M58 80 L64 83 L67 81.5" data-edge="lo"/>
      <path d="M28 54 L12 46" data-pipe="base"/>
      <path d="M28 52.4 L12 44.4" data-pipe="hi"/>
      <ellipse cx="12" cy="46" rx="2.2" ry="5.5" transform="rotate(26.57 12 46)" data-face="cap"/>
      <path d="M28 40 L66 59 Q78 68 66 77 L28 58 Q16 49 28 40 Z" data-face="barrel"/>
      <path d="M28 40 Q16 49 28 58" data-edge="hi"/>
      <path d="M28 40 L66 59" data-edge="hi"/>
      <path d="M28 58 L66 77" data-edge="lo"/>
      <ellipse cx="64" cy="68" rx="2.2" ry="9" transform="rotate(26.57 64 68)" data-face="cap"/>
      <ellipse cx="64" cy="68" rx="2.2" ry="9" transform="rotate(26.57 64 68)" data-edge="hi" stroke-width="1.1"/>
      <path d="M32 18 A8 4 0 0 1 48 18 L48 46 A8 4 0 0 1 32 46 Z" data-face="body"/>
      <ellipse cx="40" cy="18" rx="8" ry="4" data-face="cap"/>
      <ellipse cx="40" cy="18" rx="8" ry="4" data-edge="hi"/>
      <path d="M32 46 A8 4 0 0 0 48 46" data-edge="lo"/>
      <path d="M58 52 L58 32" data-pipe="base"/>
      <path d="M56.4 52 L56.4 32" data-pipe="hi"/>
      <ellipse cx="58" cy="32" rx="4" ry="2" data-face="cap"/>
      <ellipse cx="58" cy="32" rx="4" ry="2" data-edge="hi" stroke-width="1.1"/>
    </g>
  </svg>`,
  },
  water_booster_pump: {
    width: 68,
    height: 92,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="88" rx="24" ry="4.5" data-shadow="1"/>
      <polygon points="32,74 38,77 38,84 32,81" data-face="front"/>
      <polygon points="38,77 41,75.5 41,82.5 38,84" data-face="side"/>
      <path d="M32 81 L38 84 L41 82.5" data-edge="lo"/>
      <polygon points="56,78 62,81 62,88 56,85" data-face="front"/>
      <polygon points="62,81 65,79.5 65,86.5 62,88" data-face="side"/>
      <path d="M56 85 L62 88 L65 86.5" data-edge="lo"/>
      <path d="M36 58 L20 50" data-pipe="base"/>
      <path d="M36 56.4 L20 48.4" data-pipe="hi"/>
      <ellipse cx="20" cy="50" rx="2" ry="5.5" transform="rotate(26.57 20 50)" data-face="cap"/>
      <path d="M64 46 L80 54" data-pipe="base"/>
      <path d="M64 44.4 L80 52.4" data-pipe="hi"/>
      <ellipse cx="80" cy="54" rx="2" ry="5.5" transform="rotate(26.57 80 54)" data-face="cap"/>
      <path d="M36 30 A14 7 0 0 1 64 30 L64 74 A14 7 0 0 1 36 74 Z" data-face="body"/>
      <path d="M36 74 A14 7 0 0 0 64 74" data-edge="lo"/>
      <ellipse cx="50" cy="30" rx="14" ry="7" data-face="cap"/>
      <ellipse cx="50" cy="30" rx="14" ry="7" data-edge="hi"/>
      <path d="M40 12 A10 5 0 0 1 60 12 L60 30 A10 5 0 0 1 40 30 Z" data-face="body"/>
      <ellipse cx="50" cy="12" rx="10" ry="5" data-face="cap"/>
      <ellipse cx="50" cy="12" rx="10" ry="5" data-edge="hi"/>
      <path d="M40 30 A10 5 0 0 0 60 30" data-edge="lo"/>
    </g>
  </svg>`,
  },
  water_roots_blower: {
    width: 82,
    height: 76,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="89" rx="32" ry="4.5" data-shadow="1"/>
      <polygon points="34,65 40,68 40,77 34,74" data-face="front"/>
      <polygon points="40,68 43,66.5 43,75.5 40,77" data-face="side"/>
      <path d="M34 74 L40 77 L43 75.5" data-edge="lo"/>
      <polygon points="52,75 58,78 58,87 52,84" data-face="front"/>
      <polygon points="58,78 61,76.5 61,85.5 58,87" data-face="side"/>
      <path d="M52 84 L58 87 L61 85.5" data-edge="lo"/>
      <path d="M28 48 L14 41" data-pipe="base"/>
      <path d="M28 46.4 L14 39.4" data-pipe="hi"/>
      <ellipse cx="14" cy="41" rx="2" ry="5" transform="rotate(26.57 14 41)" data-face="cap"/>
      <path d="M28 40 L60 56 Q74 66 60 76 L28 60 Q14 50 28 40 Z" data-face="barrel"/>
      <path d="M28 40 Q14 50 28 60" data-edge="hi"/>
      <path d="M28 40 L60 56" data-edge="hi"/>
      <path d="M28 60 L60 76" data-edge="lo"/>
      <ellipse cx="58" cy="66" rx="3" ry="11" transform="rotate(26.57 58 66)" data-face="cap"/>
      <ellipse cx="58" cy="66" rx="3" ry="11" transform="rotate(26.57 58 66)" data-edge="hi" stroke-width="1.1"/>
      <ellipse cx="58" cy="66" rx="1.6" ry="7" transform="rotate(26.57 58 66)" data-edge="lo" stroke-width="1.1"/>
      <path d="M34 16 A8 4 0 0 1 50 16 L50 47 A8 4 0 0 1 34 47 Z" data-face="body"/>
      <ellipse cx="42" cy="16" rx="8" ry="4" data-face="cap"/>
      <ellipse cx="42" cy="16" rx="8" ry="4" data-edge="hi"/>
      <path d="M34 47 A8 4 0 0 0 50 47" data-edge="lo"/>
      <path d="M56 54 L56 26" data-pipe="base"/>
      <path d="M54.4 54 L54.4 26" data-pipe="hi"/>
      <ellipse cx="56" cy="26" rx="4" ry="2" data-face="cap"/>
      <ellipse cx="56" cy="26" rx="4" ry="2" data-edge="hi" stroke-width="1.1"/>
    </g>
  </svg>`,
  },
}

const waterAssetComponents = buildAssetComponents('water', waterAssetIcons, waterAssetMeta).map(
  (def) => {
    const art = illustratedAssets[def.type]
    if (!art) return def
    const name = art.name ?? def.name
    return {
      ...def,
      name,
      icon: art.icon,
      defaultWidth: art.width,
      defaultHeight: art.height,
      properties: def.properties.map((p) => (p.key === 'name' ? { ...p, default: name } : p)),
    }
  },
)

export const waterComponents: ComponentDefinition[] = [
  SedimentTankDefinition,
  SubPumpDefinition,
  // 水系统（外部素材导入，27 台）：沉淀池/格栅/加药/过滤/各类泵阀。
  // 注意与手写的 SedimentTankDefinition 重名（同为「沉淀池」，一个是线条稿、一个是素材图元），
  // type 不同故互不覆盖；溯源见 scripts/subunit-manifest.json
  ...waterAssetComponents,
]
