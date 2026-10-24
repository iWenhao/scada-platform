import { buildAssetComponents } from '../assetComponents'
import { transportIcons, transportMeta } from './icons.generated'

/**
 * 主运输系统（外部素材导入）：皮带轮 / 破碎机 / 给煤机 / 油泵 / 烟雾传感器。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 *
 * 2.5D 覆盖表：素材图元是线条稿，这里按面基**同姿态**重绘
 * （见 docs/2.5D_ILLUSTRATION_GUIDE.md §4.5）。viewBox、摆放角度、占地轮廓都与原稿一致，
 * 默认尺寸沿用素材自带的值，不在这里改画幅。
 *
 * 双源约定：`icon` 保留素材原稿（2D 画布与组件面板不变），面基稿写进 `icon25d`，
 * 只在 2.5D 生效。生成文件保持原样，重新导入素材不会冲掉这层改动。
 * 本组没有可动件，不涉及 rotor 锚点。
 */
const illustratedAssets: Record<string, { icon25d: string; name?: string }> = {
  trans_belt_pulley: {
    icon25d: `<svg viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="33" cy="64.2" rx="27" ry="1.4" data-shadow="1"/>

      <circle cx="33" cy="33" r="32.4" data-face="cap"/>
      <circle cx="33" cy="33" r="32.4" data-edge="hi"/>
      <circle cx="33" cy="33" r="26.4" data-face="hole"/>
      <circle cx="33" cy="33" r="26.4" data-edge="lo"/>

      <g data-edge="hi" stroke-width="2.2">
        <line x1="43.65" y1="33" x2="59.4" y2="33"/>
        <line x1="40.53" y1="40.53" x2="51.67" y2="51.67"/>
        <line x1="33" y1="43.65" x2="33" y2="59.4"/>
        <line x1="25.47" y1="40.53" x2="14.33" y2="51.67"/>
        <line x1="22.35" y1="33" x2="6.6" y2="33"/>
        <line x1="25.47" y1="25.47" x2="14.33" y2="14.33"/>
        <line x1="33" y1="22.35" x2="33" y2="6.6"/>
        <line x1="40.53" y1="25.47" x2="51.67" y2="14.33"/>
      </g>

      <circle cx="33" cy="33" r="10.65" data-face="cap"/>
      <circle cx="33" cy="33" r="10.65" data-edge="hi"/>
      <circle cx="33" cy="33" r="6" data-face="hole"/>
    </g>
  </svg>`,
  },
  trans_crusher: {
    icon25d: `<svg viewBox="0 0 84 57" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="41" cy="54" rx="36" ry="1.8" data-shadow="1"/>

      <polygon points="15.4,0 66.6,0 68,1.6 17,1.6" data-face="top"/>
      <rect x="15.4" y="1.6" width="51.2" height="5.6" data-face="front"/>
      <polygon points="66.6,1.6 68,1.6 68,7.2 66.6,7.2" data-face="side"/>

      <polygon points="0,18.3 11.4,7.2 70.6,7.2 82,18.3 82,53.7 0,53.7" data-face="front"/>
      <polygon points="11.4,7.2 70.6,7.2 72.2,8.8 13,8.8" data-face="top"/>
      <polygon points="82,18.3 83.6,16.9 83.6,52.3 82,53.7" data-face="side"/>
      <path d="M0 18.3 L11.4 7.2 L70.6 7.2 L82 18.3" data-edge="hi"/>
      <path d="M0 18.3 L0 53.7" data-edge="hi"/>
      <path d="M82 18.3 L82 53.7" data-edge="lo"/>
      <path d="M0 53.7 L82 53.7" data-edge="lo"/>

      <ellipse cx="22.8" cy="31.96" rx="16.27" ry="15.85" data-face="cap"/>
      <ellipse cx="22.8" cy="31.96" rx="16.27" ry="15.85" data-edge="hi"/>
      <circle cx="22.8" cy="31.96" r="14.2" data-edge="lo" stroke-width="1" stroke-dasharray="1.6 1.8" stroke-opacity="0.55"/>
      <ellipse cx="22.8" cy="31.96" rx="9.26" ry="9.02" data-face="hole"/>
      <ellipse cx="22.8" cy="31.96" rx="9.26" ry="9.02" data-edge="lo"/>
      <ellipse cx="22.8" cy="31.96" rx="3.06" ry="2.98" data-face="cap"/>

      <ellipse cx="53.37" cy="31.96" rx="16.27" ry="15.85" data-face="cap"/>
      <ellipse cx="53.37" cy="31.96" rx="16.27" ry="15.85" data-edge="hi"/>
      <circle cx="53.37" cy="31.96" r="14.2" data-edge="lo" stroke-width="1" stroke-dasharray="1.6 1.8" stroke-opacity="0.55"/>
      <ellipse cx="53.37" cy="31.96" rx="9.26" ry="9.02" data-face="hole"/>
      <ellipse cx="53.37" cy="31.96" rx="9.26" ry="9.02" data-edge="lo"/>
      <ellipse cx="53.37" cy="31.96" rx="3.06" ry="2.98" data-face="cap"/>
    </g>
  </svg>`,
  },
  trans_coal_feeder: {
    icon25d: `<svg viewBox="0 0 88 52" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="42" cy="48" rx="38" ry="1.6" data-shadow="1"/>

      <polygon points="1.5,0 43.9,0 45.4,1.5 3,1.5" data-face="top"/>
      <rect x="1.5" y="1.5" width="42.4" height="4.3" data-face="front"/>
      <polygon points="43.9,1.5 45.4,1.5 45.4,5.8 43.9,5.8" data-face="side"/>
      <path d="M1.5 0 L43.9 0" data-edge="hi"/>
      <path d="M1.5 5.8 L43.9 5.8" data-edge="lo"/>

      <polygon points="4.44,5.78 40.95,5.78 40.95,16.64 74.03,16.64 82.38,34.7 74.03,43.32 31.53,43.32 4.44,16.64" data-face="front"/>
      <polygon points="4.44,5.78 40.95,5.78 42.5,7.3 6,7.3" data-face="top"/>
      <polygon points="40.95,16.64 74.03,16.64 75.6,18.2 42.5,18.2" data-face="top"/>
      <polygon points="82.38,34.7 83.9,33.2 75.6,41.8 74.03,43.32" data-face="side"/>
      <path d="M4.44 5.78 L40.95 5.78 L40.95 16.64 L74.03 16.64 L82.38 34.7" data-edge="hi"/>
      <path d="M4.44 5.78 L4.44 16.64" data-edge="hi"/>
      <path d="M82.38 34.7 L74.03 43.32 L31.53 43.32 L4.44 16.64" data-edge="lo"/>

      <rect x="57.3" y="11.44" width="13.24" height="5.2" rx="1" data-face="hole"/>
      <rect x="57.3" y="11.44" width="13.24" height="5.2" rx="1" data-edge="lo" stroke-width="1.1"/>

      <path d="M1.2 49.8 L85.6 49.8" data-edge="lo"/>
    </g>
  </svg>`,
  },
  trans_oil_pump: {
    icon25d: `<svg viewBox="0 0 73 55" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="37" cy="52" rx="29" ry="1.6" data-shadow="1"/>

      <path d="M5.81,4.83 L47.07,4.83 C48.72,4.83 50.05,6.17 50.05,7.82 L50.05,45.96 C50.05,47.61 48.72,48.95 47.07,48.95 L5.81,48.95 Z" data-face="body"/>
      <polygon points="5.81,4.83 50.05,4.83 51.55,3.33 7.3,3.33" data-face="top"/>
      <path d="M5.81 4.83 L5.81 48.95" data-edge="hi"/>
      <path d="M50.05 4.83 L50.05 48.95" data-edge="lo"/>
      <path d="M5.81 48.95 L50.05 48.95" data-edge="lo"/>

      <path d="M0,10.17 L4.68,13.86 C5.39,14.43 5.81,15.29 5.81,16.21 L5.81,37.57 C5.81,38.48 5.39,39.35 4.68,39.91 L0,43.61 Z" data-face="front"/>
      <path d="M0 10.17 L0 43.61" data-edge="hi"/>

      <rect x="23.7" y="16.05" width="26.35" height="21.67" data-face="front"/>
      <path d="M23.7 16.05 L23.7 37.72" data-edge="lo" stroke-width="1.1"/>
      <circle cx="34.5" cy="26.89" r="4.27" data-face="cap"/>
      <circle cx="34.5" cy="26.89" r="4.27" data-edge="hi"/>

      <rect x="0" y="20.7" width="5.81" height="5.81" data-face="side"/>
      <rect x="0" y="26.52" width="5.81" height="5.81" data-face="side"/>
      <path d="M0 20.7 L5.81 20.7 L5.81 26.5 L0 26.5 Z" data-edge="lo" stroke-width="1.1"/>
      <path d="M0 26.52 L5.81 26.52 L5.81 32.33 L0 32.33 Z" data-edge="lo" stroke-width="1.1"/>

      <rect x="50.05" y="24.81" width="19.95" height="4.15" data-face="body"/>
      <ellipse cx="70" cy="26.89" rx="1.6" ry="2.1" data-face="hole"/>
      <path d="M50.05 24.81 L70 24.81" data-edge="hi"/>
      <path d="M50.05 28.96 L70 28.96" data-edge="lo"/>

      <path d="M50.05 1.85 L50.05 51.97" data-edge="hi"/>
    </g>
  </svg>`,
  },
  trans_smoke_sensor: {
    icon25d: `<svg viewBox="0 0 72 58" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="35" cy="55.2" rx="24" ry="1.4" data-shadow="1"/>

      <polygon points="0,0 70,0 71.5,1.5 1.5,1.5" data-face="top"/>
      <rect x="0" y="1.5" width="70" height="4.2" rx="2" data-face="front"/>
      <polygon points="70,1.5 71.5,1.5 71.5,5.7 70,5.7" data-face="side"/>
      <path d="M0 0 L70 0" data-edge="hi"/>
      <path d="M0 5.7 L70 5.7" data-edge="lo"/>

      <path d="M29.6,5.7 L40.4,5.7 C52.6,5.7 60.3,13.4 60.3,24.2 C60.3,35 52.6,42.7 40.4,42.7 L29.6,42.7 C17.4,42.7 9.7,35 9.7,24.2 C9.7,13.4 17.4,5.7 29.6,5.7 Z" data-face="body"/>
      <path d="M29.6 5.7 C17.4 5.7 9.7 13.4 9.7 24.2" data-edge="hi"/>
      <path d="M40.4 5.7 C52.6 5.7 60.3 13.4 60.3 24.2 C60.3 35 52.6 42.7 40.4 42.7 L29.6 42.7" data-edge="lo"/>

      <line x1="22.3" y1="23.1" x2="22.3" y2="34.7" data-edge="lo" stroke-width="2.3"/>
      <line x1="30.8" y1="23.1" x2="30.8" y2="34.7" data-edge="lo" stroke-width="2.3"/>
      <line x1="39.2" y1="23.1" x2="39.2" y2="34.7" data-edge="lo" stroke-width="2.3"/>
      <line x1="47.7" y1="23.1" x2="47.7" y2="34.7" data-edge="lo" stroke-width="2.3"/>

      <ellipse cx="35" cy="13.8" rx="4.7" ry="4.6" data-face="cap"/>
      <ellipse cx="35" cy="13.8" rx="4.7" ry="4.6" data-edge="hi"/>
      <circle cx="35" cy="13.8" r="2" data-edge="lo" stroke-width="1.1"/>

      <line x1="29" y1="43" x2="29" y2="50.4" data-edge="lo" stroke-width="1.1"/>
      <line x1="33.2" y1="43" x2="33.2" y2="50.4" data-edge="lo" stroke-width="1.1"/>
      <line x1="37.1" y1="43" x2="37.1" y2="50.4" data-edge="lo" stroke-width="1.1"/>
      <line x1="41" y1="43" x2="41" y2="50.4" data-edge="lo" stroke-width="1.1"/>

      <polygon points="24.3,50.8 45.7,50.8 47,52.1 25.6,52.1" data-face="top"/>
      <rect x="24.3" y="52.1" width="21.4" height="4.4" data-face="front"/>
      <polygon points="45.7,52.1 47,52.1 47,56.5 45.7,56.5" data-face="side"/>
      <path d="M24.3 50.8 L45.7 50.8" data-edge="hi"/>
      <path d="M24.3 56.5 L45.7 56.5 L47 56.3" data-edge="lo"/>
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
    icon25d: art.icon25d,
    properties: def.properties.map((p) => (p.key === 'name' ? { ...p, default: name } : p)),
  }
})

export const transportComponents = transportAssetComponents
