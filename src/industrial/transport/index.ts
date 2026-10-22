import { buildAssetComponents } from '../assetComponents'
import { transportIcons, transportMeta } from './icons.generated'

/**
 * 主运输系统（外部素材导入）：皮带轮 / 破碎机 / 给煤机 / 油泵 / 烟雾传感器。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 *
 * 整组 5 台已按 2.5D 规范（docs/2.5D_ILLUSTRATION_GUIDE.md §4.5）覆盖为面基立体：
 * 只在这里替换 icon 与默认尺寸，生成文件保持原样，重新导入素材不会冲掉这层改动。
 * 本组没有可动件，不涉及 assetComponents 的 rotor 锚点。
 */
const illustratedAssets: Record<
  string,
  { icon: string; name?: string; width: number; height: number }
> = {
  trans_belt_pulley: {
    width: 66,
    height: 80,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="88" rx="27" ry="5" data-shadow="1"/>
      <circle cx="50" cy="48" r="30" data-face="cap"/>
      <circle cx="50" cy="48" r="30" data-edge="hi"/>
      <circle cx="50" cy="48" r="23" data-face="front"/>
      <circle cx="50" cy="48" r="23" data-edge="lo"/>
      <g data-edge="hi" stroke-width="2.2">
        <line x1="58" y1="48" x2="73" y2="48"/>
        <line x1="54" y1="54.9" x2="61.5" y2="67.9"/>
        <line x1="46" y1="54.9" x2="38.5" y2="67.9"/>
        <line x1="42" y1="48" x2="27" y2="48"/>
        <line x1="46" y1="41.1" x2="38.5" y2="28.1"/>
        <line x1="54" y1="41.1" x2="61.5" y2="28.1"/>
      </g>
      <circle cx="50" cy="48" r="8" data-face="cap"/>
      <circle cx="50" cy="48" r="8" data-edge="hi"/>
      <circle cx="50" cy="48" r="3.5" data-edge="lo" stroke-width="2"/>
    </g>
  </svg>`,
  },
  trans_crusher: {
    width: 84,
    height: 70,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="91" rx="34" ry="5" data-shadow="1"/>
      <path d="M50 32 L86 50 L50 68 L14 50 Z M50 40 L70 50 L50 60 L30 50 Z" fill-rule="evenodd" data-face="top"/>
      <polygon points="14,50 50,68 50,80 14,62" data-face="front"/>
      <polygon points="50,68 86,50 86,62 50,80" data-face="side"/>
      <path d="M14 50 L50 32 L86 50" data-edge="hi"/>
      <path d="M14 50 L14 62" data-edge="hi"/>
      <path d="M14 62 L50 80 L86 62" data-edge="lo"/>
      <polygon points="30,50 50,60 70,50 50,40" data-face="hole"/>
      <path d="M30 50 L50 40 L70 50 L50 60 Z" data-edge="hi" stroke-width="1.2"/>
      <ellipse cx="28" cy="63" rx="4.5" ry="6" data-face="cap"/>
      <ellipse cx="28" cy="63" rx="4.5" ry="6" data-edge="hi"/>
      <ellipse cx="28" cy="63" rx="5.2" ry="6.7" data-edge="lo" stroke-width="1" stroke-dasharray="1.6 1.8"/>
      <circle cx="28" cy="63" r="1.8" data-face="cap"/>
      <ellipse cx="42" cy="70" rx="4.5" ry="6" data-face="cap"/>
      <ellipse cx="42" cy="70" rx="4.5" ry="6" data-edge="hi"/>
      <ellipse cx="42" cy="70" rx="5.2" ry="6.7" data-edge="lo" stroke-width="1" stroke-dasharray="1.6 1.8"/>
      <circle cx="42" cy="70" r="1.8" data-face="cap"/>
      <ellipse cx="80" cy="59" rx="3.5" ry="6" data-face="cap"/>
      <ellipse cx="80" cy="59" rx="3.5" ry="6" data-edge="hi"/>
      <ellipse cx="80" cy="59" rx="1.4" ry="2.4" data-face="cap"/>
    </g>
  </svg>`,
  },
  trans_coal_feeder: {
    width: 88,
    height: 78,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="91" rx="34" ry="5" data-shadow="1"/>
      <polygon points="18,64 24,67 24,78 18,75" data-face="front"/>
      <polygon points="24,67 28,65 28,76 24,78" data-face="side"/>
      <path d="M18 75 L24 78 L28 76" data-edge="lo"/>
      <polygon points="58,80 64,83 64,90 58,87" data-face="front"/>
      <polygon points="64,83 68,81 68,88 64,90" data-face="side"/>
      <path d="M58 87 L64 90 L68 88" data-edge="lo"/>
      <path d="M38 30 L62 42 L38 54 L14 42 Z M38 34 L54 42 L38 50 L22 42 Z" fill-rule="evenodd" data-face="top"/>
      <polygon points="14,42 38,54 38,74 14,62" data-face="front"/>
      <polygon points="38,54 62,42 62,62 38,74" data-face="side"/>
      <path d="M14 42 L38 30 L62 42" data-edge="hi"/>
      <path d="M14 42 L14 62" data-edge="hi"/>
      <path d="M14 62 L38 74 L62 62" data-edge="lo"/>
      <polygon points="22,42 38,50 54,42 38,34" data-face="hole"/>
      <path d="M22 42 L38 34 L54 42 L38 50 Z" data-edge="hi" stroke-width="1.2"/>
      <path d="M18 51 L34 59" data-edge="lo" stroke-width="1.1"/>
      <polygon points="44,68 74,83 88,76 58,61" data-face="top"/>
      <polygon points="44,68 74,83 74,87 44,72" data-face="front"/>
      <polygon points="74,83 88,76 88,80 74,87" data-face="side"/>
      <path d="M44 68 L58 61 L88 76" data-edge="hi"/>
      <path d="M44 68 L44 72" data-edge="hi"/>
      <path d="M44 72 L74 87 L88 80" data-edge="lo"/>
      <ellipse cx="52" cy="66" rx="2.4" ry="4.5" transform="rotate(26.57 52 66)" data-face="cap"/>
      <ellipse cx="52" cy="66" rx="2.4" ry="4.5" transform="rotate(26.57 52 66)" data-edge="hi" stroke-width="1"/>
      <ellipse cx="81" cy="81.5" rx="2.6" ry="5" transform="rotate(26.57 81 81.5)" data-face="cap"/>
      <ellipse cx="81" cy="81.5" rx="2.6" ry="5" transform="rotate(26.57 81 81.5)" data-edge="hi" stroke-width="1"/>
    </g>
  </svg>`,
  },
  trans_oil_pump: {
    width: 80,
    height: 70,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="91" rx="30" ry="4.5" data-shadow="1"/>
      <polygon points="38,69 44,72 44,80 38,77" data-face="front"/>
      <polygon points="44,72 47,70.5 47,78.5 44,80" data-face="side"/>
      <path d="M38 77 L44 80 L47 78.5" data-edge="lo"/>
      <polygon points="58,79 64,82 64,89 58,86" data-face="front"/>
      <polygon points="64,82 67,80.5 67,87.5 64,89" data-face="side"/>
      <path d="M58 86 L64 89 L67 87.5" data-edge="lo"/>
      <path d="M30 48 L66 66 Q78 75 66 84 L30 66 Q18 57 30 48 Z" data-face="barrel"/>
      <path d="M30 48 Q18 57 30 66" data-edge="hi"/>
      <path d="M30 48 L66 66" data-edge="hi"/>
      <path d="M30 66 L66 84" data-edge="lo"/>
      <path d="M46 56 L46 28" data-pipe="base"/>
      <path d="M44.4 56 L44.4 28" data-pipe="hi"/>
      <ellipse cx="46" cy="28" rx="4.5" ry="2.2" data-face="cap"/>
      <ellipse cx="46" cy="28" rx="4.5" ry="2.2" data-edge="hi" stroke-width="1.1"/>
      <path d="M26 58 L12 51" data-pipe="base"/>
      <path d="M26 56.4 L12 49.4" data-pipe="hi"/>
      <ellipse cx="12" cy="51" rx="2.6" ry="4.6" transform="rotate(26.57 12 51)" data-face="cap"/>
      <ellipse cx="12" cy="51" rx="2.6" ry="4.6" transform="rotate(26.57 12 51)" data-edge="hi" stroke-width="1"/>
    </g>
  </svg>`,
  },
  trans_smoke_sensor: {
    width: 62,
    height: 90,
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="92" rx="24" ry="4.5" data-shadow="1"/>
      <path d="M16 30 Q22 25 28 30 T40 30" stroke-opacity="0.45"/>
      <path d="M22 20 Q28 15 34 20 T46 20" stroke-opacity="0.45"/>
      <polygon points="28,52 50,63 72,52 50,41" data-face="top"/>
      <polygon points="28,52 50,63 50,85 28,74" data-face="front"/>
      <polygon points="50,63 72,52 72,74 50,85" data-face="side"/>
      <path d="M28 52 L50 41 L72 52" data-edge="hi"/>
      <path d="M28 52 L28 74" data-edge="hi"/>
      <path d="M28 74 L50 85 L72 74" data-edge="lo"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="32" y1="58" x2="46" y2="65"/>
        <line x1="32" y1="63" x2="46" y2="70"/>
        <line x1="32" y1="68" x2="46" y2="75"/>
        <line x1="32" y1="73" x2="46" y2="80"/>
      </g>
      <path d="M42 42 A8 4 0 0 1 58 42 L58 51 A8 4 0 0 1 42 51 Z" data-face="body"/>
      <path d="M42 51 A8 4 0 0 1 58 51" data-edge="lo"/>
      <ellipse cx="50" cy="42" rx="8" ry="4" data-face="cap"/>
      <ellipse cx="50" cy="42" rx="8" ry="4" data-edge="hi"/>
      <circle cx="50" cy="46" r="1.8" data-edge="lo" stroke-width="1.6"/>
    </g>
  </svg>`,
  },
}

const transportAssetComponents = buildAssetComponents(
  'transport',
  transportIcons,
  transportMeta,
).map((def) => {
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
})

export const transportComponents = transportAssetComponents
