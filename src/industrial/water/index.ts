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
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="30" cy="84.8" rx="26" ry="1.6" data-shadow="1"/>

      <rect x="6.1" y="2" width="35.8" height="39.4" data-face="body"/>
      <ellipse cx="24" cy="2" rx="17.9" ry="2.6" data-face="cap"/>
      <ellipse cx="24" cy="2" rx="17.9" ry="2.6" data-edge="hi"/>
      <path d="M6.1 2 L6.1 41.4" data-edge="hi"/>
      <path d="M41.9 2 L41.9 41.4" data-edge="lo"/>
      <path d="M6.1 9.7 L41.9 9.7" data-edge="lo" stroke-width="1.1"/>
      <path d="M10 10.2 L10 41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M14 10.2 L14 41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M18 10.2 L18 41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M22 10.2 L22 41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M26 10.2 L26 41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M30 10.2 L30 41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M34 10.2 L34 41.4" data-edge="lo" stroke-width="1.1"/>
      <path d="M38 10.2 L38 41.4" data-edge="lo" stroke-width="1.1"/>

      <rect x="0" y="12.1" width="6.2" height="27.9" data-face="front"/>
      <path d="M0 12.1 L0 40" data-edge="hi"/>
      <path d="M6.2 12.1 L6.2 40" data-edge="lo"/>

      <polygon points="5.5,41.4 41.1,41.4 42.7,39.8 7.1,39.8" data-face="top"/>
      <rect x="5.5" y="41.4" width="35.6" height="2.8" data-face="front"/>
      <path d="M5.5 41.4 L41.1 41.4" data-edge="hi"/>
      <path d="M5.5 44.2 L41.1 44.2" data-edge="lo"/>
      <path d="M9.5 41.4 L9.5 44.2" data-edge="lo" stroke-width="1.1"/>
      <path d="M38.5 41.4 L38.5 44.2" data-edge="lo" stroke-width="1.1"/>

      <polygon points="9.1,54.3 11.8,51.6 43.3,51.6 45.9,54.3 45.9,77.8 43.3,80.4 11.8,80.4 9.1,77.8" data-face="front"/>
      <polygon points="11.8,51.6 43.3,51.6 45.9,49.6 14.5,49.6" data-face="top"/>
      <polygon points="45.9,54.3 47.4,52.8 47.4,76.3 45.9,77.8" data-face="side"/>
      <path d="M11.8 51.6 L43.3 51.6 L45.9 54.3" data-edge="hi"/>
      <path d="M9.1 54.3 L9.1 77.8" data-edge="hi"/>
      <path d="M45.9 54.3 L45.9 77.8" data-edge="lo"/>
      <path d="M9.1 77.8 L11.8 80.4 L43.3 80.4 L45.9 77.8" data-edge="lo"/>
      <rect x="13.4" y="55.6" width="28.2" height="20.8" data-face="hole"/>
      <path d="M13.4 55.6 L41.6 55.6 L41.6 76.4 L13.4 76.4 Z" data-edge="lo" stroke-width="1.1"/>

      <path d="M45.9 61 L53.1 61" data-pipe="base"/>
      <path d="M45.9 60.4 L53.1 60.4" data-pipe="hi"/>
      <path d="M45.9 72 L53.1 72" data-pipe="base"/>
      <path d="M45.9 71.4 L53.1 71.4" data-pipe="hi"/>

      <rect x="53.1" y="58.6" width="9.8" height="14.6" data-face="body"/>
      <ellipse cx="58" cy="58.6" rx="4.9" ry="1.3" data-face="cap"/>
      <ellipse cx="58" cy="58.6" rx="4.9" ry="1.3" data-edge="hi"/>
      <path d="M53.1 58.6 L53.1 73.2" data-edge="hi"/>
      <path d="M62.9 58.6 L62.9 73.2" data-edge="lo"/>
      <rect x="55.5" y="60" width="5" height="12" data-face="hole"/>

      <rect x="56.5" y="49.5" width="3" height="9" data-face="body"/>
      <ellipse cx="58" cy="49.5" rx="4.5" ry="1.4" data-face="cap"/>
      <ellipse cx="58" cy="49.5" rx="4.5" ry="1.4" data-edge="hi"/>
      <path d="M56.5 49.5 L56.5 58.5" data-edge="hi"/>
      <path d="M59.5 49.5 L59.5 58.5" data-edge="lo"/>

      <rect x="56.5" y="74.5" width="3" height="8.5" data-face="body"/>
      <ellipse cx="58" cy="83" rx="4.5" ry="1.4" data-face="cap"/>
      <ellipse cx="58" cy="83" rx="4.5" ry="1.4" data-edge="lo"/>
      <path d="M56.5 74.5 L56.5 83" data-edge="hi"/>
      <path d="M59.5 74.5 L59.5 83" data-edge="lo"/>

      <circle cx="27.5" cy="66" r="4.4" data-face="cap"/>
      <circle cx="27.5" cy="66" r="4.4" data-edge="hi"/>
      <circle cx="27.5" cy="66" r="2.2" data-edge="lo" stroke-width="1.1"/>

      <polygon points="4.5,80.4 45.3,80.4 46.8,78.9 6,78.9" data-face="top"/>
      <rect x="4.5" y="80.4" width="40.8" height="3.7" data-face="front"/>
      <polygon points="45.3,80.4 46.8,78.9 46.8,82.6 45.3,84.1" data-face="side"/>
      <path d="M4.5 80.4 L45.3 80.4" data-edge="hi"/>
      <path d="M4.5 84.1 L45.3 84.1 L46.8 82.6" data-edge="lo"/>
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
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="23" cy="96" rx="20" ry="1.5" data-shadow="1"/>

      <rect x="14" y="0.5" width="16" height="6.5" data-face="front"/>
      <ellipse cx="22" cy="0.5" rx="8" ry="1.6" data-face="cap"/>
      <ellipse cx="22" cy="0.5" rx="8" ry="1.6" data-edge="hi"/>
      <path d="M14 0.5 L14 7" data-edge="hi"/>
      <path d="M30 0.5 L30 7" data-edge="lo"/>

      <polygon points="6,7 38,7 40,5.2 8,5.2" data-face="top"/>
      <rect x="6" y="7" width="32" height="10" data-face="front"/>
      <polygon points="38,7 40,5.2 40,15.2 38,17" data-face="side"/>
      <path d="M6 7 L6 17" data-edge="hi"/>
      <path d="M38 7 L38 17" data-edge="lo"/>
      <path d="M6 17 L38 17" data-edge="lo"/>
      <path d="M12 7 L12 17" data-edge="lo" stroke-width="1.1"/>
      <path d="M32 7 L32 17" data-edge="lo" stroke-width="1.1"/>
      <path d="M18 7 L18 17" data-edge="lo" stroke-width="1.1"/>
      <path d="M26 7 L26 17" data-edge="lo" stroke-width="1.1"/>

      <polygon points="2,17 42,17 44,15 4,15" data-face="top"/>
      <rect x="2" y="17" width="40" height="5" data-face="front"/>
      <polygon points="42,17 44,15 44,20 42,22" data-face="side"/>
      <path d="M2 17 L42 17" data-edge="hi"/>
      <path d="M2 22 L42 22 L44 20" data-edge="lo"/>

      <rect x="5" y="22" width="34" height="46" data-face="front"/>
      <polygon points="39,22 41,20 41,66 39,68" data-face="side"/>
      <path d="M5 22 L5 68" data-edge="hi"/>
      <path d="M39 22 L39 68" data-edge="lo"/>
      <path d="M5 68 L39 68" data-edge="lo"/>
      <path d="M22 22 L22 68" data-edge="lo" stroke-width="1.1"/>

      <polygon points="2,68 42,68 44,66 4,66" data-face="top"/>
      <rect x="2" y="68" width="40" height="5" data-face="front"/>
      <polygon points="42,68 44,66 44,71 42,73" data-face="side"/>
      <path d="M2 68 L42 68" data-edge="hi"/>
      <path d="M2 73 L42 73 L44 71" data-edge="lo"/>

      <polygon points="0,73 44,73 46,71 2,71" data-face="top"/>
      <rect x="0" y="73" width="44" height="5" data-face="front"/>
      <path d="M0 73 L44 73" data-edge="hi"/>
      <path d="M0 78 L44 78" data-edge="lo"/>

      <rect x="7" y="78" width="30" height="15" data-face="front"/>
      <polygon points="37,78 39,76 39,91 37,93" data-face="side"/>
      <path d="M7 78 L7 93" data-edge="hi"/>
      <path d="M37 78 L37 93" data-edge="lo"/>
      <path d="M7 93 L37 93" data-edge="lo"/>
      <path d="M13 78 L13 93" data-edge="lo" stroke-width="1.1"/>
      <path d="M31 78 L31 93" data-edge="lo" stroke-width="1.1"/>
      <path d="M19 78 L19 93" data-edge="lo" stroke-width="1.1"/>
      <path d="M25 78 L25 93" data-edge="lo" stroke-width="1.1"/>

      <polygon points="2,93 42,93 44,91 4,91" data-face="top"/>
      <rect x="2" y="93" width="40" height="4" data-face="front"/>
      <polygon points="42,93 44,91 44,95 42,97" data-face="side"/>
      <path d="M2 93 L42 93" data-edge="hi"/>
      <path d="M2 97 L42 97 L44 95" data-edge="lo"/>
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
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="33" cy="95" rx="20" ry="1.6" data-shadow="1"/>

      <polygon points="9,0 35,0 36.5,1.5 10.5,1.5" data-face="top"/>
      <rect x="9" y="1.5" width="26" height="2.5" data-face="front"/>
      <polygon points="35,1.5 36.5,1.5 36.5,4 35,4" data-face="side"/>
      <path d="M9 0 L35 0" data-edge="hi"/>
      <path d="M9 4 L35 4" data-edge="lo"/>

      <path d="M15,4 L29,4 L29,11 C24.7,8.5 19.3,8.5 15,11 Z" data-face="front"/>
      <path d="M15 4 L15 11" data-edge="hi"/>
      <path d="M29 4 L29 11" data-edge="lo"/>

      <rect x="12" y="9" width="21" height="79" data-face="body"/>
      <ellipse cx="22.5" cy="9" rx="10.5" ry="2.6" data-face="cap"/>
      <ellipse cx="22.5" cy="9" rx="10.5" ry="2.6" data-edge="hi"/>
      <path d="M12 9 L12 88" data-edge="hi"/>
      <path d="M33 9 L33 88" data-edge="lo"/>

      <path d="M15,86 L29,86 L29,92 C24.7,89.5 19.3,89.5 15,92 Z" data-face="front"/>
      <path d="M15 86 L15 92" data-edge="lo"/>
      <path d="M29 86 L29 92" data-edge="lo"/>

      <polygon points="9,92 35,92 36.5,93.5 10.5,93.5" data-face="top"/>
      <rect x="9" y="93.5" width="26" height="2.5" data-face="front"/>
      <path d="M9 96 L35 96" data-edge="lo"/>

      <rect x="33" y="22" width="6" height="53" data-face="side"/>
      <path d="M33 22 L33 75" data-edge="lo"/>

      <path d="M43,33 L57,33 L57,64 L43,64 C40.8,64 39,62.2 39,60 L39,37 C39,34.8 40.8,33 43,33 Z" data-face="front"/>
      <polygon points="43,33 57,33 59,31 45,31" data-face="top"/>
      <polygon points="57,33 59,31 59,62 57,64" data-face="side"/>
      <path d="M39 37 C39 34.8 40.8 33 43 33" data-edge="hi"/>
      <path d="M39 60 C39 62.2 40.8 64 43 64 L57 64" data-edge="lo"/>
      <path d="M57 33 L57 64" data-edge="lo"/>
      <path d="M39 38 L47 38 L47 59 L39 59" data-edge="lo" stroke-width="1.1"/>
      <path d="M39 45 L47 45 L47 52 L39 52" data-edge="lo" stroke-width="1.1"/>

      <rect x="58" y="37" width="3" height="23" data-face="body"/>
      <path d="M58 37 L58 60" data-edge="hi"/>
      <path d="M61 37 L61 60" data-edge="lo"/>
      <rect x="62" y="46" width="9" height="5" data-face="barrel"/>
      <ellipse cx="62" cy="48.5" rx="1.3" ry="2.5" data-face="hole"/>
      <path d="M62 46 L71 46" data-edge="hi"/>
      <path d="M71 46 L71 51" data-edge="lo"/>

      <rect x="0" y="29" width="6" height="39" rx="3" data-face="body"/>
      <ellipse cx="3" cy="29" rx="3" ry="1.2" data-face="cap"/>
      <ellipse cx="3" cy="29" rx="3" ry="1.2" data-edge="hi"/>
      <path d="M0 29 L0 68" data-edge="hi"/>
      <path d="M6 29 L6 68" data-edge="lo"/>
      <rect x="6" y="38" width="6" height="21" data-face="front"/>
    </g>
  </svg>`,
  },
  water_roots_blower: {
    icon25d: `<svg viewBox="0 0 113 93" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="56" cy="90.5" rx="42" ry="1.8" data-shadow="1"/>

      <rect x="32" y="15" width="59" height="66" data-face="front"/>
      <path d="M36,2 L87,2 C89.2,2 91,3.8 91,6 L91,15 L32,15 L32,6 C32,3.8 33.8,2 36,2 Z" data-face="body"/>
      <polygon points="32,2 91,2 93,0 34,0" data-face="top"/>
      <polygon points="91,2 93,0 93,13 91,15" data-face="side"/>
      <path d="M32 2 L32 15" data-edge="hi"/>
      <path d="M91 2 L91 15" data-edge="lo"/>
      <path d="M32 15 L32 81" data-edge="hi"/>
      <path d="M91 15 L91 81" data-edge="lo"/>
      <path d="M32 81 L91 81" data-edge="lo"/>

      <rect x="47" y="0" width="29" height="15" data-face="front"/>
      <path d="M47 0 L76 0" data-edge="hi"/>
      <path d="M47 0 L47 15" data-edge="hi"/>
      <path d="M76 0 L76 15" data-edge="lo"/>

      <circle cx="61.5" cy="47.5" r="22.5" data-face="cap"/>
      <circle cx="61.5" cy="47.5" r="22.5" data-edge="hi"/>
      <circle cx="61.5" cy="47.5" r="11.5" data-face="front"/>
      <circle cx="61.5" cy="47.5" r="11.5" data-edge="lo"/>
      <circle cx="61.5" cy="47.5" r="2.5" data-face="hole"/>
      <circle cx="73.52" cy="35.48" r="2.2" data-face="hole"/>
      <circle cx="78.5" cy="47.5" r="2.2" data-face="hole"/>
      <circle cx="73.52" cy="59.52" r="2.2" data-face="hole"/>
      <circle cx="61.5" cy="64.5" r="2.2" data-face="hole"/>
      <circle cx="49.48" cy="59.52" r="2.2" data-face="hole"/>
      <circle cx="44.5" cy="47.5" r="2.2" data-face="hole"/>
      <circle cx="49.48" cy="35.48" r="2.2" data-face="hole"/>

      <rect x="91" y="3" width="8" height="75" data-face="side"/>
      <path d="M99,3 L108.8,7.9 C110.1,8.6 111,9.96 111,11.5 L111,69.5 C111,71 110.1,72.4 108.8,73.1 L99,78 Z" data-face="body"/>
      <rect x="99" y="15" width="12" height="51" data-face="front"/>
      <rect x="99" y="24" width="12" height="33" data-face="side"/>
      <rect x="99" y="35" width="12" height="11" data-face="front"/>
      <path d="M91 3 L91 78" data-edge="hi"/>
      <path d="M99 3 L99 78" data-edge="lo"/>
      <path d="M99 15 L111 15" data-edge="hi"/>
      <path d="M99 66 L111 66" data-edge="lo"/>

      <rect x="24" y="3" width="8" height="75" data-face="side"/>
      <path d="M13,3 L3.2,7.9 C1.9,8.6 1,9.96 1,11.5 L1,69.5 C1,71 1.9,72.4 3.2,73.1 L13,78 Z" data-face="body"/>
      <rect x="12" y="15" width="12" height="51" data-face="front"/>
      <rect x="12" y="24" width="12" height="33" data-face="side"/>
      <rect x="12" y="35" width="12" height="11" data-face="front"/>
      <path d="M24 3 L24 78" data-edge="lo"/>
      <path d="M12 15 L24 15" data-edge="hi"/>
      <path d="M12 66 L24 66" data-edge="lo"/>

      <path d="M4,14 L12,14 L12,67 L4,67 C1.8,67 0,65.2 0,63 L0,18 C0,15.8 1.8,14 4,14 Z" data-face="front"/>
      <path d="M0 18 L0 63" data-edge="hi"/>

      <polygon points="28,87 56,87 57.5,85.5 29.5,85.5" data-face="top"/>
      <rect x="28" y="87" width="28" height="4" rx="2" data-face="front"/>
      <polygon points="67,87 95,87 96.5,85.5 68.5,85.5" data-face="top"/>
      <rect x="67" y="87" width="28" height="4" rx="2" data-face="front"/>
      <rect x="36" y="81" width="12" height="6" data-face="front"/>
      <rect x="75" y="81" width="12" height="6" data-face="front"/>
      <path d="M28 91 L56 91" data-edge="lo"/>
      <path d="M67 91 L95 91" data-edge="lo"/>
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
