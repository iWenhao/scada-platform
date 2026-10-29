import { buildAssetComponents, withIllustrations } from '../assetComponents'
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
    <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="33" cy="65" rx="20" ry="1.1" data-shadow="1"/>

      <!-- 滚筒端面；轮缘皮带槽压暗，8 条凸筋落在槽上 -->
      <circle cx="33" cy="33" r="32.4" data-face="front"/>
      <path d="M33,0.6 A32.4,32.4 0 1 0 33,65.4 A32.4,32.4 0 1 0 33,0.6 Z M33,6.6 A26.4,26.4 0 1 1 33,59.4 A26.4,26.4 0 1 1 33,6.6 Z" fill-rule="evenodd" data-face="side"/>
      <path d="M10.1,10.1 A32.4,32.4 0 0 0 0.6,33" data-edge="hi"/>
      <circle cx="33" cy="33" r="26.4" data-edge="lo"/>

      <!-- 轮缘上 8 条凸筋（原稿的 8 个短辐条），逐条算坐标，不用 rotate -->
      <polygon points="59.4,35.1 65.1,35.1 65.1,30.9 59.4,30.9" data-face="top"/>
      <polygon points="53.15,15.82 57.18,11.79 54.21,8.82 50.18,12.85" data-face="top"/>
      <polygon points="35.1,6.6 35.1,0.9 30.9,0.9 30.9,6.6" data-face="top"/>
      <polygon points="15.82,12.85 11.79,8.82 8.82,11.79 12.85,15.82" data-face="top"/>
      <polygon points="6.6,30.9 0.9,30.9 0.9,35.1 6.6,35.1" data-face="top"/>
      <polygon points="12.85,50.18 8.82,54.21 11.79,57.18 15.82,53.15" data-face="top"/>
      <polygon points="30.9,59.4 30.9,65.1 35.1,65.1 35.1,59.4" data-face="top"/>
      <polygon points="50.18,53.15 54.21,57.18 57.18,54.21 53.15,50.18" data-face="top"/>

      <!-- 轮毂与轴孔 -->
      <circle cx="33" cy="33" r="10.65" data-face="cap"/>
      <path d="M24.8,28.6 A10.65,10.65 0 0 1 41.2,28.6" data-edge="hi"/>
      <circle cx="33" cy="33" r="5.2" data-edge="lo" stroke-width="3.2"/>
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
    <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="35" cy="50.4" rx="30" ry="1.2" data-shadow="1"/>

      <!-- 泵体：原稿右端圆角箱体 -->
      <path d="M5.8,4.83 L47.05,4.83 C48.7,4.83 50.05,6.18 50.05,7.82 L50.05,45.96 C50.05,47.6 48.7,48.95 47.05,48.95 L5.8,48.95 Z" data-face="front"/>
      <rect x="5.8" y="4.83" width="41" height="2.5" data-face="top"/>
      <rect x="47.4" y="8" width="2.65" height="38" data-face="side"/>
      <path d="M5.8,4.83 L46.4,4.83" data-edge="hi"/>
      <path d="M5.8,48.95 L46.6,48.95" data-edge="lo"/>

      <!-- 左端盖：收口箱，两块方形法兰板按原稿位置铺在盖面上 -->
      <path d="M0,16.2 L5.8,10.17 L5.8,43.6 L0,37.57 Z" data-face="front"/>
      <path d="M0,16.2 L5.8,10.17" data-edge="hi"/>
      <rect x="0" y="20.7" width="5.8" height="5.8" data-face="front"/>
      <rect x="0" y="26.5" width="5.8" height="5.8" data-face="front"/>
      <path d="M0,20.7 L5.8,20.7" data-edge="hi"/>
      <path d="M0,26.5 L5.8,26.5" data-edge="lo"/>
      <path d="M0,32.3 L5.8,32.3" data-edge="lo"/>
      <circle cx="2.9" cy="23.6" r="0.5" data-edge="lo"/>
      <circle cx="2.9" cy="29.4" r="0.5" data-edge="lo"/>

      <!-- 右半部凸起的盖板，四角螺栓 -->
      <rect x="23.7" y="18" width="26.3" height="19.7" data-face="front"/>
      <rect x="23.7" y="16.05" width="26.3" height="1.95" data-face="top"/>
      <rect x="47" y="18" width="3" height="19.7" data-face="side"/>
      <path d="M23.7,16.05 L50,16.05" data-edge="hi"/>
      <path d="M23.7,16.05 L23.7,37.72" data-edge="lo"/>
      <path d="M23.7,37.72 L50,37.72" data-edge="lo"/>
      <circle cx="26.4" cy="19.4" r="0.55" data-edge="lo"/>
      <circle cx="47.2" cy="19.4" r="0.55" data-edge="lo"/>
      <circle cx="26.4" cy="34.8" r="0.55" data-edge="lo"/>
      <circle cx="47.2" cy="34.8" r="0.55" data-edge="lo"/>

      <!-- 轴头：凸起的圆盖 + 内六角 -->
      <circle cx="34.5" cy="26.89" r="4.27" data-face="cap"/>
      <path d="M31.4,24.4 A4.27,4.27 0 0 1 37.6,24.4" data-edge="hi"/>
      <circle cx="34.5" cy="26.89" r="1.5" data-edge="lo"/>

      <!-- 出口：法兰 + 卧式管口 -->
      <rect x="48.5" y="23.3" width="3.5" height="7.2" data-face="front"/>
      <rect x="48.5" y="23.3" width="3.5" height="1.4" data-face="top"/>
      <path d="M48.5,23.3 L52,23.3" data-edge="hi"/>
      <rect x="49" y="24.81" width="21" height="4.15" data-face="barrel"/>
      <ellipse cx="69.4" cy="26.89" rx="1.4" ry="2.1" data-face="hole"/>
      <path d="M49,24.81 L70,24.81" data-edge="hi"/>
      <path d="M49,28.96 L70,28.96" data-edge="lo"/>
    </g>
  </svg>`,
  },
  trans_smoke_sensor: {
    icon25d: `<svg viewBox="0 0 72 58" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="35" cy="56.9" rx="17" ry="1" data-shadow="1"/>

      <!-- 顶部安装导轨 -->
      <rect x="0" y="1.2" width="70" height="4.49" rx="2.2" data-face="front"/>
      <rect x="0" y="0" width="70" height="1.2" rx="0.6" data-face="top"/>
      <path d="M0,0 L70,0" data-edge="hi"/>
      <path d="M0,5.69 L70,5.69" data-edge="lo"/>
      <circle cx="4.6" cy="3.4" r="0.55" data-edge="lo"/>
      <circle cx="65.4" cy="3.4" r="0.55" data-edge="lo"/>

      <!-- 探测器外壳：原稿的钟形轮廓，肩部留一条受光带 -->
      <path d="M9.71,5.73 L60.29,5.73 L60.29,22.84 C60.29,33.82 51.39,42.73 40.4,42.73 L29.59,42.73 C18.61,42.73 9.71,33.82 9.71,22.84 Z" data-face="front"/>
      <rect x="9.71" y="5.73" width="50.58" height="3.2" data-face="top"/>

      <!-- 中部四条进烟口：原稿的粗竖线改为暗槽 -->
      <path d="M22.32,23.08 L22.32,34.65" data-edge="lo" stroke-width="3.2"/>
      <path d="M30.77,23.08 L30.77,34.65" data-edge="lo" stroke-width="3.2"/>
      <path d="M39.23,23.08 L39.23,34.65" data-edge="lo" stroke-width="3.2"/>
      <path d="M47.68,23.08 L47.68,34.65" data-edge="lo" stroke-width="3.2"/>

      <!-- 指示灯：凸起的透镜 -->
      <ellipse cx="35" cy="13.75" rx="4.72" ry="4.6" data-face="cap"/>
      <path d="M31.4,11.6 A4.72,4.6 0 0 1 38.6,11.6" data-edge="hi"/>
      <ellipse cx="35" cy="13.75" rx="2.2" ry="2.1" data-edge="lo"/>

      <!-- 下部格栅：把外壳与支架接起来，四条细缝按原稿位置 -->
      <rect x="29" y="42" width="12" height="9" data-face="front"/>
      <path d="M29,43 L29,50.45" data-edge="lo"/>
      <path d="M33.23,43 L33.23,50.45" data-edge="lo"/>
      <path d="M37.12,43 L37.12,50.45" data-edge="lo"/>
      <path d="M41,43 L41,50.45" data-edge="lo"/>

      <!-- 安装支架 -->
      <rect x="24.3" y="50.77" width="21.4" height="5.69" data-face="front"/>
      <rect x="24.3" y="50.77" width="21.4" height="1.2" data-face="top"/>
      <path d="M24.3,50.77 L45.7,50.77" data-edge="hi"/>
      <path d="M24.3,56.46 L45.7,56.46" data-edge="lo"/>
      <circle cx="28.2" cy="54" r="0.55" data-edge="lo"/>
      <circle cx="41.8" cy="54" r="0.55" data-edge="lo"/>
    </g>
  </svg>`,
  },
}

const transportAssetComponents = withIllustrations(
  buildAssetComponents('transport', transportIcons, transportMeta),
  illustratedAssets,
)

export const transportComponents = transportAssetComponents
