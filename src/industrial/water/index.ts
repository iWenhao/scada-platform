import type { ComponentDefinition } from '@/types/scada'
import { buildAssetComponents, withIllustrations } from '../assetComponents'
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
      <ellipse cx="58" cy="96.5" rx="24" ry="1.3" data-shadow="1"/>

      <!-- 电机：同轴竖圆柱，上下端被颈圈包住，不另画端面 -->
      <rect x="52" y="9" width="16" height="79" rx="8" data-face="body"/>

      <!-- 上下颈圈：与电机同轴的短颈；竖边不描线（暗底上会成悬空白条），
           只留贴住端盖的凹弧。下颈圈原稿是绕瓶底的托环，镜像后顶缘向下凹 -->
      <path d="M55,4 L65,4 L65,11 C62.08,8.66 57.92,8.66 55,11 Z" data-face="body"/>
      <path d="M55,11 C57.92,8.66 62.08,8.66 65,11" data-edge="lo" stroke-linecap="butt"/>
      <path d="M55,92 L65,92 L65,86 C62.08,88.34 57.92,88.34 55,86 Z" data-face="body"/>
      <path d="M55,86 C57.92,88.34 62.08,88.34 65,86" data-edge="lo" stroke-linecap="butt"/>

      <!-- 端盖板：正面到板底，顶面占顶部一条；圆角沿用原稿 r2 -->
      <rect x="47" y="0" width="26" height="4" rx="2" data-face="front"/>
      <rect x="47" y="0" width="26" height="1.6" rx="0.8" data-face="top"/>
      <path d="M49,0 L71,0" data-edge="hi"/>
      <path d="M49,4 L71,4" data-edge="lo"/>

      <rect x="47" y="92" width="26" height="4" rx="2" data-face="front"/>
      <rect x="47" y="92" width="26" height="1.6" rx="0.8" data-face="top"/>
      <path d="M49,92 L71,92" data-edge="hi"/>
      <path d="M49,96 L71,96" data-edge="lo"/>

      <!-- 护罩：贴在电机前的薄板，看到的是它朝左的窄边，属受光侧 -->
      <path d="M50,18 L52,18 L52,79 L50,79 C48.9,79 48,78.1 48,77 L48,20 C48,18.9 48.9,18 50,18 Z" data-face="front"/>

      <!-- 传动轴 -->
      <rect x="32" y="29" width="4" height="39" rx="2" data-face="body"/>

      <!-- 泵壳：卧式筒体；左端是原稿那块实心圆头端板，画成朝左的竖直面（受光侧），
           不再用薄椭圆——5 单位宽的椭圆在暗底上会读成一只悬空的白环 -->
      <path d="M14,33 L15,33 L15,64 L14,64 C11.79,64 10,62.21 10,60 L10,37 C10,34.79 11.79,33 14,33 Z" data-face="front"/>
      <rect x="15" y="33" width="17" height="31" data-face="barrel"/>
      <path d="M15,33 L32,33" data-edge="hi"/>
      <path d="M15,64 L32,64" data-edge="lo"/>

      <!-- 进口接管：左端圆头的实心短管，原稿末端不开口 -->
      <path d="M2.5,46 L10,46 L10,51 L2.5,51 C1.12,51 0,49.88 0,48.5 C0,47.12 1.12,46 2.5,46 Z" data-face="barrel"/>
      <path d="M2.5,46 L10,46" data-edge="hi"/>
      <path d="M2.5,51 L10,51" data-edge="lo"/>

      <!-- 护罩支撑板：前窄后宽的梯形，只给上斜棱受光 -->
      <polygon points="36,31 48,21 48,76 36,66" data-face="side"/>
      <path d="M36,31 L48,21" data-edge="hi"/>
      <path d="M36,66 L48,76" data-edge="lo"/>

      <!-- 联轴器与中间的凸环 -->
      <rect x="36" y="39" width="12" height="19" data-face="front"/>
      <rect x="36" y="39" width="12" height="2" data-face="top"/>
      <path d="M36,39 L48,39" data-edge="hi"/>
      <path d="M36,58 L48,58" data-edge="lo"/>
      <rect x="36" y="46" width="12" height="5" data-face="front"/>
      <rect x="36" y="46" width="12" height="1.6" data-face="top"/>
      <path d="M36,46 L48,46" data-edge="hi"/>
      <path d="M36,51 L48,51" data-edge="lo"/>

      <!-- 出口接管：横卧短管（筒面），顶部受光 -->
      <rect x="68" y="39" width="6" height="19" data-face="barrel"/>
      <path d="M68,39 L74,39" data-edge="hi"/>
      <path d="M68,58 L74,58" data-edge="lo"/>

      <rect x="74" y="30" width="5" height="37" rx="2.5" data-face="body"/>
      <ellipse cx="76.5" cy="31.2" rx="2.5" ry="1.2" data-face="cap"/>
      <path d="M74,31.2 A2.5,1.2 0 0 1 79,31.2" data-edge="hi"/>
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
      <polygon points="39,6.4 58,19.5 60,18 41,4.9" data-face="side"/>>
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
  /**
   * 格栅：箱体 + 一根斜插出箱顶的栅条。栅条是贴在前面的平板，用 `front` 不是 `cap`
   * ——斜置的细长条一走径向渐变就会读成一根圆管。内框与实心楔块用 `side`（暗面）
   * 表达镂空，不用 `hole`：hole 叠在受光面上是加亮，看起来像一块亮斑。
   */
  water_bar_screen: {
    icon25d: `<svg viewBox="0 0 82 82" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="40" cy="78.9" rx="37" ry="1.1" data-shadow="1"/>

      <!-- 箱体：正面 + 顶面窄带，四边棱线分亮/暗 -->
      <path d="M1,28 H79 A1,1 0 0 1 80,29 V79 A1,1 0 0 1 79,80 H1 A1,1 0 0 1 0,79 V29 A1,1 0 0 1 1,28 Z" data-face="front"/>
      <path d="M1,28 H79 A1,1 0 0 1 80,29 V29.9 H0 V29 A1,1 0 0 1 1,28 Z" data-face="top"/>
      <path d="M0,28 H80" data-edge="hi"/>
      <path d="M0,80 H80" data-edge="lo"/>
      <path d="M0,28 V80" data-edge="hi"/>
      <path d="M80,28 V80" data-edge="lo"/>

      <!-- 栅条：倾斜的平板朝上迎光，用 top 而非 front——与箱体同色就分不出前后 -->
      <path d="M17.3744985,71.4768907 L45.6782227,0.629009681 C45.8299807,0.249139838 46.1977976,3.30477984e-15 46.6068594,0 L65.9058056,0 C66.4580903,-1.01453063e-16 66.9058056,0.44771525 66.9058056,1 L66.9058056,7.43205366 C66.9058056,7.98433841 66.4580903,8.43205366 65.9058056,8.43205366 L62.35256,8.43205366 C61.8002753,8.43205366 61.35256,7.98433841 61.35256,7.43205366 L61.35256,6.55828712 C61.35256,6.00600237 60.9048448,5.55828712 60.35256,5.55828712 L51.2954895,5.55828712 C50.8855056,5.55828712 50.5170552,5.80853601 50.365918,6.18964541 L24.1815311,72.2165227 C24.030394,72.5976321 23.6619435,72.847881 23.2519596,72.847881 L18.3031352,72.847881 C17.7508505,72.847881 17.3031352,72.4001658 17.3031352,71.847881 C17.3031352,71.7208066 17.3273551,71.5948966 17.3744985,71.4768907 Z" data-face="top"/>
      <path d="M17.37,71.48 L45.68,0.63" data-edge="hi"/>
      <path d="M24.18,72.22 L50.37,6.19" data-edge="lo"/>
      <rect x="51.3" y="5.56" width="9.05" height="2.87" data-face="side"/>

      <!-- 顶部安装夹板与实心楔块 -->
      <polygon points="56,11 59.2,11 61.27,15.26 66.53,15.26 69.22,11 72,11 72,20 56,20" data-face="front"/>
      <path d="M56,11 H72" data-edge="hi"/>
      <path d="M56,20 H72" data-edge="lo"/>
      <polygon points="59.64,12 68.48,12 66.63,15 61.05,15" data-face="side"/>
    </g>
  </svg>`,
  },
  /**
   * 管道混合器：横卧筒体（`barrel`）+ 中间立式投加颈 + 两侧端板。原稿中心那块实心
   * 方块是电机罩，压暗成 `side`；筒体两端只留接缝棱线，不另切端面。
   */
  water_pipe_mixer: {
    icon25d: `<svg viewBox="0 0 89 61" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="43.5" cy="57.6" rx="40" ry="1.1" data-shadow="1"/>

      <!-- 横卧筒体：左半 / 右半分开，中间留给立颈 -->
      <path d="M10,40.13 H35 V53 H10 Z" data-face="barrel"/>
      <path d="M52,40.13 H77 V53 H52 Z" data-face="barrel"/>
      <path d="M10,40.13 H77" data-edge="hi"/>
      <path d="M10,53 H77" data-edge="lo"/>
      <path d="M10,40.13 V53" data-edge="lo"/>
      <path d="M77,40.13 V53" data-edge="lo"/>

      <!-- 立颈：上口方、下段收成梯形，顶面带受光 -->
      <path d="M38.67,36 V11.54 L28.69,3.94 V2 H58.31 V3.94 L48.33,11.54 V36 Z" data-face="front"/>
      <path d="M28.69,2 H58.31 V0 H28.69 Z" data-face="top"/>
      <path d="M28.69,0 H58.31" data-edge="hi"/>
      <path d="M28.69,2 V3.94 L38.67,11.54" data-edge="hi"/>
      <path d="M58.31,2 V3.94 L48.33,11.54" data-edge="lo"/>

      <!-- 中部加宽段：与立颈同面，底缘带圆角 -->
      <path d="M33,37 C33,36.45 33.45,36 34,36 H53 C53.55,36 54,36.45 54,37 V56 C54,56.55 53.55,57 53,57 H34 C33.45,57 33,56.55 33,56 Z" data-face="front"/>
      <path d="M33,37 V56" data-edge="hi"/>
      <path d="M54,37 V56" data-edge="lo"/>
      <path d="M33,57 H54" data-edge="lo"/>
      <rect x="37.5" y="40.5" width="12" height="12" rx="1" data-face="side"/>

      <!-- 两端端板：竖向圆角块，顶面一条受光窄带 -->
      <rect x="0" y="34.7058716" width="10" height="24" rx="2" data-face="front"/>
      <rect x="0" y="34.7058716" width="10" height="1.8" rx="0.9" data-face="top"/>
      <path d="M0,34.7058716 H10" data-edge="hi"/>
      <path d="M0,58.7058716 H10" data-edge="lo"/>
      <rect x="77" y="34.7058716" width="10" height="24" rx="2" data-face="front"/>
      <rect x="77" y="34.7058716" width="10" height="1.8" rx="0.9" data-face="top"/>
      <path d="M77,34.7058716 H87" data-edge="hi"/>
      <path d="M77,58.7058716 H87" data-edge="lo"/>
    </g>
  </svg>`,
  },
  /**
   * 入口阀：立式阀组。原稿把上下两个箱体、法兰环、驱动头与两根支腿画在同一张正视图里，
   * 这里逐段翻面；左侧折弯接管按「两条臂」拼（原稿是单线，翻面后需要几单位厚度）。
   */
  water_inlet_valve: {
    icon25d: `<svg viewBox="0 0 48 68" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="21.9" cy="66.1" rx="21.5" ry="0.9" data-shadow="1"/>

      <!-- 左侧折弯接管：横竖两段各成一面。整条 L 用一张 front 时，渐变沿整根管的
           横向铺开，亮处全堆在弯头上、横臂向右越走越暗，读成一块受光不均的平板；
           横臂改卧管 barrel（顶受光、底压暗），竖段改立管 body（亮带偏左）。
           竖段先画、上端探到横臂底下被压住，弯头才不会断开 -->
      <path d="M0,25.84 C0,25.03 0.65,24.38 1.46,24.38 H4.91 V28.38 C4.37,28.38 3.94,28.82 3.94,29.36 V40.93 C3.94,42.02 3.06,42.9 1.97,42.9 C0.88,42.9 0,42.02 0,40.93 Z" data-face="body"/>
      <path d="M1.46,24.38 H16.27 V28.38 H0 V25.84 C0,25.03 0.65,24.38 1.46,24.38 Z" data-face="barrel"/>
      <path d="M0,25.84 C0,25.03 0.65,24.38 1.46,24.38 H16.27" data-edge="hi"/>
      <path d="M16.27,28.38 H4.91" data-edge="lo"/>
      <path d="M0,25.84 V40.93" data-edge="hi"/>
      <path d="M3.94,29.36 V40.93" data-edge="lo"/>

      <!-- 上部箱体与法兰环 -->
      <path d="M18.38,4.39 H40.77 C41.84,4.39 42.71,5.27 42.71,6.34 V16.48 H16.43 V6.34 C16.43,5.27 17.3,4.39 18.38,4.39 Z" data-face="front"/>
      <path d="M16.43,6.34 V6 H42.71 V6.34 C42.71,5.27 41.84,4.39 40.77,4.39 H18.38 C17.3,4.39 16.43,5.27 16.43,6.34 Z" data-face="top"/>
      <path d="M16.43,6.34 C16.43,5.27 17.3,4.39 18.38,4.39 H40.77 C41.84,4.39 42.71,5.27 42.71,6.34" data-edge="hi"/>
      <path d="M16.43,16.48 H42.71" data-edge="lo"/>
      <rect x="13.14" y="16.48" width="32.86" height="4.39" rx="0.97" data-face="front"/>
      <rect x="13.14" y="16.48" width="32.86" height="1.5" rx="0.75" data-face="top"/>
      <path d="M13.14,16.48 H46" data-edge="hi"/>
      <path d="M13.14,20.87 H46" data-edge="lo"/>

      <!-- 阀体：下缘圆角沿用原稿 -->
      <path d="M16.43,20.87 H42.71 V34.3 C42.71,35.37 41.84,36.25 40.77,36.25 H18.38 C17.3,36.25 16.43,35.37 16.43,34.3 Z" data-face="front"/>
      <path d="M16.43,20.87 H42.71" data-edge="hi"/>
      <path d="M16.43,36.25 H42.71" data-edge="lo"/>
      <path d="M16.43,20.87 V36.25" data-edge="hi"/>
      <path d="M42.71,20.87 V36.25" data-edge="lo"/>

      <!-- 中段立轴与底座方箱 -->
      <rect x="27.38" y="36.25" width="5.48" height="12.08" data-face="body"/>
      <path d="M27.38,36.25 V48.33" data-edge="hi"/>
      <path d="M32.86,36.25 V48.33" data-edge="lo"/>
      <rect x="21.9" y="48.33" width="16.43" height="13.18" data-face="front"/>
      <rect x="21.9" y="48.33" width="16.43" height="1.6" data-face="top"/>
      <path d="M21.9,48.33 H38.33" data-edge="hi"/>
      <path d="M21.9,61.51 H38.33" data-edge="lo"/>

      <!-- 两根支腿：顶面是自由端，要补一条亮棱，否则像两根往上插进阀体的管子 -->
      <rect x="15.33" y="42.84" width="6.57" height="24.16" rx="0.97" data-face="front"/>
      <path d="M16.3,42.84 H20.93" data-edge="hi"/>
      <path d="M15.33,42.84 V67" data-edge="hi"/>
      <path d="M21.9,42.84 V67" data-edge="lo"/>
      <rect x="38.33" y="42.84" width="5.48" height="24.16" rx="0.97" data-face="front"/>
      <path d="M39.3,42.84 H42.84" data-edge="hi"/>
      <path d="M38.33,42.84 V67" data-edge="hi"/>
      <path d="M43.81,42.84 V67" data-edge="lo"/>

      <!-- 顶部驱动头：原稿的实心圆头，按受光轴帽画 -->
      <path d="M22.94,0 C24.66,0 26.05,1.4 26.05,3.12 V3.9 H19.82 V3.12 C19.82,1.4 21.22,0 22.94,0 Z" data-face="cap"/>
      <path d="M19.82,1.4 C21.5,0.3 24.37,0.3 26.05,1.4" data-edge="hi"/>
    </g>
  </svg>`,
  },
  /**
   * 浓排调节阀：蝶阀符号。圆盘用 `front` + 左右半弧（与风门同口径），两只蝶板各成一面，
   * 阀杆 `body`、轴毂 `cap`；原稿左右蝶板是同一路径镜像，这里按镜像后的坐标各写一份，
   * 避免 transform 把面渐变的方向一起翻过去。
   */
  water_discharge_valve: {
    icon25d: `<svg viewBox="0 0 43 72" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="20.5" cy="68" rx="16" ry="1.1" data-shadow="1"/>

      <!-- 左蝶板 -->
      <path d="M1.26789868,40.3182628 L21.7058824,54.7126437 L1.26789868,69.1070246 C0.904593702,69.3628987 0.402649898,69.2758087 0.146775818,68.9125037 C0.051264482,68.7768911 0,68.6150737 0,68.4492027 L0,40.9760847 C0,40.5317176 0.36023065,40.171487 0.804597676,40.171487 C0.97046867,40.171487 1.1322861,40.2227514 1.26789868,40.3182628 Z" data-face="front"/>
      <path d="M1.27,40.32 L21.71,54.71" data-edge="hi"/>
      <path d="M1.27,69.11 L21.71,54.71" data-edge="lo"/>

      <!-- 右蝶板：左蝶板按 x=20.5 镜像 -->
      <path d="M39.73210132,40.3182628 L19.2941176,54.7126437 L39.73210132,69.1070246 C40.0954063,69.3628987 40.5973501,69.2758087 40.8532242,68.9125037 C40.9487355,68.7768911 41,68.6150737 41,68.4492027 L41,40.9760847 C41,40.5317176 40.6397694,40.171487 40.1954023,40.171487 C40.0295313,40.171487 39.8677139,40.2227514 39.73210132,40.3182628 Z" data-face="front"/>
      <path d="M39.73,40.32 L19.29,54.71" data-edge="hi"/>
      <path d="M39.73,69.11 L19.29,54.71" data-edge="lo"/>

      <!-- 阀杆 -->
      <rect x="19.7" y="30.94" width="1.61" height="22.97" data-face="body"/>
      <path d="M19.7,30.94 V53.91" data-edge="lo"/>

      <!-- 轴毂：两蝶板交汇处的圆角块 -->
      <rect x="17.75" y="51.71" width="5.5" height="6" rx="2.75" data-face="cap"/>

      <!-- 表盘：整圆只铺一张 front 时，横向渐变叠上圆形轮廓会读成一只球；
           把原稿那圈 2 宽描边当作盘缘（侧向不迎光、压暗），内圈铺正面，
           明暗在盘缘处断开，才立得住一块有厚度的平板 -->
      <ellipse cx="20.5" cy="15.6896552" rx="15.6764706" ry="15.6896552" data-face="side"/>
      <ellipse cx="20.5" cy="15.6896552" rx="13.6764706" ry="13.6896552" data-face="front"/>
    </g>
  </svg>`,
  },
  /**
   * 排气阀：蝶阀符号的横置版本，两只蝶板夹一只卧式轴毂（`barrel`）。
   */
  water_exhaust_valve: {
    icon25d: `<svg viewBox="0 0 43 32" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="20.5" cy="28.2" rx="16" ry="1.1" data-shadow="1"/>

      <!-- 左蝶板 -->
      <path d="M1.26789868,0.892975398 L16.2079754,11.4152049 L15.9775052,11.8493777 C14.7480328,14.1655266 14.8038832,16.952802 16.1251517,19.2178401 L1.26789868,29.6817372 C0.904593702,29.9376113 0.402649898,29.8505214 0.146775818,29.4872164 C0.051264482,29.3516038 2.46280399e-15,29.1897864 0,29.0239154 L0,1.55079726 C-2.51757867e-16,1.10643023 0.36023065,0.746199581 0.804597676,0.746199581 C0.97046867,0.746199581 1.1322861,0.797464063 1.26789868,0.892975398 Z" data-face="front"/>
      <path d="M1.27,0.89 L16.21,11.42" data-edge="hi"/>
      <path d="M1.27,29.68 L16.13,19.22" data-edge="lo"/>

      <!-- 右蝶板：按 x=20.5 镜像 -->
      <path d="M39.73210132,0.892975398 L24.7920246,11.4152049 L25.0224948,11.8493777 C26.2519672,14.1655266 26.1961168,16.952802 24.8748483,19.2178401 L39.73210132,29.6817372 C40.0954063,29.9376113 40.5973501,29.8505214 40.8532242,29.4872164 C40.9487355,29.3516038 41,29.1897864 41,29.0239154 L41,1.55079726 C41,1.10643023 40.6397694,0.746199581 40.1954023,0.746199581 C40.0295313,0.746199581 39.8677139,0.797464063 39.73210132,0.892975398 Z" data-face="front"/>
      <path d="M39.73,0.89 L24.79,11.42" data-edge="hi"/>
      <path d="M39.73,29.68 L24.87,19.22" data-edge="lo"/>

      <!-- 轴毂：原稿那圈 2 宽描边就是毂外环，径向或纵向渐变都会把它读成球；
           外环压暗、内圈铺正面，和表盘同一套写法 -->
      <rect x="15" y="9.29" width="10.99" height="12" rx="5.5" data-face="side"/>
      <rect x="17" y="11.29" width="6.99" height="8" rx="3.5" data-face="front"/>
    </g>
  </svg>`,
  },
  /**
   * 二氧化氯发生器：柜体 + 面板 + 支脚 + 侧接管。面板上的显示屏是真正的凹腔——
   * 柜面与面板都按 evenodd 挖穿，屏面 `hole` 最后压上（底下没有受光面，才不会发亮）。
   */
  water_chlorine_dioxide: {
    icon25d: `<svg viewBox="0 0 75 81" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="36.5" cy="77.9" rx="34" ry="1.1" data-shadow="1"/>

      <!-- 柜体：正面按显示屏位置挖穿 -->
      <path d="M13,0 H60 C60.55,0 61,0.45 61,1 V75 C61,75.55 60.55,76 60,76 H13 C12.45,76 12,75.55 12,75 V1 C12,0.45 12.45,0 13,0 Z M24.6,10.6 H48.4 V15.4 H24.6 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M12,0 H61 V1.8 H12 Z" data-face="top"/>
      <path d="M12,0 H61" data-edge="hi"/>
      <path d="M12,0 V76" data-edge="hi"/>
      <path d="M61,0 V76" data-edge="lo"/>
      <path d="M12,76 H61" data-edge="lo"/>
      <path d="M12,34 H61" data-edge="lo"/>

      <!-- 面板：同样挖穿显示屏，内缘留一圈凹缝 -->
      <path d="M21.6,6.6 H51.4 C52,6.6 52.4,7 52.4,7.6 V26.4 C52.4,27 52,27.4 51.4,27.4 H21.6 C21,27.4 20.6,27 20.6,26.4 V7.6 C20.6,7 21,6.6 21.6,6.6 Z M24.6,10.6 H48.4 V15.4 H24.6 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M20.6,6.6 H52.4" data-edge="hi"/>
      <path d="M20.6,27.4 H52.4" data-edge="lo"/>
      <path d="M20.6,6.6 V27.4" data-edge="lo"/>
      <path d="M52.4,6.6 V27.4" data-edge="lo"/>
      <rect x="24.6" y="10.6" width="23.8" height="4.8" data-face="hole"/>
      <rect x="24.6" y="10.6" width="23.8" height="4.8" data-edge="lo"/>

      <!-- 面板上的三条指示窗：原稿的实心短条，压成暗缝 -->
      <path d="M26.83,23.33 H30.17" data-edge="lo"/>
      <path d="M34.83,23.33 H38.17" data-edge="lo"/>
      <path d="M42.83,23.33 H46.17" data-edge="lo"/>

      <!-- 支脚：底部两块实心垫脚 -->
      <path d="M19,77 H29 V79 H19 Z" data-face="front"/>
      <path d="M19,79 H29" data-edge="lo"/>
      <path d="M44,77 H54 V79 H44 Z" data-face="front"/>
      <path d="M44,79 H54" data-edge="lo"/>

      <!-- 左侧上下接管：上段折弯 + 下段 U 形夹箍 -->
      <rect x="3.4" y="48.54" width="3.4" height="15.4" rx="1.7" data-face="front"/>
      <rect x="3.4" y="48.54" width="9.1" height="3.4" rx="1.7" data-face="front"/>
      <path d="M3.4,48.54 H12.5" data-edge="hi"/>
      <path d="M3.4,63.94 H6.8" data-edge="lo"/>
      <rect x="0" y="63.9" width="12.5" height="3" rx="1.5" data-face="front"/>
      <rect x="0" y="67" width="12.5" height="3" rx="1.5" data-face="front"/>
      <rect x="0" y="63.9" width="3" height="6.1" data-face="front"/>
      <path d="M0,63.9 H12.5" data-edge="hi"/>
      <path d="M0,70 H12.5" data-edge="lo"/>

      <!-- 右侧接管：左侧按 x=36.5 镜像 -->
      <rect x="68.2" y="48.54" width="3.4" height="15.4" rx="1.7" data-face="front"/>
      <rect x="63.5" y="48.54" width="9.1" height="3.4" rx="1.7" data-face="front"/>
      <path d="M60.5,48.54 H69.6" data-edge="hi"/>
      <path d="M66.2,63.94 H69.6" data-edge="lo"/>
      <rect x="60.5" y="63.9" width="12.5" height="3" rx="1.5" data-face="front"/>
      <rect x="60.5" y="67" width="12.5" height="3" rx="1.5" data-face="front"/>
      <rect x="70" y="63.9" width="3" height="6.1" data-face="front"/>
      <path d="M60.5,63.9 H73" data-edge="hi"/>
      <path d="M60.5,70 H73" data-edge="lo"/>
    </g>
  </svg>`,
  },
  /**
   * 保安过滤：立式过滤筒。原稿是「圆头筒体 + 两道环缝 + 两条外撇支腿」，
   * 筒体按立式圆柱铺，顶封头单独提亮，支腿补成实心板垫在筒体后面。
   */
  water_security_filter: {
    icon25d: `<svg viewBox="0 0 74 193" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="36" cy="191.2" rx="33" ry="0.8" data-shadow="1"/>

      <!-- 支腿：原稿只画了外撇的折线，翻面后在折线两端补一条上沿闭合成板；
           先画，上端被筒体压住 -->
      <path d="M7.164,166 L1,192 L10.73,192 L25,172.14 Z" data-face="front"/>
      <path d="M7.164,166 L1,192" data-edge="hi"/>
      <path d="M10.73,192 L25,172.14" data-edge="lo"/>
      <path d="M64.836,166 L71,192 L61.27,192 L47,172.14 Z" data-face="front"/>
      <path d="M64.836,166 L71,192" data-edge="hi"/>
      <path d="M61.27,192 L47,172.14" data-edge="lo"/>

      <!-- 筒体：立式圆柱，亮带偏左；上下圆头沿用原稿 r20 -->
      <rect x="1" y="1" width="70" height="171" rx="20" data-face="body"/>

      <!-- 顶封头：环缝（y23.5）以上一段朝上受光，与筒身拉开一档 -->
      <path d="M1,21 A20,20 0 0 1 21,1 H51 A20,20 0 0 1 71,21 V23.5 H1 Z" data-face="top"/>
      <path d="M1,21 A20,20 0 0 1 21,1 H51 A20,20 0 0 1 71,21" data-edge="hi"/>
      <path d="M1,23.5 H71" data-edge="lo"/>
      <path d="M1,155.5 H71" data-edge="lo"/>

      <!-- 筒身两侧的棱线与底封头轮廓 -->
      <path d="M1,23.5 V152" data-edge="hi"/>
      <path d="M71,23.5 V152" data-edge="lo"/>
      <path d="M1,152 A20,20 0 0 0 21,172 H51 A20,20 0 0 0 71,152" data-edge="lo"/>
    </g>
  </svg>`,
  },
  /**
   * 转盘过滤器：箱体正面挂一排竖向滤盘。原稿是「切角箱体 + 11 条上下探出的胶囊」，
   * 胶囊按立式圆筒铺（每条自带一条受光亮棱，否则暗底上筒子两侧都没边），箱体后画。
   */
  water_disc_filter: {
    icon25d: `<svg viewBox="0 0 102 67" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="65.9" rx="46" ry="0.5" data-shadow="1"/>
      <!-- 箱体：四角切斜的正面板，顶面沿切角收一条窄带 -->
      <polygon points="4.013,9 96.037,9 100,12.554 100,53.449 96.017,57 4.019,57 0,53.47 0,12.583" data-face="front"/>
      <polygon points="1.213,11.5 4.013,9 96.037,9 98.787,11.5" data-face="top"/>
      <path d="M0,12.583 L4.013,9 H96.037 L100,12.554" data-edge="hi"/>
      <path d="M0,53.47 L4.019,57 H96.017 L100,53.449" data-edge="lo" stroke-width="1.2"/>

      <!-- 11 条滤盘：胶囊轮廓即圆筒，亮棱贴左侧 -->
      <rect x="6.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M6.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="14.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M14.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="22.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M22.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="30.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M30.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="38.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M38.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="46.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M46.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="54.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M54.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="62.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M62.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="70.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M70.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="78.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M78.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
      <rect x="86.6" y="0.6" width="6.8" height="65.8" rx="3.4" data-face="body"/>
      <path d="M86.6,4 V63" data-edge="hi" stroke-linecap="butt"/>
    </g>
  </svg>`,
  },
  /**
   * 絮团分散机：卧式机组。左侧短轴与右侧横梁按卧管铺，三级同心叠片同为正对面，
   * 靠每级上缘一条亮棱、下缘一条暗缝分层（同色面互叠时只有靠棱线才分得开）。
   */
  water_floc_disperser: {
    icon25d: `<svg viewBox="0 0 104 93" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50.75" cy="90.4" rx="48" ry="0.6" data-shadow="1"/>
      <!-- 底座板 -->
      <rect x="21.333" y="83" width="58" height="8" rx="4" data-face="front"/>
      <rect x="21.333" y="83" width="58" height="2.4" rx="1.2" data-face="top"/>
      <path d="M21.333,83 H79.333" data-edge="hi"/>
      <path d="M21.333,91 H79.333" data-edge="lo"/>

      <!-- 底箱与立柱：先画，被机壳压住上半截 -->
      <polygon points="30.333,65 53.5,65 53.5,74 30.333,74" data-face="front"/>
      <path d="M30.333,74 H53.5" data-edge="lo"/>
      <rect x="30.333" y="74" width="40" height="9" data-face="front"/>
      <rect x="30.333" y="74" width="40" height="2.2" data-face="top"/>
      <path d="M30.333,74 H70.333" data-edge="hi"/>
      <path d="M30.333,83 H70.333" data-edge="lo"/>

      <!-- 机壳：左端 r8 圆角沿用原稿 -->
      <path d="M28.791,8.874 L53.5,9 V65 L28.709,64.874 C24.307,64.851 20.75,61.276 20.75,56.874 V16.874 C20.75,12.456 24.332,8.874 28.75,8.874 Z" data-face="front"/>
      <path d="M20.75,16.874 C20.75,12.456 24.332,8.874 28.75,8.874 L53.5,9" data-edge="hi"/>
      <path d="M20.75,16.874 V56.874" data-edge="hi"/>
      <path d="M20.75,56.874 C20.75,61.276 24.307,64.851 28.709,64.874 L53.5,65" data-edge="lo"/>
      <path d="M53.5,9 V65" data-edge="lo"/>

      <!-- 三级叠片：由大到小向后叠，正面统一，靠棱线分层 -->
      <path d="M57.833,0 H78.75 V73.667 H57.833 C55.624,73.667 53.833,71.876 53.833,69.667 V4 C53.833,1.791 55.624,0 57.833,0 Z" data-face="front"/>
      <path d="M57.833,0 H78.75" data-edge="hi"/>
      <path d="M53.833,4 V69.667" data-edge="lo"/>
      <path d="M57.474,11.974 L78.75,11.833 V61.833 L57.526,61.973 C55.317,61.988 53.515,60.209 53.5,58 V15.974 C53.5,13.775 55.275,11.988 57.474,11.974 Z" data-face="front"/>
      <path d="M57.474,11.974 L78.75,11.833" data-edge="hi"/>
      <path d="M57.526,61.973 L78.75,61.833" data-edge="lo"/>
      <path d="M57.833,24.833 H78.75 V48.833 H57.833 C55.624,48.833 53.833,47.042 53.833,44.833 V28.833 C53.833,26.624 55.624,24.833 57.833,24.833 Z" data-face="front"/>
      <path d="M57.833,24.833 H78.75" data-edge="hi"/>
      <path d="M57.833,48.833 H78.75" data-edge="lo"/>

      <!-- 端板：叠片与立柱之间的竖板 -->
      <rect x="78.75" y="12.833" width="14.083" height="48" data-face="front"/>
      <rect x="78.75" y="12.833" width="14.083" height="2.4" data-face="top"/>
      <path d="M78.75,12.833 H92.833" data-edge="hi"/>
      <path d="M78.75,60.833 H92.833" data-edge="lo"/>

      <!-- 横梁与左端短轴：卧管，顶缘受光 -->
      <polygon points="79,32.833 92,32.833 92,40.833 79,40.833" data-face="barrel"/>
      <path d="M79,32.833 H92" data-edge="hi"/>
      <path d="M79,40.833 H92" data-edge="lo"/>
      <path d="M4,32.833 H20.25 V40.833 H4 C1.791,40.833 0,39.042 0,36.833 C0,34.624 1.791,32.833 4,32.833 Z" data-face="barrel"/>
      <path d="M4,32.833 H20.25" data-edge="hi"/>
      <path d="M1.2,40.833 H20.25" data-edge="lo"/>

      <!-- 右端立柱：竖置短柱 -->
      <rect x="92.833" y="2.167" width="8.667" height="69.333" rx="2" data-face="body"/>
      <path d="M92.833,6 V68" data-edge="hi"/>
      <path d="M101.5,6 V68" data-edge="lo"/>
    </g>
  </svg>`,
  },
  /**
   * 进料斜槽：斜槽把物料送进下方渠体。原稿全是 scale(-1,1) 镜像，且每件的镜像中心都在
   * 自身中线上，镜像等于没翻——所以直接写绝对坐标。渠内两级台阶按「内框只留暗缝」处理。
   */
  water_inclined_channel: {
    icon25d: `<svg viewBox="0 0 150 86" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="73.4" cy="82.4" rx="70" ry="0.6" data-shadow="1"/>
      <!-- 渠体：r8 圆角槽箱 -->
      <rect x="11.583" y="40.118" width="58" height="42.882" rx="8" data-face="front"/>
      <path d="M13.89,42.5 L19.583,40.118 H61.583 L67.277,42.5 Z" data-face="top"/>
      <path d="M11.583,48.118 A8,8 0 0 1 19.583,40.118 H61.583 A8,8 0 0 1 69.583,48.118" data-edge="hi"/>
      <path d="M11.583,74.999 A8,8 0 0 0 19.583,83 H61.583 A8,8 0 0 0 69.583,74.999" data-edge="lo"/>
      <path d="M11.583,48.118 V74.999" data-edge="hi"/>
      <path d="M69.583,48.118 V74.999" data-edge="lo"/>

      <!-- 渠内隔墙（侧面）与两级台阶：内框只留暗缝 -->
      <rect x="22.583" y="40.118" width="17" height="42.882" data-face="side"/>
      <rect x="22.583" y="47.559" width="17" height="28" data-edge="lo" stroke-width="2"/>
      <rect x="22.583" y="55.559" width="17" height="12" data-edge="lo" stroke-width="2"/>

      <!-- 渠右壁外的圆角短箱 -->
      <path d="M71.583,49.559 H77.583 V73.559 H71.583 C70.479,73.559 69.583,72.663 69.583,71.559 V51.559 C69.583,50.454 70.479,49.559 71.583,49.559 Z" data-face="front"/>
      <path d="M69.583,51.559 C69.583,50.454 70.479,49.559 71.583,49.559 H77.583" data-edge="hi"/>
      <path d="M69.583,71.559 C69.583,72.663 70.479,73.559 71.583,73.559 H77.583" data-edge="lo"/>

      <!-- 斜撑与渠壁端块（原稿实心件） -->
      <polygon points="84.583,57.559 69.833,57.726 69.833,65.726 84.583,65.559" data-face="front"/>
      <path d="M84.583,57.559 L69.833,57.726" data-edge="hi"/>
      <path d="M84.583,65.559 L69.833,65.726" data-edge="lo"/>
      <rect x="6.498" y="57.559" width="5" height="8" data-face="front"/>
      <path d="M6.498,57.559 H11.498" data-edge="hi"/>
      <path d="M6.498,65.559 H11.498" data-edge="lo"/>

      <!-- 渠左侧短立管 -->
      <rect x="0" y="50" width="6" height="24" rx="2" data-face="body"/>
      <path d="M0,52 V72" data-edge="hi"/>
      <path d="M6,52 V72" data-edge="lo"/>

      <!-- 进料斜槽：最后画，压住渠体右壁 -->
      <polygon points="67.333,0 146.826,0 123.446,83 90.714,83" data-face="front"/>
      <rect x="67.333" y="0" width="79.493" height="2.6" data-face="top"/>
      <path d="M67.333,0 H146.826" data-edge="hi"/>
      <path d="M67.333,0 L90.714,83" data-edge="hi"/>
      <path d="M146.826,0 L123.446,83" data-edge="lo"/>
      <path d="M90.714,83 H123.446" data-edge="lo"/>
    </g>
  </svg>`,
  },
  /**
   * 纳滤：膜组机架。四排横卧膜管铺 barrel，四根立撑与两端立轨铺 body；
   * 立撑画在膜管之后——实机上箍带压在管子上，原稿的实心竖条也读作前置。
   */
  water_nanofiltration: {
    icon25d: `<svg viewBox="0 0 295 164" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="146.5" cy="161.4" rx="140" ry="0.6" data-shadow="1"/>
      <!-- 机架：r8 圆角外框 -->
      <rect x="18" y="10" width="257" height="142" rx="8" data-face="front"/>
      <path d="M18,18 A8,8 0 0 1 26,10 H267 A8,8 0 0 1 275,18" data-edge="hi"/>
      <path d="M18,18 V144" data-edge="hi"/>
      <path d="M275,18 V144" data-edge="lo"/>
      <path d="M18,144 A8,8 0 0 0 26,152 H267 A8,8 0 0 0 275,144" data-edge="lo"/>

      <!-- 四排膜管：横卧圆管，顶缘受光 -->
      <rect x="26" y="31" width="241" height="13" rx="6.5" data-face="barrel"/>
      <path d="M32.5,31 H260.5" data-edge="hi"/>
      <path d="M32.5,44 H260.5" data-edge="lo"/>
      <rect x="26" y="61" width="241" height="13" rx="6.5" data-face="barrel"/>
      <path d="M32.5,61 H260.5" data-edge="hi"/>
      <path d="M32.5,74 H260.5" data-edge="lo"/>
      <rect x="26" y="90" width="241" height="13" rx="6.5" data-face="barrel"/>
      <path d="M32.5,90 H260.5" data-edge="hi"/>
      <path d="M32.5,103 H260.5" data-edge="lo"/>
      <rect x="26" y="120" width="241" height="13" rx="6.5" data-face="barrel"/>
      <path d="M32.5,120 H260.5" data-edge="hi"/>
      <path d="M32.5,133 H260.5" data-edge="lo"/>

      <!-- 排间连接件 -->
      <rect x="63" y="50" width="18" height="4" rx="2" data-face="front"/>
      <rect x="113" y="50" width="18" height="4" rx="2" data-face="front"/>
      <rect x="63" y="80" width="18" height="4" rx="2" data-face="front"/>
      <rect x="113" y="80" width="18" height="4" rx="2" data-face="front"/>
      <rect x="63" y="109" width="18" height="4" rx="2" data-face="front"/>
      <rect x="113" y="109" width="18" height="4" rx="2" data-face="front"/>
      <rect x="163" y="50" width="18" height="4" rx="2" data-face="front"/>
      <rect x="163" y="80" width="18" height="4" rx="2" data-face="front"/>
      <rect x="163" y="109" width="18" height="4" rx="2" data-face="front"/>
      <rect x="213" y="50" width="18" height="4" rx="2" data-face="front"/>
      <rect x="213" y="80" width="18" height="4" rx="2" data-face="front"/>
      <rect x="213" y="109" width="18" height="4" rx="2" data-face="front"/>

      <!-- 四根立撑：竖置短柱，画在膜管之后 -->
      <rect x="69" y="19" width="6" height="124" rx="3" data-face="body"/>
      <path d="M69,23 V139" data-edge="hi" stroke-linecap="butt"/>
      <rect x="119" y="19" width="6" height="124" rx="3" data-face="body"/>
      <path d="M119,23 V139" data-edge="hi" stroke-linecap="butt"/>
      <rect x="169" y="19" width="6" height="124" rx="3" data-face="body"/>
      <path d="M169,23 V139" data-edge="hi" stroke-linecap="butt"/>
      <rect x="219" y="19" width="6" height="124" rx="3" data-face="body"/>
      <path d="M219,23 V139" data-edge="hi" stroke-linecap="butt"/>

      <!-- 两端立轨 -->
      <rect x="0" y="0" width="6" height="162" rx="3" data-face="body"/>
      <path d="M0,3 V159" data-edge="hi" stroke-linecap="butt"/>
      <path d="M6,3 V159" data-edge="lo" stroke-linecap="butt"/>
      <rect x="287" y="0" width="6" height="162" rx="3" data-face="body"/>
      <path d="M287,3 V159" data-edge="hi" stroke-linecap="butt"/>
      <path d="M293,3 V159" data-edge="lo" stroke-linecap="butt"/>

      <!-- 立轨与机架之间的短接管 -->
      <rect x="5" y="37" width="20" height="2" data-face="barrel"/>
      <rect x="267" y="36.5" width="20" height="2" data-face="barrel"/>
      <rect x="5" y="66.5" width="20" height="2" data-face="barrel"/>
      <rect x="267" y="66.5" width="20" height="2" data-face="barrel"/>
      <rect x="5" y="95.5" width="20" height="2" data-face="barrel"/>
      <rect x="267" y="95.5" width="20" height="2" data-face="barrel"/>
      <rect x="5" y="125.5" width="20" height="2" data-face="barrel"/>
      <rect x="267" y="126" width="20" height="2" data-face="barrel"/>
    </g>
  </svg>`,
  },
  /**
   * 空压机：卧式储气罐 + 顶部三台风机。罐体铺 barrel，三台风机各自「正面盘 + 叶片侧倾面 +
   * 轴帽 + 暗圈」，脚板按原稿空框留内缝。叶片沿用原稿多边形（旋转由 transform 承担），
   * 只换填色角色，避免重算 24 条旋转坐标。
   */
  water_air_compressor: {
    icon25d: `<svg viewBox="0 0 165 106" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="82.5" cy="104.4" rx="78" ry="0.6" data-shadow="1"/>
      <circle cx="53.4314181" cy="10.9375" r="10.4721" data-face="side"/>
      <polygon points="53.9473813 0 53.9473813 6.51595745 52.9971942 6.51595745 52.9971942 0" data-face="front"/>
      <polygon transform="translate(58.949295, 5.597325) rotate(45.000000) translate(-58.949295, -5.597325) " points="59.3994826 2.32005193 59.3994826 8.87459816 58.4492954 8.87459816 58.4492954 2.32005193" data-face="front"/>
      <polygon transform="translate(61.073785, 11.193669) rotate(90.000000) translate(-61.073785, -11.193669) " points="61.5239722 7.93569026 61.5239722 14.4516477 60.573785 14.4516477 60.573785 7.93569026" data-face="front"/>
      <polygon transform="translate(58.914072, 16.310847) rotate(135.000000) translate(-58.914072, -16.310847) " points="59.3642596 13.0335739 59.3642596 19.5881202 58.4140724 19.5881202 58.4140724 13.0335739" data-face="front"/>
      <polygon transform="translate(53.447381, 18.617021) rotate(180.000000) translate(-53.447381, -18.617021) " points="53.8975685 15.3590426 53.8975685 21.875 52.9473813 21.875 52.9473813 15.3590426" data-face="front"/>
      <polygon transform="translate(47.978004, 16.277675) rotate(225.000000) translate(-47.978004, -16.277675) " points="48.4281911 13.0004018 48.4281911 19.5549481 47.4780039 19.5549481 47.4780039 13.0004018" data-face="front"/>
      <polygon transform="translate(45.870790, 11.146757) rotate(270.000000) translate(-45.870790, -11.146757) " points="46.3209776 7.88877783 46.3209776 14.4047353 45.3707905 14.4047353 45.3707905 7.88877783" data-face="front"/>
      <polygon transform="translate(48.013227, 5.564153) rotate(315.000000) translate(-48.013227, -5.564153) " points="48.4634141 2.28687983 48.4634141 8.84142607 47.5132269 8.84142607 47.5132269 2.28687983" data-face="front"/>
      <ellipse cx="53.4314181" cy="10.9375" rx="2.3754679" ry="2.32712766" data-face="cap"/>
      <ellipse cx="53.4314181" cy="10.9375" rx="2.3754679" ry="2.32712766" data-edge="lo" stroke-width="1.6"/>
      <circle cx="82.9347294" cy="10.9375" r="10.4721" data-face="side"/>
      <polygon points="83.4506926 0 83.4506926 6.51595745 82.5005054 6.51595745 82.5005054 0" data-face="front"/>
      <polygon transform="translate(88.452607, 5.597325) rotate(45.000000) translate(-88.452607, -5.597325) " points="88.9027939 2.32005193 88.9027939 8.87459816 87.9526067 8.87459816 87.9526067 2.32005193" data-face="front"/>
      <polygon transform="translate(90.577096, 11.193669) rotate(90.000000) translate(-90.577096, -11.193669) " points="91.0272834 7.93569026 91.0272834 14.4516477 90.0770963 14.4516477 90.0770963 7.93569026" data-face="front"/>
      <polygon transform="translate(88.417384, 16.310847) rotate(135.000000) translate(-88.417384, -16.310847) " points="88.8675709 13.0335739 88.8675709 19.5881202 87.9173837 19.5881202 87.9173837 13.0335739" data-face="front"/>
      <polygon transform="translate(82.950693, 18.617021) rotate(180.000000) translate(-82.950693, -18.617021) " points="83.4008797 15.3590426 83.4008797 21.875 82.4506926 21.875 82.4506926 15.3590426" data-face="front"/>
      <polygon transform="translate(77.481315, 16.277675) rotate(225.000000) translate(-77.481315, -16.277675) " points="77.9315023 13.0004018 77.9315023 19.5549481 76.9813152 19.5549481 76.9813152 13.0004018" data-face="front"/>
      <polygon transform="translate(75.374102, 11.146757) rotate(270.000000) translate(-75.374102, -11.146757) " points="75.8242889 7.88877783 75.8242889 14.4047353 74.8741017 14.4047353 74.8741017 7.88877783" data-face="front"/>
      <polygon transform="translate(77.516538, 5.564153) rotate(315.000000) translate(-77.516538, -5.564153) " points="77.9667253 2.28687983 77.9667253 8.84142607 77.0165382 8.84142607 77.0165382 2.28687983" data-face="front"/>
      <ellipse cx="82.9347294" cy="10.9375" rx="2.3754679" ry="2.32712766" data-face="cap"/>
      <ellipse cx="82.9347294" cy="10.9375" rx="2.3754679" ry="2.32712766" data-edge="lo" stroke-width="1.6"/>
      <circle cx="112.438041" cy="10.9375" r="10.4721" data-face="side"/>
      <polygon points="112.954004 0 112.954004 6.51595745 112.003817 6.51595745 112.003817 0" data-face="front"/>
      <polygon transform="translate(117.955918, 5.597325) rotate(45.000000) translate(-117.955918, -5.597325) " points="118.406105 2.32005193 118.406105 8.87459816 117.455918 8.87459816 117.455918 2.32005193" data-face="front"/>
      <polygon transform="translate(120.080408, 11.193669) rotate(90.000000) translate(-120.080408, -11.193669) " points="120.530595 7.93569026 120.530595 14.4516477 119.580408 14.4516477 119.580408 7.93569026" data-face="front"/>
      <polygon transform="translate(117.920695, 16.310847) rotate(135.000000) translate(-117.920695, -16.310847) " points="118.370882 13.0335739 118.370882 19.5881202 117.420695 19.5881202 117.420695 13.0335739" data-face="front"/>
      <polygon transform="translate(112.454004, 18.617021) rotate(180.000000) translate(-112.454004, -18.617021) " points="112.904191 15.3590426 112.904191 21.875 111.954004 21.875 111.954004 15.3590426" data-face="front"/>
      <polygon transform="translate(106.984626, 16.277675) rotate(225.000000) translate(-106.984626, -16.277675) " points="107.434814 13.0004018 107.434814 19.5549481 106.484626 19.5549481 106.484626 13.0004018" data-face="front"/>
      <polygon transform="translate(104.877413, 11.146757) rotate(270.000000) translate(-104.877413, -11.146757) " points="105.3276 7.88877783 105.3276 14.4047353 104.377413 14.4047353 104.377413 7.88877783" data-face="front"/>
      <polygon transform="translate(107.019849, 5.564153) rotate(315.000000) translate(-107.019849, -5.564153) " points="107.470037 2.28687983 107.470037 8.84142607 106.519849 8.84142607 106.519849 2.28687983" data-face="front"/>
      <ellipse cx="112.438041" cy="10.9375" rx="2.3754679" ry="2.32712766" data-face="cap"/>
      <ellipse cx="112.438041" cy="10.9375" rx="2.3754679" ry="2.32712766" data-edge="lo" stroke-width="1.6"/>

      <!-- 罐体：横卧胶囊，顶亮底暗；原稿两条竖实条是端头环缝 -->
      <path d="M137.151899,30.625 C152.53198,30.625 165,42.9891195 165,58.2410338 L165,58.7902162 C165,74.0421305 152.53198,86.40625 137.151899,86.40625 L27.8481013,86.40625 C12.4680196,86.40625 0,74.0421305 0,58.7902162 L0,58.2410338 C0,42.9891195 12.4680196,30.625 27.8481013,30.625 L137.151899,30.625 Z" data-face="barrel"/>
      <path d="M27.848,30.625 H137.152" data-edge="hi"/>
      <path d="M27.848,86.406 H137.152" data-edge="lo"/>
      <rect x="25.132" y="30.625" width="2.186" height="53.594" data-edge="lo" stroke-width="2"/>
      <rect x="136.589" y="30.625" width="2.186" height="53.594" data-edge="lo" stroke-width="2"/>

      <!-- 罐面附件：两只表口用轴帽 + 同参暗圈，手柄小件铺正面 -->
      <path d="M84.842,41.069 C86.343,41.069 87.672,41.81 88.483,42.946 C90.158,43.42 91.292,44.106 92.1,45.075 C92.895,46.028 93.374,47.255 93.374,48.594 C93.374,50.111 92.759,51.484 91.766,52.479 C90.773,53.473 89.401,54.088 87.886,54.088 C86.548,54.088 85.323,53.609 84.371,52.813 C83.403,52.004 82.717,50.868 82.485,49.574 C81.108,48.381 80.368,47.05 80.368,45.547 C80.368,44.31 80.869,43.191 81.679,42.38 C82.488,41.57 83.606,41.069 84.842,41.069 Z" data-face="front"/>
      <ellipse cx="110.364" cy="47.031" rx="3.770861" ry="3.775" data-face="cap"/>
      <ellipse cx="110.364" cy="47.031" rx="3.770861" ry="3.775" data-edge="lo" stroke-width="1.4"/>
      <ellipse cx="57.914" cy="52.5" rx="4.863576" ry="4.86875" data-face="cap"/>
      <ellipse cx="57.914" cy="52.5" rx="4.863576" ry="4.86875" data-edge="lo" stroke-width="1.4"/>

      <!-- 支腿：六根竖柱 + 三块脚板（原稿脚板是空框，内框留暗缝） -->
      <rect x="42.6159" y="85.3125" width="2.185" height="13.125" data-face="body"/>
      <path d="M42.6159,86 V98" data-edge="hi" stroke-width="1.2" stroke-linecap="butt"/>
      <rect x="49.1722" y="85.3125" width="2.185" height="13.125" data-face="body"/>
      <path d="M49.1722,86 V98" data-edge="hi" stroke-width="1.2" stroke-linecap="butt"/>
      <rect x="78.6755" y="85.3125" width="2.185" height="13.125" data-face="body"/>
      <path d="M78.6755,86 V98" data-edge="hi" stroke-width="1.2" stroke-linecap="butt"/>
      <rect x="84.1391" y="85.3125" width="2.185" height="13.125" data-face="body"/>
      <path d="M84.1391,86 V98" data-edge="hi" stroke-width="1.2" stroke-linecap="butt"/>
      <rect x="113.6424" y="85.3125" width="2.185" height="13.125" data-face="body"/>
      <path d="M113.6424,86 V98" data-edge="hi" stroke-width="1.2" stroke-linecap="butt"/>
      <rect x="120.1987" y="85.3125" width="2.185" height="13.125" data-face="body"/>
      <path d="M120.1987,86 V98" data-edge="hi" stroke-width="1.2" stroke-linecap="butt"/>
      <rect x="38.245" y="96.25" width="18.576" height="8.75" data-face="front"/>
      <path d="M38.245,96.25 H56.821" data-edge="hi" stroke-width="1.6"/>
      <rect x="40.4674" y="98.591" width="14.129" height="4.068" data-edge="lo" stroke-width="1.2"/>
      <rect x="73.212" y="96.25" width="18.576" height="8.75" data-face="front"/>
      <path d="M73.212,96.25 H91.788" data-edge="hi" stroke-width="1.6"/>
      <rect x="75.4348" y="98.591" width="14.129" height="4.068" data-edge="lo" stroke-width="1.2"/>
      <rect x="109.2715" y="96.25" width="18.576" height="8.75" data-face="front"/>
      <path d="M109.2715,96.25 H127.847" data-edge="hi" stroke-width="1.6"/>
      <rect x="111.4949" y="98.591" width="14.129" height="4.068" data-edge="lo" stroke-width="1.2"/>

      <!-- 顶部支座：画在罐体之上 -->
      <rect x="34.967" y="26.25" width="95.066" height="5.469" data-face="front"/>
      <rect x="34.967" y="26.25" width="95.066" height="2.2" data-face="top"/>
      <path d="M34.967,26.25 H130.033" data-edge="hi"/>
      <path d="M34.967,31.719 H130.033" data-edge="lo"/>
    </g>
  </svg>`,
  },
  /**
   * 进出水渠：横剖的埋地渠，原稿是「剖面加填充线」的画法——混凝土按剖面画成线框，
   * 用斜线表示被切断的材料。翻成面基时按剖面的读法处理：
   *
   * - 混凝土（铺板 + 两侧渠壁 + 底板）是**同一张剖切面**，一整块 evenodd `front` 挖掉
   *   中间渠腔即可；分成几块各自成面会读成相框（同 thermal_water_tank 的教训）。
   * - 渠腔是真挖穿的洞，先铺一层 `hole` 压暗，读成竖井而不是一块亮板。
   * - 原稿 39 条斜线是材料符号，不是棱线：留成 0.9 宽的 `lo` 细缝（1.4 会把 5.5 宽的
   *   渠壁填黑）。
   * - 顶板给人孔井圈：原稿那条实心块与方框合成一个矮台，「台面 top + 立面 front」，
   *   框线位置留两道 `lo` 缝。
   */
  water_inlet_channel: {
    icon25d: `<svg viewBox="0 0 52 116" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,1)" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="18.0926104" y="4.0926104" width="16" height="104" data-face="hole"/>

      <path d="M0,4 H52 V10.0926104 H39.4968416 V114.09261 H12.5031584 V10.0926104 H0 Z M18.0926104,4.0926104 H34.0926104 V108.09261 H18.0926104 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M0,4 H18.0926104 V5.6 H0 Z M34.0926104,4 H52 V5.6 H34.0926104 Z" data-face="top"/>

      <path d="M0,4 H18.0926104 M34.0926104,4 H52" data-edge="hi"/>
      <path d="M0,10.0926104 H12.5031584 M39.4968416,10.0926104 H52" data-edge="lo" stroke-width="1.2"/>
      <path d="M12.5031584,10.0926104 V114.09261" data-edge="hi"/>
      <path d="M39.4968416,10.0926104 V114.09261" data-edge="lo" stroke-width="1.2"/>
      <path d="M12.5031584,114.09261 H39.4968416" data-edge="lo" stroke-width="1.2"/>
      <path d="M18.0926104,108.09261 H34.0926104" data-edge="lo" stroke-width="1.2"/>
      <path d="M18.0926104,4.0926104 V108.09261 M34.0926104,4.0926104 V108.09261" data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>

      <line x1="6.77162507" y1="10" x2="1" y2="4.09261036" transform="translate(3.885813, 7.046305) scale(-1, 1) translate(-3.885813, -7.046305) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="12.3333333" y1="10" x2="6.77162507" y2="4" transform="translate(9.552479, 7.000000) scale(-1, 1) translate(-9.552479, -7.000000) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="17.89006" y1="10" x2="12.4382917" y2="4.09261036" transform="translate(15.164176, 7.046305) scale(-1, 1) translate(-15.164176, -7.046305) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="18.0857897" x2="12.3333333" y2="12.0926104" transform="translate(15.166667, 15.089200) scale(-1, 1) translate(-15.166667, -15.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="50.0857897" x2="12.3333333" y2="44.0926104" transform="translate(15.166667, 47.089200) scale(-1, 1) translate(-15.166667, -47.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="82.0857897" x2="12.3333333" y2="76.0926104" transform="translate(15.166667, 79.089200) scale(-1, 1) translate(-15.166667, -79.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="34.0857897" x2="12.3333333" y2="28.0926104" transform="translate(15.166667, 31.089200) scale(-1, 1) translate(-15.166667, -31.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="66.0857897" x2="12.3333333" y2="60.0926104" transform="translate(15.166667, 63.089200) scale(-1, 1) translate(-15.166667, -63.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="98.0857897" x2="12.3333333" y2="92.0926104" transform="translate(15.166667, 95.089200) scale(-1, 1) translate(-15.166667, -95.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="26.0857897" x2="12.3333333" y2="20.0926104" transform="translate(15.166667, 23.089200) scale(-1, 1) translate(-15.166667, -23.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="58.0857897" x2="12.3333333" y2="52.0926104" transform="translate(15.166667, 55.089200) scale(-1, 1) translate(-15.166667, -55.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="90.0857897" x2="12.3333333" y2="84.0926104" transform="translate(15.166667, 87.089200) scale(-1, 1) translate(-15.166667, -87.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="42.0857897" x2="12.3333333" y2="36.0926104" transform="translate(15.166667, 39.089200) scale(-1, 1) translate(-15.166667, -39.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="74.0857897" x2="12.3333333" y2="68.0926104" transform="translate(15.166667, 71.089200) scale(-1, 1) translate(-15.166667, -71.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="106.08579" x2="12.3333333" y2="100.09261" transform="translate(15.166667, 103.089200) scale(-1, 1) translate(-15.166667, -103.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="18" y1="114.08579" x2="13" y2="108.09261" transform="translate(15.500000, 111.089200) scale(-1, 1) translate(-15.500000, -111.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="24.0926104" y1="114.08579" x2="19.0926104" y2="108.09261" transform="translate(21.592610, 111.089200) scale(-1, 1) translate(-21.592610, -111.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="31.0926104" y1="114.08579" x2="26.0926104" y2="108.09261" transform="translate(28.592610, 111.089200) scale(-1, 1) translate(-28.592610, -111.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="104.08579" x2="34.1669392" y2="97.6990967" transform="translate(36.885745, 100.892443) scale(-1, 1) translate(-36.885745, -100.892443) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="73.0857897" x2="34.1669392" y2="67.0926104" transform="translate(36.885745, 70.089200) scale(-1, 1) translate(-36.885745, -70.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="42.0857897" x2="34.1669392" y2="36.0926104" transform="translate(36.885745, 39.089200) scale(-1, 1) translate(-36.885745, -39.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="88.0857897" x2="34.1669392" y2="82.0926104" transform="translate(36.885745, 85.089200) scale(-1, 1) translate(-36.885745, -85.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="57.0857897" x2="34.1669392" y2="51.0926104" transform="translate(36.885745, 54.089200) scale(-1, 1) translate(-36.885745, -54.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="27.0857897" x2="34.1669392" y2="21.0926104" transform="translate(36.885745, 24.089200) scale(-1, 1) translate(-36.885745, -24.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="96.0857897" x2="34.1669392" y2="90.0857897" transform="translate(36.885745, 93.085790) scale(-1, 1) translate(-36.885745, -93.085790) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="65.0857897" x2="34.1669392" y2="59.0926104" transform="translate(36.885745, 62.089200) scale(-1, 1) translate(-36.885745, -62.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="34.0857897" x2="34.1669392" y2="28.0926104" transform="translate(36.885745, 31.089200) scale(-1, 1) translate(-36.885745, -31.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="81.0857897" x2="34.1669392" y2="75.0926104" transform="translate(36.885745, 78.089200) scale(-1, 1) translate(-36.885745, -78.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="50.0857897" x2="34.1669392" y2="44.0926104" transform="translate(36.885745, 47.089200) scale(-1, 1) translate(-36.885745, -47.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="19.0857897" x2="34.1669392" y2="13.0926104" transform="translate(36.885745, 16.089200) scale(-1, 1) translate(-36.885745, -16.089200) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="44.6549986" y1="9.92489433" x2="39.4669481" y2="4.09261036" transform="translate(42.060973, 7.008752) scale(-1, 1) translate(-42.060973, -7.008752) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="50.0926104" y1="9.92489433" x2="44.9045599" y2="4.09261036" transform="translate(47.498585, 7.008752) scale(-1, 1) translate(-47.498585, -7.008752) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.2173869" y1="9.92489433" x2="34.1669392" y2="4.09261036" transform="translate(36.692163, 7.008752) scale(-1, 1) translate(-36.692163, -7.008752) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>
      <line x1="39.604551" y1="114.09261" x2="32.6187944" y2="105.601532" transform="translate(36.111673, 109.847071) scale(-1, 1) translate(-36.111673, -109.847071) " data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>

      <rect x="22" y="1.4" width="14" height="2.6" data-face="front"/>
      <rect x="22" y="0" width="14" height="1.4" data-face="top"/>
      <path d="M22,0 H36" data-edge="hi"/>
      <path d="M22,4 H36" data-edge="lo" stroke-width="1.2"/>
      <path d="M26,1.4 V4 M30,1.4 V4" data-edge="lo" stroke-width="0.8" stroke-linecap="butt"/>

      <ellipse cx="26" cy="113.4" rx="18" ry="0.55" data-shadow="1"/>
    </g>
  </svg>`,
  },
}

const waterAssetComponents = withIllustrations(
  buildAssetComponents('water', waterAssetIcons, waterAssetMeta),
  illustratedAssets,
)

export const waterComponents: ComponentDefinition[] = [
  SedimentTankDefinition,
  SubPumpDefinition,
  // 水系统（外部素材导入，27 台）：沉淀池/格栅/加药/过滤/各类泵阀。
  // 注意与手写的 SedimentTankDefinition 重名（同为「沉淀池」，一个是线条稿、一个是素材图元），
  // type 不同故互不覆盖；溯源见 scripts/subunit-manifest.json
  ...waterAssetComponents,
]
