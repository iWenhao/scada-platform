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
  // 画法对齐综采采煤机素材：单色描边、内部留空、立体感靠线条密度而不是填充，
  // 因此这里不写 data-face（styleIcon 会原样透传，2D/2.5D 观感一致）
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <!-- 后支撑：尾板 + 斜撑，整体退到驱动轮之后，不与轮注重叠 -->
      <path d="M88,94 L88,88 L98,88 L98,94 Z" />
      <path d="M90,88 L86,74" />
      <!-- 履带装置：外廓只画底线与两端圆弧——顶边与车架下沿是同一条线，重描一遍就是「双线」；
           两端圆弧的 sweep 必须同为 0（同向绕行才都朝外鼓），右端写成 1 会翻到履带内部去 -->
      <path d="M38,74 A10,10 0 0 0 38,94 L74,94 A10,10 0 0 0 74,74" />
      <circle cx="74" cy="84" r="6.2" />
      <circle cx="74" cy="84" r="2.1" />
      <circle cx="38" cy="84" r="5.2" />
      <circle cx="38" cy="84" r="1.7" />
      <circle cx="48" cy="88" r="2.8" />
      <circle cx="56" cy="88" r="2.8" />
      <circle cx="64" cy="88" r="2.8" />
      <path d="M42,94 L42,96.5 M47,94 L47,96.5 M52,94 L52,96.5 M57,94 L57,96.5 M62,94 L62,96.5 M67,94 L67,96.5 M72,94 L72,96.5" stroke-width="1.1" />
      <!-- 主车架：整台机器唯一的顶线与底线，deck 上的箱体都挂它、共边不重描；
           内部分舱线对齐上方各箱体的接缝——不留线的车架是一块大空白板，反而成了全图最抢眼的东西 -->
      <path d="M32,58 L94,58 L94,74 L32,74 Z" />
      <path d="M32,66 L94,66" stroke-width="1" stroke-opacity="0.5" />
      <path d="M56,58 L56,74 M72,58 L72,74 M84,58 L84,74" stroke-width="1" stroke-opacity="0.55" />
      <!-- 司机护棚：两根立柱正好落在箱体之间的空档上，不穿过任何轮廓 -->
      <path d="M34,26 L56,26 L56,30 L34,30 Z" />
      <path d="M36,30 L36,58" />
      <path d="M54,30 L54,58" />
      <!-- 操作台与操作杆（台体开口朝下，底边即车架顶线） -->
      <path d="M38,58 L38,48 L52,48 L52,58" />
      <path d="M42,48 L40,41 M48,48 L50,41" stroke-width="1.2" />
      <circle cx="40" cy="40.5" r="1.2" />
      <circle cx="50" cy="40.5" r="1.2" />
      <!-- 电气控制箱：门缝一条，指示灯与急停在门缝下方排开 -->
      <path d="M56,58 L56,38 L70,38 L70,58" />
      <path d="M56,45 L70,45" stroke-width="1" stroke-opacity="0.5" />
      <circle cx="60" cy="51" r="1.4" />
      <circle cx="64" cy="51" r="1.4" />
      <circle cx="68" cy="51" r="1.8" stroke-width="1.1" />
      <!-- 液压油箱：加油口切在顶线上，散热筋与液位计分踞左右、互不交叉 -->
      <path d="M72,58 L72,44 L82,44 L82,58" />
      <circle cx="77" cy="42" r="2" />
      <path d="M74,47 L74,55 M76.5,47 L76.5,55" stroke-width="1" stroke-opacity="0.55" />
      <path d="M79,47 L80.5,47 L80.5,55 L79,55" stroke-width="1.1" />
      <!-- 电机：散热筋两条 -->
      <path d="M84,58 L84,48 L94,48 L94,58" />
      <path d="M87.5,50 L87.5,56 M91,50 L91,56" stroke-width="1" stroke-opacity="0.55" />
      <!-- 回转台：支座收在截割臂根部之内当铰接凸台，不再骑在车架前沿上 -->
      <circle cx="28.5" cy="60" r="4" />
      <circle cx="28.5" cy="60" r="1.4" />
      <!-- 截割臂：后缘开口、用车架前沿收边；臂内不再画滑轨——齿圈扫过来必然打架 -->
      <path d="M32,56 L19,51 L19,61 L32,70" />
      <!-- 升降油缸：从车架前下角伸到截割臂下沿，走回转台下方，不与圆相交 -->
      <path d="M34,74 L29,69.5" stroke-width="3.2" stroke-opacity="0.8" />
      <path d="M29,69.5 L25.5,65.5" stroke-width="1.3" />
      <circle cx="34" cy="74" r="1.5" stroke-width="1.1" />
      <circle cx="25.5" cy="65.5" r="1.4" stroke-width="1.1" />
      <!-- 截割头滚筒：外圈 + 叶片环 + 轮毂三重同心，齿圈见 motion.rotors -->
      <circle cx="13" cy="56" r="8.5" />
      <circle cx="13" cy="56" r="5.5" stroke-width="1" stroke-opacity="0.6" />
      <circle cx="13" cy="56" r="2.6" />
      <!-- 前铲板：整体退到张紧轮之前，拱筋与台口线各守自己的框；
           底部连接梁走 y=94 这条共线把铲板接到履带前端——斜穿过去必然刮上张紧轮罩的圆弧 -->
      <path d="M6,94 L8,85 L24,85 L24,94 Z" />
      <path d="M9,89 L24,89" stroke-width="1" stroke-opacity="0.55" />
      <path d="M10,85 A7,7 0 0 1 22,85" stroke-width="1.2" />
      <path d="M24,94 L38,94" stroke-width="1.2" stroke-opacity="0.8" />
    </g>
  </svg>`,
  // 默认尺寸按「图形区 + 名称/数值两行」反推：图标内容包围盒 97.7×74.7（aspect 1.308，
  // 含 stroke-width 3.2 油缸带来的 2.1 描边余量），170×120 时两行文字都在，图形仍能以 94×72
  // 画出来；再小就被文字区挤成糊块（120×90 只剩 63×48）
  defaultWidth: 170,
  defaultHeight: 120,
  defaultConfig: {
    cutting: 0,
    load: 0,
    animate: true,
  },
  // 截齿绕截割头圆心（13,56）转动；16 支齿按采煤机滚筒的密度排布，
  // 齿根半径 8.8 略大于滚筒外圈 8.5，转动时齿才不会压在线上
  motion: {
    driveVariable: 'cutting',
    degPerUnit: 120,
    rotors: [
      {
        cx: 13,
        cy: 56,
        svg: `<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <line x1="13" y1="47.2" x2="13" y2="44.2" />
          <line x1="16.4" y1="47.9" x2="17.5" y2="45.1" />
          <line x1="19.2" y1="49.8" x2="21.3" y2="47.7" />
          <line x1="21.1" y1="52.6" x2="23.9" y2="51.5" />
          <line x1="21.8" y1="56" x2="24.8" y2="56" />
          <line x1="21.1" y1="59.4" x2="23.9" y2="60.5" />
          <line x1="19.2" y1="62.2" x2="21.3" y2="64.3" />
          <line x1="16.4" y1="64.1" x2="17.5" y2="66.9" />
          <line x1="13" y1="64.8" x2="13" y2="67.8" />
          <line x1="9.6" y1="64.1" x2="8.5" y2="66.9" />
          <line x1="6.8" y1="62.2" x2="4.7" y2="64.3" />
          <line x1="4.9" y1="59.4" x2="2.1" y2="60.5" />
          <line x1="4.2" y1="56" x2="1.2" y2="56" />
          <line x1="4.9" y1="52.6" x2="2.1" y2="51.5" />
          <line x1="6.8" y1="49.8" x2="4.7" y2="47.7" />
          <line x1="9.6" y1="47.9" x2="8.5" y2="45.1" />
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
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="55" cy="92" rx="24" ry="5" data-shadow="1"/>
      <polygon points="50,74 66,82 50,90 34,82" data-face="deck"/>
      <polygon points="34,82 50,90 50,94 34,86" data-face="front"/>
      <polygon points="50,90 66,82 66,86 50,94" data-face="side"/>
      <polygon points="50,22 70,32 50,42 30,32" data-face="top"/>
      <polygon points="30,32 50,42 50,78 30,68" data-face="front"/>
      <polygon points="50,42 70,32 70,68 50,78" data-face="side"/>
      <path d="M30 32 L50 42 L70 32" data-edge="hi"/>
      <path d="M30 32 L30 68" data-edge="hi"/>
      <path d="M30 68 L50 78 L70 68" data-edge="lo"/>
      <ellipse cx="60" cy="55" rx="6.5" ry="16" data-face="hole"/>
      <ellipse cx="60" cy="55" rx="6.5" ry="16" data-edge="hi" stroke-width="1.6"/>
      <g data-edge="hi" stroke-width="1.3">
        <line x1="60" y1="40" x2="60" y2="70"/>
        <line x1="54" y1="48" x2="66" y2="62"/>
        <line x1="66" y1="48" x2="54" y2="62"/>
      </g>
      <ellipse cx="60" cy="55" rx="2.2" ry="5" data-face="cap"/>
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
