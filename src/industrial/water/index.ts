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

/**
 * 2.5D 样板批：素材图元是线条稿，泵与阀门这两台按面基等轴测重绘
 * （见 docs/2.5D_ILLUSTRATION_GUIDE.md §4）。覆盖发生在组装之后，生成文件保持原样，
 * 重新导出素材不会把这层改动冲掉。几何换了，默认尺寸一并对齐新画幅；
 * 名称属性同步改，否则属性面板里的默认名仍是素材原名。
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
