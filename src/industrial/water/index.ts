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
 * 2.5D 迁移：素材图元是线条稿，这里按面基同姿态重绘（见 docs/2.5D_ILLUSTRATION_GUIDE.md §4.5）。
 * 覆盖发生在组装之后，生成文件保持原样，重新导出素材不会把这层改动冲掉。
 *
 * 同姿态约定：viewBox、摆放角度、占地轮廓都与素材原稿一致，只把「线」换成「面 + 棱线 +
 * 接触阴影」，因此默认尺寸继续用素材自带的值，不在这里改画幅。
 *
 * 双源约定：`icon` 继续用生成文件里的素材原稿（2D 画布与组件面板必须与导入时一模一样），
 * 面基稿写进 `icon25d`，只在 2.5D 模式生效。名称属性同步改，否则属性面板里的默认名仍是素材原名。
 */
const illustratedAssets: Record<string, { icon25d: string; name?: string }> = {
  water_pump: {
    icon25d: `<svg viewBox="0 0 81 98" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="40" cy="96.3" rx="32" ry="1.4" data-shadow="1"/>

      <!-- 电机：体积交给渐变，只在受光的上缘留一段高光 -->
      <rect x="52" y="9" width="16" height="79" rx="8" data-face="body"/>
      <ellipse cx="60" cy="11" rx="8" ry="2.2" data-face="cap"/>
      <path d="M53.4,10.5 A8,2.2 0 0 1 66.6,10.5" data-edge="hi"/>
      <path d="M54,87.2 C56.5,88.8 63.5,88.8 66,87.2" data-edge="lo"/>

      <!-- 顶部法兰：两颗螺栓，颈部只留左侧亮棱 -->
      <rect x="47" y="1.2" width="26" height="2.8" rx="1.4" data-face="front"/>
      <rect x="47" y="0" width="26" height="1.4" rx="0.7" data-face="top"/>
      <path d="M47,1.2 L73,1.2" data-edge="hi"/>
      <circle cx="50.2" cy="2.6" r="0.55" data-edge="lo"/>
      <circle cx="69.8" cy="2.6" r="0.55" data-edge="lo"/>
      <path d="M55,4 L65,4 L65,11 C62.1,8.7 57.9,8.7 55,11 Z" data-face="front"/>
      <path d="M55,4 L55,10.2" data-edge="hi"/>

      <rect x="47" y="92" width="26" height="2.8" rx="1.4" data-face="front"/>
      <rect x="47" y="94.8" width="26" height="1.2" rx="0.6" data-face="side"/>
      <path d="M55,86 L65,86 L65,92 C62.1,89.8 57.9,89.8 55,92 Z" data-face="front"/>
      <path d="M47,95.9 L73,95.9" data-edge="lo"/>

      <!-- 传动轴压进护罩后方，不再自带一圈边 -->
      <rect x="47" y="18.5" width="6" height="60" rx="3" data-face="side"/>

      <!-- 护罩是一块折弯薄板：整体压暗，只留上折边 -->
      <polygon points="36,31 48,21 48,76 36,66" data-face="side"/>
      <path d="M36,31 L48,21" data-edge="hi"/>

      <!-- 联轴器、中间法兰：横向接缝保留，竖向边框去掉 -->
      <rect x="36" y="41" width="12" height="17" data-face="front"/>
      <rect x="36" y="39" width="12" height="2" data-face="top"/>
      <path d="M36,39 L48,39" data-edge="hi"/>
      <path d="M36,58 L48,58" data-edge="lo"/>
      <rect x="35" y="46" width="14" height="5" data-face="front"/>
      <rect x="35" y="46" width="14" height="1.6" data-face="top"/>
      <path d="M35,46 L49,46" data-edge="hi"/>
      <path d="M35,51 L49,51" data-edge="lo"/>

      <rect x="32" y="29" width="4" height="39" rx="2" data-face="body"/>
      <ellipse cx="34" cy="29.8" rx="2" ry="0.9" data-face="cap"/>

      <!-- 泵壳：卧式圆筒 + 出口法兰，上下各留一条轮廓 -->
      <rect x="12" y="33" width="21" height="31" data-face="barrel"/>
      <ellipse cx="12" cy="48.5" rx="2" ry="15.5" data-face="cap"/>
      <path d="M12,33 L33,33" data-edge="hi"/>
      <path d="M12,64 L33,64" data-edge="lo"/>
      <rect x="30.5" y="45.6" width="6" height="5.8" data-face="front"/>
      <rect x="30.5" y="45.6" width="6" height="1.6" data-face="top"/>
      <path d="M30.5,45.6 L36.5,45.6" data-edge="hi"/>

      <rect x="1" y="46" width="12" height="5" data-face="barrel"/>
      <ellipse cx="1.2" cy="48.5" rx="1.2" ry="2.5" data-face="hole"/>
      <path d="M1,46 L13,46" data-edge="hi"/>
      <path d="M1,51 L13,51" data-edge="lo"/>

      <rect x="68" y="39" width="7" height="19" data-face="front"/>
      <rect x="68" y="39" width="7" height="2" data-face="top"/>
      <path d="M68,39 L75,39" data-edge="hi"/>
      <path d="M68,58 L75,58" data-edge="lo"/>

      <rect x="74" y="30" width="5" height="37" rx="2.5" data-face="body"/>
      <ellipse cx="76.5" cy="31" rx="2.5" ry="1.2" data-face="cap"/>
      <path d="M74,31 A2.5,1.2 0 0 1 79,31" data-edge="hi"/>
    </g>
  </svg>`,
  },
  water_valve: {
    icon25d: `<svg viewBox="0 0 37 42" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="18.5" cy="40.4" rx="14" ry="1.3" data-shadow="1"/>

      <rect x="2.33" y="15" width="7" height="24" data-face="body"/>
      <ellipse cx="5.83" cy="15" rx="3.5" ry="1.1" data-face="cap"/>
      <ellipse cx="5.83" cy="39" rx="3.5" ry="1.1" data-face="hole"/>
      <path d="M2.33 15 L2.33 39" data-edge="hi"/>
      <path d="M9.33 15 L9.33 39" data-edge="lo"/>

      <rect x="26.83" y="15" width="5.84" height="24" data-face="body"/>
      <ellipse cx="29.75" cy="15" rx="2.92" ry="1.1" data-face="cap"/>
      <ellipse cx="29.75" cy="39" rx="2.92" ry="1.1" data-face="hole"/>
      <path d="M26.83 15 L26.83 39" data-edge="hi"/>
      <path d="M32.67 15 L32.67 39" data-edge="lo"/>

      <polygon points="9.33,20 23.33,20 26.83,17.4 12.83,17.4" data-face="top"/>
      <rect x="9.33" y="20" width="14" height="14.12" data-face="front"/>
      <polygon points="23.33,20 26.83,17.4 26.83,31.5 23.33,34.12" data-face="side"/>
      <path d="M9.33 20 L9.33 34.12" data-edge="hi"/>
      <path d="M23.33 20 L23.33 34.12" data-edge="lo"/>

      <rect x="15.17" y="5" width="5.83" height="15" data-face="body"/>
      <path d="M15.17 5 L15.17 20" data-edge="hi"/>
      <path d="M21 5 L21 20" data-edge="lo"/>

      <ellipse cx="17.5" cy="3.2" rx="17.5" ry="1.5" data-face="front"/>
      <ellipse cx="17.5" cy="1.7" rx="17.5" ry="1.7" data-face="top"/>
      <ellipse cx="17.5" cy="1.7" rx="10.5" ry="0.9" data-face="hole"/>
      <path d="M0 1.7 L35 1.7" data-edge="hi"/>
    </g>
  </svg>`,
  },
  water_tank: {
    icon25d: `<svg viewBox="0 0 40 80" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="19.7" cy="78.5" rx="17.4" ry="1.2" data-shadow="1"/>

      <!-- 罐身：整体沿用原稿的圆角肩线 -->
      <path d="M13.73,0.6 L25.63,0.6 C32.1,0.6 37.74,5.5 37.74,12.7 L37.74,62.71 C37.74,68.5 33.0,73.23 27.22,73.23 L12.14,73.23 C6.4,73.23 1.63,68.5 1.63,62.71 L1.63,12.7 C1.63,5.5 7.3,0.6 13.73,0.6 Z" data-face="body"/>

      <!-- 顶盖：原稿两道顶线之间是盖板 -->
      <path d="M1.72,11.48 C2.2,5.9 7.2,0.6 13.73,0.6 L25.63,0.6 C32.2,0.6 37.2,5.9 37.7,11.48 Z" data-face="top"/>
      <path d="M3.36,6.47 L36.06,6.47" data-edge="hi"/>
      <path d="M1.72,11.48 L37.7,11.48" data-edge="lo" stroke-width="2.6"/>
      <path d="M2.2,63.6 C3.6,69.4 7.3,73.23 12.14,73.23 L27.22,73.23 C32.0,73.23 35.7,69.4 37.2,63.6" data-edge="lo"/>

      <!-- 水位：原稿的波浪水面，向下填到罐底内缘 -->
      <path d="M3.4,33.5 C4.3,34.2 5.7,34.54 7.66,34.54 C10.6,34.54 12.1,32.47 15.9,32.47 C19.7,32.47 21.3,34.54 24.3,34.54 C27.2,34.54 29.8,32.47 32.5,32.47 C34.2,32.47 35.4,32.8 35.96,33.5 L35.96,71.24 L3.4,71.24 Z" data-face="hole"/>
      <path d="M3.4,33.5 C4.3,34.2 5.7,34.54 7.66,34.54 C10.6,34.54 12.1,32.47 15.9,32.47 C19.7,32.47 21.3,34.54 24.3,34.54 C27.2,34.54 29.8,32.47 32.5,32.47 C34.2,32.47 35.4,32.8 35.96,33.5" data-edge="hi"/>

      <!-- 支脚：顶面压进罐底，前置面与侧面共同落地 -->
      <polygon points="12.05,71.9 27.31,71.9 27.31,73.23 12.05,73.23" data-face="top"/>
      <rect x="12.05" y="73.23" width="15.26" height="5.61" data-face="front"/>
      <polygon points="27.31,73.23 28.6,72.3 28.6,77.0 27.31,78.84" data-face="side"/>
      <path d="M2.3,78.84 L37.1,78.84" data-edge="lo"/>
    </g>
  </svg>`,
  },
  water_dosing_tank: {
    icon25d: `<svg viewBox="0 0 50 88" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="25" cy="86.4" rx="21" ry="1.6" data-shadow="1"/>

      <path d="M1.6,28.5 C1.6,21.5 8.4,16.6 16.8,16.6 L33.2,16.6 C41.6,16.6 48.4,21.5 48.4,28.5 Z" data-face="cap"/>
      <path d="M1.6,28.5 C1.6,21.5 8.4,16.6 16.8,16.6 L33.2,16.6 C41.6,16.6 48.4,21.5 48.4,28.5" data-edge="hi"/>
      <path d="M1.6 28.5 L48.4 28.5" data-edge="lo"/>

      <path d="M1.6,28.5 L1.6,72 C1.6,80.5 8.3,87.4 16.8,87.4 L33.2,87.4 C41.7,87.4 48.4,80.5 48.4,72 L48.4,28.5 Z" data-face="body"/>
      <path d="M1.6 28.5 L1.6 72" data-edge="hi"/>
      <path d="M48.4 28.5 L48.4 72" data-edge="lo"/>
      <path d="M1.9 27.5 L48.1 27.5" data-edge="lo" stroke-width="1.1"/>
      <path d="M1.9 29.5 L48.1 29.5" data-edge="lo" stroke-width="1.1"/>
      <path d="M16.8 87.4 L33.2 87.4" data-edge="lo"/>

      <rect x="24.6" y="0.6" width="10.8" height="12.4" data-face="body"/>
      <ellipse cx="30" cy="0.6" rx="5.4" ry="1.6" data-face="cap"/>
      <ellipse cx="30" cy="0.6" rx="5.4" ry="1.6" data-edge="hi"/>
      <path d="M24.6 0.6 L24.6 13" data-edge="hi"/>
      <path d="M35.4 0.6 L35.4 13" data-edge="lo"/>
      <path d="M27 1.2 L27 13" data-edge="lo" stroke-width="1.1"/>
      <path d="M30 1.2 L30 13" data-edge="lo" stroke-width="1.1"/>
      <path d="M33 1.2 L33 13" data-edge="lo" stroke-width="1.1"/>

      <polygon points="26.5,13 33.5,13 35,14.5 28,14.5" data-face="top"/>
      <rect x="26.5" y="14.5" width="7" height="2.1" data-face="front"/>
      <path d="M26.5 14.5 L33.5 14.5" data-edge="hi"/>
      <path d="M26.5 16.6 L33.5 16.6" data-edge="lo"/>
    </g>
  </svg>`,
  },
  water_exhaust_tank: {
    icon25d: `<svg viewBox="0 0 61 94" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="29" cy="90.4" rx="27" ry="1.8" data-shadow="1"/>

      <polygon points="1,19.5 20,6.4 39,6.4 58,19.5 58,81 50,92 9,92 1,81" data-face="front"/>
      <polygon points="1,19.5 20,6.4 22,4.9 3,18" data-face="top"/>
      <polygon points="20,6.4 39,6.4 41,4.9 22,4.9" data-face="top"/>
      <polygon points="39,6.4 58,19.5 60,18 41,4.9" data-face="side"/>
      <polygon points="58,19.5 60,18 60,79.5 58,81" data-face="side"/>
      <path d="M1 19.5 L20 6.4 L39 6.4" data-edge="hi"/>
      <path d="M39 6.4 L58 19.5 L60 18" data-edge="lo"/>
      <path d="M1 19.5 L1 81" data-edge="hi"/>
      <path d="M58 19.5 L58 81" data-edge="lo"/>
      <path d="M1 81 L9 92 L50 92 L58 81" data-edge="lo"/>

      <rect x="20" y="0.6" width="19" height="5.8" data-face="body"/>
      <ellipse cx="29.5" cy="0.6" rx="9.5" ry="1.8" data-face="cap"/>
      <ellipse cx="29.5" cy="0.6" rx="9.5" ry="1.8" data-edge="hi"/>
      <path d="M20 0.6 L20 6.4" data-edge="hi"/>
      <path d="M39 0.6 L39 6.4" data-edge="lo"/>

      <path d="M1.4 17.5 L57.6 17.5" data-edge="lo" stroke-width="1.1"/>
      <path d="M1.4 20.5 L57.6 20.5" data-edge="lo" stroke-width="1.1"/>
      <path d="M1.4 41.5 L57.6 41.5" data-edge="lo" stroke-width="1.1"/>
      <path d="M1.4 44.5 L57.6 44.5" data-edge="lo" stroke-width="1.1"/>
      <path d="M1.4 65.5 L57.6 65.5" data-edge="lo" stroke-width="1.1"/>
      <path d="M1.4 68.5 L57.6 68.5" data-edge="lo" stroke-width="1.1"/>
    </g>
  </svg>`,
  },
  water_pool: {
    icon25d: `<svg viewBox="0 0 122 70" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="61" cy="67.8" rx="52" ry="1.8" data-shadow="1"/>

      <polygon points="0,0 120,0 116,4 2,4" data-face="top"/>
      <polygon points="2,4 116,4 109.5,66.6 10.5,67.4 9,66.6" data-face="front"/>
      <polygon points="120,0 116,4 109.5,66.6 112.9,67.1" data-face="side"/>
      <path d="M0 0 L120 0" data-edge="hi"/>
      <path d="M0 0 L9 66.6" data-edge="hi"/>
      <path d="M120 0 L112.9 67.1" data-edge="lo"/>
      <path d="M9 66.6 L10.5 67.4 L109.5 66.6" data-edge="lo"/>

      <path d="M6.2,58.3 C12,58.3 13,61.9 19,61.9 C25,61.9 25,58.3 31,58.3 C37,58.3 37,61.9 44,61.9 C50,61.9 51,58.3 57.5,58.3 C64,58.3 65,61.9 71,61.9 C77,61.9 78,58.3 85,58.3 C91,58.3 92,61.9 99,61.9 C105,61.9 106,58.3 113,58.3 L109.5,66.6 L10.5,67.4 Z" data-face="hole"/>
      <path d="M6.2,58.3 C12,58.3 13,61.9 19,61.9 C25,61.9 25,58.3 31,58.3 C37,58.3 37,61.9 44,61.9 C50,61.9 51,58.3 57.5,58.3 C64,58.3 65,61.9 71,61.9 C77,61.9 78,58.3 85,58.3 C91,58.3 92,61.9 99,61.9 C105,61.9 106,58.3 113,58.3" data-edge="hi" stroke-width="1.1"/>

      <path d="M1.2,9.4 C7.9,9.4 8.2,13 15,13 C21.7,13 21.3,9.4 28.1,9.4 C35,9.4 35.1,13 42.4,13 C49.7,13 50,9.4 57.4,9.4 C64.9,9.4 64.7,13 72.1,13 C79.6,13 79.7,9.4 87.4,9.4 C95,9.4 94.8,13 102.7,13 C110.5,13 110.9,9.4 118.8,9.4" data-edge="lo" stroke-width="1.1" stroke-opacity="0.5"/>
      <path d="M2.4,17.7 C9,17.7 9.3,21.3 15.9,21.3 C22.5,21.3 22.1,17.7 28.8,17.7 C35.5,17.7 35.6,21.3 42.8,21.3 C50,21.3 50.2,17.7 57.5,17.7 C64.8,17.7 64.6,21.3 71.9,21.3 C79.2,21.3 79.3,17.7 86.8,17.7 C94.3,17.7 94.1,21.3 101.8,21.3 C109.5,21.3 109.9,17.7 117.6,17.7" data-edge="lo" stroke-width="1.1" stroke-opacity="0.5"/>
    </g>
  </svg>`,
  },
  water_sedimentation_tank: {
    icon25d: `<svg viewBox="0 0 101 74" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="71.6" rx="30" ry="1.9" data-shadow="1"/>

      <polygon points="41.5,9.42 7.65,9.42 2.98,38.57 0.1,38.66 0,42.67 31.68,49.44 31.68,56.64 37.1,56.64 40.52,67.92 44,67.92" data-face="front"/>
      <polygon points="7.65,7.9 41.5,7.9 41.5,9.42 7.65,9.42" data-face="top"/>
      <path d="M7.65 9.42 L2.98 38.57 L0.1 38.66 L0 42.67 L31.68 49.44 L31.68 56.64 L37.1 56.64 L40.52 67.92 L44 67.92" data-edge="hi"/>
      <path d="M7.65 9.42 L41.5 9.42" data-edge="hi"/>
      <path d="M12 14.87 L41.5 14.87" data-edge="lo"/>

      <polygon points="57.47,9.42 91.35,9.42 96.02,38.61 98.9,38.69 99,42.67 67.32,49.49 67.32,56.7 61.9,56.7 58.48,67.99 55,67.99" data-face="front"/>
      <polygon points="57.47,7.9 91.35,7.9 91.35,9.42 57.47,9.42" data-face="top"/>
      <path d="M91.35 9.42 L96.02 38.61 L98.9 38.69 L99 42.67 L67.32 49.49 L67.32 56.7 L61.9 56.7 L58.48 67.99 L55 67.99" data-edge="hi"/>
      <path d="M57.47 9.42 L91.35 9.42" data-edge="hi"/>
      <path d="M57.47 14.9 L92 15" data-edge="lo"/>

      <rect x="39" y="2.4" width="21" height="7.1" data-face="front"/>
      <rect x="39" y="0.5" width="21" height="1.9" data-face="top"/>
      <path d="M39 2.4 L39 9.5" data-edge="hi"/>
      <path d="M60 2.4 L60 9.5" data-edge="lo"/>

      <path d="M56.4,0.6 L56.4,3.49 L51.51,5.06 L51.38,9.42 L57.4,9.42 L57.4,14.9 L51.4,17.17 L51.4,33.02 L55.4,35.72 L55.4,38.9 L51.4,38.9 L51.4,57.07 L54.4,59.81 L54.4,67.9 L44.6,67.9 L44.6,59.81 L47.6,57.07 L47.6,38.9 L43.6,38.9 L43.6,35.72 L47.6,33.02 L47.6,17.15 L41.6,14.9 L41.6,9.42 L47.6,9.42 L47.6,5.06 L42.6,3.49 L42.6,0.6 Z" data-face="front"/>
      <rect x="55.4" y="17.2" width="2" height="40.7" data-face="side"/>
      <path d="M44.6 0.6 L44.6 67.9" data-edge="hi"/>
      <path d="M55.4 9.42 L55.4 67.9" data-edge="lo"/>
      <path d="M54.5,68 L54.5,71.5 L45,72 L44.5,68 Z" data-face="deck"/>
    </g>
  </svg>`,
  },
  water_purifier: {
    icon25d: `<svg viewBox="0 0 88 68" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="44" cy="66.6" rx="35" ry="1.2" data-shadow="1"/>

      <!-- 三条支腿：顶端压进筒体 -->
      <path d="M18,46 L26,46 L26,63 C26,65.2 24.2,67 22,67 C19.8,67 18,65.2 18,63 Z" data-face="front"/>
      <path d="M40,46 L48,46 L48,63 C48,65.2 46.2,67 44,67 C41.8,67 40,65.2 40,63 Z" data-face="front"/>
      <path d="M62,46 L70,46 L70,63 C70,65.2 68.2,67 66,67 C63.8,67 62,65.2 62,63 Z" data-face="front"/>
      <path d="M18,46 L18,62.6" data-edge="hi"/>
      <path d="M40,46 L40,62.6" data-edge="hi"/>
      <path d="M62,46 L62,62.6" data-edge="hi"/>

      <!-- 卧式大筒体：左右端盖各取可见半圆，中间筒身独立上色 -->
      <path d="M20,8.6 A19.4,19.4 0 0 0 20,47.4 Z" data-face="cap"/>
      <rect x="20" y="8.6" width="48" height="38.8" data-face="barrel"/>
      <path d="M68,8.6 A19.4,19.4 0 0 1 68,47.4 Z" data-face="cap"/>

      <path d="M20,8.6 A19.4,19.4 0 0 0 0.6,28" data-edge="hi"/>
      <path d="M68,8.6 A19.4,19.4 0 0 1 87.4,28" data-edge="hi"/>
      <path d="M20,8.6 L68,8.6" data-edge="hi"/>
      <path d="M20,47.4 L68,47.4" data-edge="lo"/>

      <!-- 三个接管：法兰 + 短颈，短颈下探到筒壁以内 -->
      <rect x="21.5" y="2.5" width="5" height="7.5" data-face="front"/>
      <rect x="18.5" y="0.5" width="11" height="2" data-face="front"/>
      <rect x="18.5" y="0.5" width="11" height="0.9" data-face="top"/>
      <path d="M18.5,0.5 L29.5,0.5" data-edge="hi"/>
      <path d="M21.5,2.5 L21.5,9.8" data-edge="hi"/>
      <path d="M26.5,2.5 L26.5,9.8" data-edge="lo"/>
      <path d="M18.5,2.5 L29.5,2.5" data-edge="lo"/>

      <rect x="41.5" y="2.5" width="5" height="7.5" data-face="front"/>
      <rect x="38.5" y="0.5" width="11" height="2" data-face="front"/>
      <rect x="38.5" y="0.5" width="11" height="0.9" data-face="top"/>
      <path d="M38.5,0.5 L49.5,0.5" data-edge="hi"/>
      <path d="M41.5,2.5 L41.5,9.8" data-edge="hi"/>
      <path d="M46.5,2.5 L46.5,9.8" data-edge="lo"/>
      <path d="M38.5,2.5 L49.5,2.5" data-edge="lo"/>

      <rect x="61.5" y="2.5" width="5" height="7.5" data-face="front"/>
      <rect x="58.5" y="0.5" width="11" height="2" data-face="front"/>
      <rect x="58.5" y="0.5" width="11" height="0.9" data-face="top"/>
      <path d="M58.5,0.5 L69.5,0.5" data-edge="hi"/>
      <path d="M61.5,2.5 L61.5,9.8" data-edge="hi"/>
      <path d="M66.5,2.5 L66.5,9.8" data-edge="lo"/>
      <path d="M58.5,2.5 L69.5,2.5" data-edge="lo"/>
    </g>
  </svg>`,
  },
  water_dosing_pump: {
    icon25d: `<svg viewBox="0 0 65 88" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="25.5" cy="87.6" rx="25" ry="1" data-shadow="1"/>

      <!-- 左侧控制箱：原稿的圆角左边、竖向中线与指示灯 -->
      <path d="M6.2,12.1 L1,12.1 C0.45,12.1 0,12.55 0,13.1 L0,39 C0,39.55 0.45,40 1,40 L6.2,40 Z" data-face="front"/>
      <path d="M0,13.1 L0,39" data-edge="hi"/>
      <path d="M3,17 L3,37" data-edge="lo" stroke-width="1.1"/>
      <rect x="2.5" y="15" width="1" height="1" data-face="cap"/>

      <!-- 罐体：圆肩是顶盖，下半是罐身，原稿的竖向筋保留成分缝 -->
      <path d="M6.1,10.2 L6.1,10 C6.1,7.4 7.15,5.05 8.85,3.35 C10.55,1.65 12.9,0.6 15.5,0.6 L32.5,0.6 C35.1,0.6 37.44,1.65 39.15,3.35 C40.85,5.05 41.9,7.4 41.9,10 L41.9,10.2 Z" data-face="top"/>
      <path d="M6.1,10.2 L41.9,10.2 L41.9,41.4 L6.1,41.4 Z" data-face="body"/>
      <!-- 原稿肩部那道实心横条是凸起的箍环，用受光面交代，不画成暗缝 -->
      <rect x="6.5" y="9.7" width="35" height="1" data-face="top"/>
      <path d="M6.5,9.7 L41.5,9.7" data-edge="hi" stroke-width="1.1"/>
      <path d="M6.5,10.7 L41.5,10.7" data-edge="lo" stroke-width="1.2"/>
      <path d="M10,10.7 L10,41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M14,10.7 L14,41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M18,10.7 L18,41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M22,10.7 L22,41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M26,10.7 L26,41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M30,10.7 L30,41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M34,10.7 L34,41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M38,10.7 L38,41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M6.1,41.4 L41.9,41.4" data-edge="lo"/>

      <!-- 颈部、法兰与两根斜撑：原稿的短竖线与斜线在这里成了实体连接 -->
      <rect x="9.5" y="41.4" width="29" height="4.2" data-face="front"/>
      <path d="M9.5,41.4 L9.5,45.6" data-edge="hi"/>
      <rect x="6.1" y="45.6" width="35.8" height="0.7" data-face="top"/>
      <rect x="6.1" y="46.3" width="35.8" height="2.1" data-face="front"/>
      <path d="M6.1,45.6 L41.9,45.6" data-edge="hi"/>
      <path d="M6.1,48.4 L41.9,48.4" data-edge="lo"/>
      <polygon points="13.6,48.4 14.6,48.4 16.6,51.6 15.6,51.6" data-face="front"/>
      <polygon points="37.6,48.4 38.6,48.4 40.6,51.6 39.6,51.6" data-face="front"/>
      <path d="M13.6,48.4 L15.6,51.6" data-edge="hi"/>
      <path d="M37.6,48.4 L39.6,51.6" data-edge="hi"/>

      <!-- 下机壳：八边形箱体，顶面给斜撑落脚，右侧一条厚度带 -->
      <polygon points="11.78,51.6 43.3,51.6 45.9,54.24 45.9,77.77 43.31,80.4 11.77,80.4 9.1,77.83 9.1,54.27" data-face="front"/>
      <path d="M9.1,54.27 L11.78,51.6 L43.3,51.6 L45.9,54.24" data-edge="hi"/>
      <!-- 顶面与右侧厚度带都收在原稿八边形轮廓内，不外扩 -->
      <polygon points="11.78,51.6 43.3,51.6 44.4,52.9 10.8,52.9" data-face="top"/>
      <polygon points="44.5,55.1 45.9,54.24 45.9,77.77 44.5,76.9" data-face="side"/>
      <path d="M9.1,77.83 L11.77,80.4 L43.31,80.4 L45.9,77.77" data-edge="lo"/>

      <!-- 检修面板：凹面只留上下内缘，不给一圈边框 -->
      <path d="M15.41,55.6 L39.65,55.6 L41.57,57.45 L41.57,74.56 L39.65,76.4 L15.41,76.4 L13.43,74.6 L13.43,57.47 Z" data-face="hole"/>
      <path d="M15.41,55.6 L39.65,55.6" data-edge="lo" stroke-width="1.1"/>
      <path d="M15.41,76.4 L39.65,76.4" data-edge="hi" stroke-width="1.1"/>
      <circle cx="27.5" cy="66" r="4.4" data-face="cap"/>
      <path d="M23.1,66 A4.4,4.4 0 0 1 31.9,66" data-edge="hi"/>
      <path d="M31.9,66 A4.4,4.4 0 0 1 27.5,70.4" data-edge="lo"/>

      <!-- 机壳左侧的小端头（原稿为实心圆角块） -->
      <path d="M9.1,54.5 L4.5,54.5 C3.67,54.5 3,55.17 3,56 C3,56.83 3.67,57.5 4.5,57.5 L9.1,57.5 Z" data-face="barrel"/>
      <path d="M4.5,54.5 L9.1,54.5" data-edge="hi"/>

      <path d="M45.8,61 L53.1,61" data-pipe="base"/>
      <path d="M45.8,59.4 L53.1,59.4" data-pipe="hi"/>
      <path d="M45.8,72 L53.1,72" data-pipe="base"/>
      <path d="M45.8,70.4 L53.1,70.4" data-pipe="hi"/>

      <!-- 计量头：上下两组 T 形压板按原稿轮廓（横梁 + 窄颈 + 立柄）画 -->
      <path d="M61.5,49 L61.5,52 L58.5,52 L58.5,54 L59.5,54 L59.5,57 L56.5,57 L56.5,54 L57.5,54 L57.5,52 L54.5,52 L54.5,49 Z" data-face="front"/>
      <rect x="54.5" y="49" width="7" height="0.7" data-face="top"/>
      <path d="M54.5,49 L61.5,49" data-edge="hi"/>
      <path d="M56.5,54 L56.5,57" data-edge="hi"/>

      <path d="M59.5,75 L59.5,78 L58.5,78 L58.5,80 L61.5,80 L61.5,83 L54.5,83 L54.5,80 L57.5,80 L57.5,78 L56.5,78 L56.5,75 Z" data-face="front"/>
      <rect x="54.5" y="80" width="7" height="0.6" data-face="top"/>
      <path d="M54.5,80 L61.5,80" data-edge="hi"/>
      <path d="M54.5,83 L61.5,83" data-edge="lo"/>
      <path d="M56.5,75 L56.5,78" data-edge="hi"/>

      <rect x="53.1" y="57.6" width="9.8" height="16.8" rx="1" data-face="body"/>
      <path d="M53.1,57.6 L62.9,57.6" data-edge="hi"/>
      <path d="M53.1,74.4 L62.9,74.4" data-edge="lo"/>
      <!-- 头体正面凸台：原稿是实心亮条，不是凹孔 -->
      <rect x="55.5" y="60" width="5" height="12" data-face="top"/>
      <path d="M55.5,60 L55.5,72" data-edge="hi"/>
      <path d="M55.5,72 L60.5,72" data-edge="lo"/>

      <!-- 底座与两条支腿：腿按原稿分别落在 15.4 / 40.4 处向内收，底板后画压住腿脚 -->
      <polygon points="14.82,80.3 16.02,80.3 14.52,83.8 13.32,83.8" data-face="front"/>
      <polygon points="39.82,80.3 41.02,80.3 39.52,83.8 38.32,83.8" data-face="front"/>
      <path d="M14.82,80.3 L13.32,83.8" data-edge="hi"/>
      <path d="M39.82,80.3 L38.32,83.8" data-edge="hi"/>
      <rect x="5.8" y="83.6" width="39.4" height="0.8" data-face="top"/>
      <rect x="5.1" y="84.4" width="40.8" height="3" data-face="front"/>
      <path d="M5.8,83.6 L45.2,83.6" data-edge="hi"/>
      <path d="M5.1,87.4 L45.9,87.4" data-edge="lo"/>
    </g>
  </svg>`,
  },
  water_metering_pump: {
    icon25d: `<svg viewBox="0 0 107 138" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="53" cy="136.3" rx="26" ry="1.3" data-shadow="1"/>

      <rect x="48" y="113" width="9" height="20.5" rx="4.5" data-face="body"/>
      <ellipse cx="52.5" cy="133.5" rx="4.5" ry="2.6" data-face="cap"/>

      <!-- 下机体：保留圆角箱体和底缘接缝 -->
      <path d="M32,64 L73,64 L73,113 C73,115.2 71.2,117 69,117 L36,117 C33.8,117 32,115.2 32,113 Z" data-face="front"/>
      <rect x="32" y="64" width="41" height="3" data-face="top"/>
      <rect x="70" y="67" width="3" height="46" data-face="side"/>
      <path d="M32,113.3 C32.8,116 34.6,117 36,117" data-edge="lo"/>
      <path d="M69.6,117 C71,117 72.4,115.9 73,113.6" data-edge="lo"/>
      <circle cx="35.4" cy="112.4" r="0.6" data-edge="lo"/>
      <circle cx="69.6" cy="112.4" r="0.6" data-edge="lo"/>

      <!-- 柱塞与斜撑 -->
      <rect x="48" y="42" width="9" height="24" data-face="body"/>
      <ellipse cx="52.5" cy="43.5" rx="4.5" ry="1.4" data-face="cap"/>
      <polygon points="22,43 27,43 37,65 32,65" data-face="front"/>
      <polygon points="78,43 83,43 73,65 68,65" data-face="front"/>
      <path d="M22,43 L32,65" data-edge="hi"/>
      <path d="M83,43 L73,65" data-edge="lo"/>

      <!-- 上箱体 -->
      <rect x="20" y="19" width="65" height="25" data-face="front"/>
      <rect x="20" y="16" width="65" height="3" data-face="top"/>
      <rect x="82" y="19" width="3" height="25" data-face="side"/>
      <path d="M20,16 L85,16" data-edge="hi"/>
      <path d="M20,44 L85,44" data-edge="lo"/>
      <circle cx="24.4" cy="20.6" r="0.6" data-edge="lo"/>
      <circle cx="80.6" cy="20.6" r="0.6" data-edge="lo"/>

      <!-- 顶部立颈与盖板 -->
      <rect x="43" y="7" width="19" height="10" data-face="front"/>
      <path d="M43,7 L43,15.6" data-edge="hi"/>
      <rect x="24" y="2.4" width="57" height="5.6" rx="2.8" data-face="front"/>
      <rect x="24" y="0" width="57" height="2.4" rx="1.2" data-face="top"/>
      <path d="M24,0 L81,0" data-edge="hi"/>
      <circle cx="28" cy="4.4" r="0.6" data-edge="lo"/>
      <circle cx="77" cy="4.4" r="0.6" data-edge="lo"/>

      <!-- 左右立柱与连接座：连接座留一颗螺栓 -->
      <rect x="0" y="12" width="7" height="36" rx="2" data-face="body"/>
      <ellipse cx="3.5" cy="13.2" rx="3.5" ry="1.2" data-face="cap"/>
      <rect x="7" y="24" width="14" height="14" data-face="front"/>
      <rect x="7" y="22" width="14" height="2" data-face="top"/>
      <path d="M7,22 L21,22" data-edge="hi"/>
      <path d="M7,38 L21,38" data-edge="lo"/>
      <circle cx="14" cy="35" r="0.6" data-edge="lo"/>

      <rect x="100" y="12" width="7" height="36" rx="2" data-face="body"/>
      <ellipse cx="103.5" cy="13.2" rx="3.5" ry="1.2" data-face="cap"/>
      <rect x="86" y="23" width="14" height="14" data-face="front"/>
      <rect x="86" y="21" width="14" height="2" data-face="top"/>
      <path d="M86,21 L100,21" data-edge="hi"/>
      <path d="M86,37 L100,37" data-edge="lo"/>
      <circle cx="93" cy="34" r="0.6" data-edge="lo"/>
    </g>
  </svg>`,
  },
  water_backup_pump: {
    icon25d: `<svg viewBox="0 0 46 99" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="23" cy="97.4" rx="20" ry="1.2" data-shadow="1"/>

      <!-- 自下而上叠放：每层的顶面都收在自身轮廓内（原稿的法兰带圆角，不能外扩一圈） -->
      <path d="M2,93.8 L42,93.8 L42,96 C42,96.55 41.55,97 41,97 L3,97 C2.45,97 2,96.55 2,96 Z" data-face="front"/>
      <rect x="3.2" y="93" width="37.6" height="0.8" data-face="top"/>
      <path d="M3.2,93 L40.8,93" data-edge="hi"/>
      <path d="M3,97 L41,97" data-edge="lo"/>

      <rect x="7" y="78.8" width="30" height="14.2" data-face="body"/>
      <rect x="7.4" y="78" width="29.2" height="0.8" data-face="top"/>
      <path d="M7.4,78 L36.6,78" data-edge="hi"/>
      <path d="M13,78.8 L13,93" data-edge="lo" stroke-width="1.1"/>
      <path d="M19,78.8 L19,93" data-edge="lo" stroke-width="1.1"/>
      <path d="M25,78.8 L25,93" data-edge="lo" stroke-width="1.1"/>
      <path d="M31,78.8 L31,93" data-edge="lo" stroke-width="1.1"/>

      <path d="M0,73.8 L44,73.8 L44,77 C44,77.55 43.55,78 43,78 L1,78 C0.45,78 0,77.55 0,77 Z" data-face="front"/>
      <rect x="1.2" y="73" width="41.6" height="0.8" data-face="top"/>
      <path d="M1.2,73 L42.8,73" data-edge="hi"/>
      <path d="M0.6,78 L43.4,78" data-edge="lo"/>

      <!-- 下颈圈：原稿是上圆下直的过渡件，顶面沿用圆肩曲率 -->
      <path d="M2,70 L42,70 L42,73 L2,73 Z" data-face="front"/>
      <path d="M4,68 L40,68 C41.1,68 42,68.9 42,70 L2,70 C2,68.9 2.9,68 4,68 Z" data-face="top"/>
      <path d="M4,68 L40,68 C41.1,68 42,68.9 42,70" data-edge="hi"/>

      <path d="M5,22.8 L39,22.8 L39,68 L5,68 Z" data-face="body"/>
      <rect x="5.4" y="22" width="33.2" height="0.8" data-face="top"/>
      <path d="M5.4,22 L38.6,22" data-edge="hi"/>
      <path d="M22,22.8 L22,68" data-edge="lo" stroke-width="1.1"/>

      <path d="M2,17.8 L42,17.8 L42,21 C42,21.55 41.55,22 41,22 L3,22 C2.45,22 2,21.55 2,21 Z" data-face="front"/>
      <rect x="3.2" y="17" width="37.6" height="0.8" data-face="top"/>
      <path d="M3.2,17 L40.8,17" data-edge="hi"/>
      <path d="M2.6,22 L41.4,22" data-edge="lo"/>

      <!-- 顶部带筋面板：顶面是原稿的圆肩，四条竖筋从圆肩下沿开始 -->
      <rect x="6" y="9" width="32" height="8" data-face="front"/>
      <path d="M8,7 L36,7 C37.1,7 38,7.9 38,9 L6,9 C6,7.9 6.9,7 8,7 Z" data-face="top"/>
      <path d="M8,7 L36,7 C37.1,7 38,7.9 38,9" data-edge="hi"/>
      <path d="M6,17 L38,17" data-edge="lo"/>
      <path d="M12,9 L12,17" data-edge="lo" stroke-width="1.1"/>
      <path d="M18,9 L18,17" data-edge="lo" stroke-width="1.1"/>
      <path d="M26,9 L26,17" data-edge="lo" stroke-width="1.1"/>
      <path d="M32,9 L32,17" data-edge="lo" stroke-width="1.1"/>

      <path d="M16,0 L28,0 C29.1,0 30,0.9 30,2 L30,7 L14,7 L14,2 C14,0.9 14.9,0 16,0 Z" data-face="cap"/>
      <path d="M14,2 C14,0.9 14.9,0 16,0 L28,0 C29.1,0 30,0.9 30,2" data-edge="hi"/>
    </g>
  </svg>`,
  },
  water_high_pressure_pump: {
    icon25d: `<svg viewBox="0 0 106 78" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="53" cy="76.4" rx="45" ry="1.3" data-shadow="1"/>

      <!-- 底板：台面用 deck，四角各一颗地脚螺栓 -->
      <rect x="5" y="73" width="40" height="3" data-face="front"/>
      <rect x="5" y="72" width="40" height="1" data-face="deck"/>
      <path d="M5,72 L45,72" data-edge="hi"/>
      <path d="M5,76 L45,76" data-edge="lo"/>
      <circle cx="8.5" cy="74.4" r="0.55" data-edge="lo"/>
      <circle cx="41.5" cy="74.4" r="0.55" data-edge="lo"/>
      <rect x="86" y="73" width="18" height="3" data-face="front"/>
      <rect x="86" y="72" width="18" height="1" data-face="deck"/>
      <path d="M86,72 L104,72" data-edge="hi"/>
      <path d="M86,76 L104,76" data-edge="lo"/>
      <circle cx="89" cy="74.4" r="0.55" data-edge="lo"/>
      <circle cx="101" cy="74.4" r="0.55" data-edge="lo"/>

      <rect x="93" y="58" width="4" height="14" data-face="front"/>
      <path d="M93,58 L93,72" data-edge="hi"/>

      <polygon points="19,63 31,63 39,72 11,72" data-face="front"/>
      <path d="M19,63 L11,72" data-edge="hi"/>

      <!-- 电机：去掉左右两条通高边线，只留底缘 -->
      <rect x="11" y="10" width="28" height="53" rx="5" data-face="body"/>
      <path d="M12.5,62.6 C18,63.4 32,63.4 37.5,62.6" data-edge="lo"/>
      <rect x="18" y="4" width="14" height="7" data-face="front"/>
      <path d="M18,4 L18,10" data-edge="hi"/>
      <rect x="8" y="1.6" width="34" height="2.4" rx="1.2" data-face="front"/>
      <rect x="8" y="0" width="34" height="1.6" rx="0.8" data-face="top"/>
      <path d="M8,0 L42,0" data-edge="hi"/>
      <circle cx="11.6" cy="3" r="0.55" data-edge="lo"/>
      <circle cx="38.4" cy="3" r="0.55" data-edge="lo"/>

      <!-- 进口端头与短管 -->
      <rect x="0" y="20" width="6" height="33" rx="3" data-face="body"/>
      <ellipse cx="3" cy="21.2" rx="3" ry="1.2" data-face="cap"/>
      <path d="M0,21.2 A3,1.2 0 0 1 6,21.2" data-edge="hi"/>
      <rect x="6" y="28" width="6" height="17" data-face="barrel"/>
      <path d="M6,28 L12,28" data-edge="hi"/>
      <path d="M6,45 L12,45" data-edge="lo"/>

      <!-- 斜置连接体 -->
      <polygon points="39,20 50,14 50,59 39,53" data-face="front"/>
      <path d="M39,20 L50,14" data-edge="hi"/>

      <!-- 联轴器 -->
      <rect x="50" y="6" width="8" height="61" rx="4" data-face="body"/>
      <ellipse cx="54" cy="7.6" rx="4" ry="1.5" data-face="cap"/>
      <path d="M51,66.4 C53,67.2 55,67.2 57,66.4" data-edge="lo"/>

      <!-- 泵头：筒身只留上下轮廓，法兰块的三道台阶与螺栓保留 -->
      <rect x="58" y="13" width="28" height="47" data-face="barrel"/>
      <path d="M58,13 L86,13" data-edge="hi"/>
      <path d="M58,60 L86,60" data-edge="lo"/>
      <rect x="58" y="22" width="13" height="29" data-face="side"/>
      <rect x="58" y="31" width="13" height="11" data-face="front"/>
      <path d="M58,22 L71,22" data-edge="hi"/>
      <path d="M58,51 L71,51" data-edge="lo"/>
      <path d="M58,31 L71,31" data-edge="hi"/>
      <path d="M58,42 L71,42" data-edge="lo"/>
      <circle cx="60.6" cy="28.4" r="0.55" data-edge="lo"/>
      <circle cx="68.4" cy="28.4" r="0.55" data-edge="lo"/>
      <circle cx="60.6" cy="45.2" r="0.55" data-edge="lo"/>
      <circle cx="68.4" cy="45.2" r="0.55" data-edge="lo"/>

      <!-- 出口腔与顶部小接管 -->
      <path d="M86,32 L97,32 C100.9,32 104,35.1 104,39 L104,51 C104,54.9 100.9,58 97,58 L86,58 Z" data-face="front"/>
      <path d="M86,32 L97,32" data-edge="hi"/>
      <path d="M86,58 L97,58" data-edge="lo"/>
      <rect x="92" y="18" width="6" height="15" rx="2" data-face="body"/>
      <ellipse cx="95" cy="19" rx="3" ry="1.1" data-face="cap"/>
      <path d="M92,19 A3,1.1 0 0 1 98,19" data-edge="hi"/>
      <rect x="94" y="28" width="2" height="5" data-face="front"/>
      <path d="M94,28 L94,33" data-edge="hi"/>
      <rect x="93" y="46" width="6" height="6" data-face="front"/>
      <path d="M93,46 L99,46" data-edge="hi"/>
      <path d="M93,52 L99,52" data-edge="lo"/>
    </g>
  </svg>`,
  },
  water_booster_pump: {
    icon25d: `<svg viewBox="0 0 73 98" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="34" cy="96.6" rx="27" ry="1.3" data-shadow="1"/>

      <!-- 胶囊机身：两端整圆只用左上的亮弧与右下的暗弧交代体积 -->
      <rect x="12" y="9" width="21" height="79" rx="10.5" data-face="body"/>
      <path d="M12,19.5 A10.5,10.5 0 0 1 22.5,9" data-edge="hi"/>
      <path d="M33,77.5 A10.5,10.5 0 0 1 22.5,88" data-edge="lo"/>

      <!-- 上下卡箍是同轴的短颈，用与罐身一致的柱面；竖边不描线（暗底上会变成一根悬空白条），
           只保留底缘那条平头暗弧交代颈肩交界 -->
      <path d="M15,4 L29,4 L29,11 C24.66,8.52 19.34,8.52 15,11 Z" data-face="body"/>
      <path d="M15,11 C19.34,8.52 24.66,8.52 29,11" data-edge="lo" stroke-linecap="butt"/>

      <!-- 盖板：顶面单独占一条窄面，正面到板底；顶面若只画成嵌在板里的细亮条会读成开槽 -->
      <rect x="9" y="0" width="26" height="4" rx="2" data-face="front"/>
      <rect x="9" y="0" width="26" height="1.6" rx="0.8" data-face="top"/>
      <path d="M11,0 L33,0" data-edge="hi"/>
      <path d="M11,4 L33,4" data-edge="lo"/>

      <path d="M15,92 L29,92 L29,86 C24.66,88.48 19.34,88.48 15,86 Z" data-face="body"/>
      <path d="M15,86 C19.34,88.48 24.66,88.48 29,86" data-edge="lo" stroke-linecap="butt"/>

      <rect x="9" y="92" width="26" height="4" rx="2" data-face="front"/>
      <rect x="9" y="92" width="26" height="1.6" rx="0.8" data-face="top"/>
      <path d="M11,92 L33,92" data-edge="hi"/>
      <path d="M11,96 L33,96" data-edge="lo"/>

      <!-- 右侧立管与泵体：原稿的圆角在右端，左缘贴着胶囊。
           右上圆角落在背光侧，只留右下暗弧；给右上补亮线会变成一条悬空的白钩 -->
      <path d="M35,22 L33,22 L33,75 L35,75 C37.21,75 39,73.21 39,71 L39,26 C39,23.79 37.21,22 35,22 Z" data-face="body"/>
      <path d="M39,71 C39,73.21 37.21,75 35,75" data-edge="lo"/>

      <path d="M53,33 L39,33 L39,64 L53,64 C55.21,64 57,62.21 57,60 L57,37 C57,34.79 55.21,33 53,33 Z" data-face="barrel"/>
      <path d="M39,33 L53,33" data-edge="hi"/>
      <path d="M39,64 L53,64" data-edge="lo"/>

      <!-- 台阶盘：两段盘由后向前逐段提亮（背光面→正面），与高压泵同一配方；
           右缘那道竖线是原稿区分盘面与泵壳的轮廓，不画就被泵壳吞掉。
           棱线用平头端点：圆头会各自伸出盘面 0.7，小尺寸下读成一排短棒 -->
      <rect x="39" y="38" width="8" height="21" data-face="side"/>
      <path d="M39,38 L47,38" data-edge="hi" stroke-linecap="butt"/>
      <path d="M39,59 L47,59" data-edge="lo" stroke-linecap="butt"/>
      <rect x="39" y="45" width="8" height="7" data-face="front"/>
      <path d="M39,45 L47,45" data-edge="hi" stroke-linecap="butt"/>
      <path d="M39,52 L47,52" data-edge="lo" stroke-linecap="butt"/>
      <path d="M47,33 L47,64" data-edge="lo" stroke-width="1.2" stroke-linecap="butt"/>

      <path d="M58,37 L58,60 C59.66,60 61,58.66 61,57 L61,40 C61,38.34 59.66,37 58,37 Z" data-face="body"/>
      <path d="M61,57 C61,58.66 59.66,60 58,60" data-edge="lo"/>

      <path d="M68.5,46 L62,46 L62,51 L68.5,51 C69.88,51 71,49.88 71,48.5 C71,47.12 69.88,46 68.5,46 Z" data-face="barrel"/>
      <path d="M62,46 L68.5,46" data-edge="hi"/>
      <path d="M62,51 L68.5,51" data-edge="lo"/>

      <!-- 左侧接管与连接座 -->
      <rect x="0" y="29" width="6" height="39" rx="3" data-face="body"/>
      <path d="M0,32 A3,3 0 0 1 3,29" data-edge="hi"/>
      <path d="M6,65 A3,3 0 0 1 3,68" data-edge="lo"/>
      <rect x="6" y="38" width="6" height="21" data-face="front"/>
      <path d="M6,38 L12,38" data-edge="hi"/>
      <path d="M6,59 L12,59" data-edge="lo"/>
    </g>
  </svg>`,
  },
  water_roots_blower: {
    icon25d: `<svg viewBox="0 0 113 93" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="56" cy="91.5" rx="48" ry="1.2" data-shadow="1"/>

      <!-- 左翼：连接板、圆角侧板、台阶盘、外端盖（原稿的四层结构） -->
      <rect x="24" y="3" width="8" height="75" data-face="side"/>
      <path d="M24,3 L14.21,7.89 C12.86,8.57 12,9.96 12,11.47 L12,69.53 C12,71.04 12.86,72.43 14.21,73.11 L24,78 Z" data-face="body"/>
      <path d="M24,3 L14.21,7.89 C12.86,8.57 12,9.96 12,11.47" data-edge="hi"/>
      <rect x="12" y="15" width="12" height="51" data-face="side"/>
      <rect x="12" y="24" width="12" height="33" data-face="front"/>
      <rect x="12" y="35" width="12" height="11" data-face="top"/>
      <path d="M12,15 L24,15" data-edge="hi"/>
      <path d="M12,24 L24,24" data-edge="hi"/>
      <path d="M12,35 L24,35" data-edge="hi"/>
      <path d="M12,46 L24,46" data-edge="lo"/>
      <path d="M12,57 L24,57" data-edge="lo"/>
      <path d="M12,66 L24,66" data-edge="lo"/>
      <path d="M4,14 L12,14 L12,67 L4,67 C1.79,67 0,65.21 0,63 L0,18 C0,15.79 1.79,14 4,14 Z" data-face="front"/>
      <path d="M0,18 C0,15.79 1.79,14 4,14 L12,14" data-edge="hi"/>
      <path d="M0,63 C0,65.21 1.79,67 4,67 L12,67" data-edge="lo"/>

      <!-- 右翼：镜像结构，外缘在右 -->
      <rect x="91" y="3" width="8" height="75" data-face="side"/>
      <path d="M99,3 L108.79,7.89 C110.14,8.57 111,9.96 111,11.47 L111,69.53 C111,71.04 110.14,72.43 108.79,73.11 L99,78 Z" data-face="body"/>
      <path d="M99,3 L108.79,7.89 C110.14,8.57 111,9.96 111,11.47" data-edge="hi"/>
      <rect x="99" y="15" width="12" height="51" data-face="side"/>
      <rect x="99" y="24" width="12" height="33" data-face="front"/>
      <rect x="99" y="35" width="12" height="11" data-face="top"/>
      <path d="M99,15 L111,15" data-edge="hi"/>
      <path d="M99,24 L111,24" data-edge="hi"/>
      <path d="M99,35 L111,35" data-edge="hi"/>
      <path d="M99,46 L111,46" data-edge="lo"/>
      <path d="M99,57 L111,57" data-edge="lo"/>
      <path d="M99,66 L111,66" data-edge="lo"/>

      <!-- 底脚：短腿先画、横梁后压住腿脚，顶面收在横梁轮廓内 -->
      <rect x="36" y="81" width="12" height="6" data-face="front"/>
      <rect x="75" y="81" width="12" height="6" data-face="front"/>
      <rect x="28" y="87" width="28" height="4" rx="2" data-face="front"/>
      <rect x="30" y="87" width="24" height="0.8" rx="0.4" data-face="top"/>
      <path d="M30,87 L54,87" data-edge="hi"/>
      <path d="M28,91 L56,91" data-edge="lo"/>
      <rect x="67" y="87" width="28" height="4" rx="2" data-face="front"/>
      <rect x="69" y="87" width="24" height="0.8" rx="0.4" data-face="top"/>
      <path d="M69,87 L93,87" data-edge="hi"/>
      <path d="M67,91 L95,91" data-edge="lo"/>

      <!-- 机体：上盖与箱身分开，盖/身接缝只留一条横线；上盖轮廓沿用原稿的 r4 圆角 -->
      <path d="M36,0 L87,0 C89.21,0 91,1.79 91,4 L91,15 L32,15 L32,4 C32,1.79 33.79,0 36,0 Z" data-face="front"/>
      <path d="M32,15 L91,15" data-edge="lo"/>
      <path d="M32,15 L91,15 L91,77 C91,79.21 89.21,81 87,81 L36,81 C33.79,81 32,79.21 32,77 Z" data-face="front"/>
      <path d="M32,81 L91,81" data-edge="lo"/>

      <!-- 顶盖检修口：与上盖同面，中间保留原稿的实心亮条（凸起的分缝条） -->
      <rect x="47" y="1.6" width="29" height="13.4" data-face="front"/>
      <path d="M47,1.6 L47,15" data-edge="lo" stroke-width="1.1"/>
      <path d="M76,1.6 L76,15" data-edge="lo" stroke-width="1.1"/>
      <rect x="61" y="1.6" width="2" height="13.4" data-face="top"/>
      <path d="M61,1.6 L61,15" data-edge="hi" stroke-width="1.1"/>
      <path d="M63,1.6 L63,15" data-edge="lo"/>

      <!-- 盖顶亮带最后画：外缘贴着原稿顶轮廓，跨过检修口不断开 -->
      <path d="M36,0 L87,0 C88.4,0 89.5,0.6 90.2,1.6 L33.8,1.6 C34.5,0.6 35.6,0 36,0 Z" data-face="top"/>
      <path d="M36,0 L87,0" data-edge="hi" stroke-width="1.2"/>

      <!-- 端面圆盖：外盘与箱身同为中等受光，只靠上下弧分界；内盘是凸起的轴毂，最亮 -->
      <circle cx="61.5" cy="47.5" r="22.5" data-face="front"/>
      <path d="M39,47.5 A22.5,22.5 0 0 1 61.5,25" data-edge="hi"/>
      <path d="M61.5,70 A22.5,22.5 0 0 0 84,47.5" data-edge="lo"/>
      <circle cx="61.5" cy="47.5" r="11.5" data-face="cap"/>
      <path d="M50,47.5 A11.5,11.5 0 0 1 61.5,36" data-edge="hi"/>
      <path d="M61.5,59 A11.5,11.5 0 0 0 73,47.5" data-edge="lo"/>
      <circle cx="61.5" cy="30.5" r="2.5" data-face="cap"/>
      <circle cx="73.52" cy="35.48" r="2.5" data-face="cap"/>
      <circle cx="78.5" cy="47.5" r="2.5" data-face="cap"/>
      <circle cx="73.52" cy="59.52" r="2.5" data-face="cap"/>
      <circle cx="61.5" cy="64.5" r="2.5" data-face="cap"/>
      <circle cx="49.48" cy="59.52" r="2.5" data-face="cap"/>
      <circle cx="44.5" cy="47.5" r="2.5" data-face="cap"/>
      <circle cx="49.48" cy="35.48" r="2.5" data-face="cap"/>
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
      icon25d: art.icon25d,
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
