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
  /**
   * 截割头的截齿要随截割头转动，已移入 motion.rotors（悬臂与机身保持静止）。
   *
   * 机身按 §3.3 的箱体面切法画：履带（deck + front）、车架、司机室、控制箱、截割臂
   * 一律是 2:1 箱体，截割头按「正对观察者的圆盘」写成 `cap` + `hi` 轮廓。长轴沿
   * 右下 1:2 的等轴测方向——运行时旋转会把光源一起转走（§9.4），横躺设备只能把几何
   * 画成斜的，不能旋转图元。
   */
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="54" cy="93" rx="34" ry="5.5" data-shadow="1"/>
      <!-- 履带：车架以下唯一的体块。顶面用 deck（机器底座），支重轮是正面上的暗缝 -->
      <polygon points="34,62 80,85 86,82 40,59" data-face="deck"/>
      <polygon points="34,62 80,85 80,93 34,70" data-face="front"/>
      <polygon points="80,85 86,82 86,90 80,93" data-face="side"/>
      <path d="M34 62 L40 59 L86 82" data-edge="hi"/>
      <path d="M34 62 L34 70" data-edge="hi"/>
      <path d="M34 70 L80 93 L86 90" data-edge="lo"/>
      <g data-edge="lo" stroke-width="1.1">
        <ellipse cx="42" cy="70" rx="3.6" ry="3.2" transform="rotate(26.57 42 70)"/>
        <ellipse cx="52" cy="75" rx="3.6" ry="3.2" transform="rotate(26.57 52 75)"/>
        <ellipse cx="62" cy="80" rx="3.6" ry="3.2" transform="rotate(26.57 62 80)"/>
        <ellipse cx="72" cy="85" rx="3.6" ry="3.2" transform="rotate(26.57 72 85)"/>
      </g>
      <!-- 车架：履带 deck 上的主机体，面数下限靠它满足 -->
      <polygon points="38,46 72,63 78,60 44,43" data-face="top"/>
      <polygon points="38,46 72,63 72,80 38,63" data-face="front"/>
      <polygon points="72,63 78,60 78,77 72,80" data-face="side"/>
      <path d="M38 46 L44 43 L78 60" data-edge="hi"/>
      <path d="M38 46 L38 63" data-edge="hi"/>
      <path d="M38 63 L72 80 L78 77" data-edge="lo"/>
      <g data-edge="lo" stroke-width="1.1">
        <line x1="48" y1="51" x2="48" y2="68"/>
        <line x1="60" y1="57" x2="60" y2="74"/>
      </g>
      <!-- 司机室：正面挖一块暗玻璃当窗，轮廓另描一条 hi 当窗框 -->
      <polygon points="44,37 58,44 62,42 48,35" data-face="top"/>
      <polygon points="44,37 58,44 58,56 44,49" data-face="front"/>
      <polygon points="58,44 62,42 62,54 58,56" data-face="side"/>
      <path d="M44 37 L48 35 L62 42" data-edge="hi"/>
      <path d="M44 37 L44 49" data-edge="hi"/>
      <path d="M44 49 L58 56 L62 54" data-edge="lo"/>
      <polygon points="47,54 55,58 55,65 47,61" data-face="hole"/>
      <path d="M47 54 L55 58 L55 65 L47 61 Z" data-edge="hi" stroke-width="1"/>
      <!-- 电气控制箱：门缝一条 -->
      <polygon points="60,49 68,53 71,51.5 63,47.5" data-face="top"/>
      <polygon points="60,49 68,53 68,61 60,57" data-face="front"/>
      <polygon points="68,53 71,51.5 71,59.5 68,61" data-face="side"/>
      <path d="M60 49 L63 47.5 L71 51.5" data-edge="hi"/>
      <path d="M60 49 L60 57" data-edge="hi"/>
      <path d="M60 57 L68 61 L71 59.5" data-edge="lo"/>
      <path d="M60 53 L68 57" data-edge="lo" stroke-width="1.1"/>
      <!-- 截割臂：与机身同一套 2:1 箱体，根部压进车架正面 -->
      <polygon points="44,53 18,40 21,38.5 47,51.5" data-face="top"/>
      <polygon points="44,53 18,40 18,46 44,59" data-face="front"/>
      <path d="M44 53 L18 40" data-edge="hi"/>
      <path d="M47 51.5 L21 38.5" data-edge="hi"/>
      <path d="M44 59 L18 46" data-edge="lo"/>
      <!-- 升降油缸：走截割臂下沿与车架之间（圆管用 pipe，不参与面光照） -->
      <path d="M45 64 L31 53" data-pipe="base"/>
      <path d="M45 62.4 L31 51.4" data-pipe="hi"/>
      <!-- 截割头滚筒：外圈 + 叶片环 + 轮毂三重同心，齿圈见 motion.rotors；
           正对观察者的圆盘，只铺 cap 不描轮廓会像一块平色圆斑 -->
      <circle cx="14" cy="45" r="9" data-face="cap"/>
      <circle cx="14" cy="45" r="9" data-edge="hi" stroke-width="1.2"/>
      <circle cx="14" cy="45" r="5.6" data-edge="lo" stroke-width="1.1"/>
      <circle cx="14" cy="45" r="2.6" data-face="cap"/>
      <circle cx="14" cy="45" r="2.6" data-edge="hi" stroke-width="1"/>
    </g>
  </svg>`,
  // 默认尺寸包住「图形区 + 名称/数值两行」：内容包围盒约 85×67（aspect 1.27），
  // 170×120 时图形仍能以 88×69 画出来，再小就被文字区挤成糊块
  defaultWidth: 170,
  defaultHeight: 120,
  defaultConfig: {
    cutting: 0,
    load: 0,
    animate: true,
  },
  // 截齿绕截割头圆心（14,45）转动；16 支齿按采煤机滚筒的密度排布，
  // 齿根半径 9.8 略大于滚筒外圈 9，转动时齿才不会压在轮廓线上
  motion: {
    driveVariable: 'cutting',
    degPerUnit: 120,
    rotors: [
      {
        cx: 14,
        cy: 45,
        svg: `<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <line x1="23.8" y1="45.0" x2="26.8" y2="45.0" />
          <line x1="23.1" y1="48.8" x2="25.8" y2="49.9" />
          <line x1="20.9" y1="51.9" x2="23.1" y2="54.1" />
          <line x1="17.8" y1="54.1" x2="18.9" y2="56.8" />
          <line x1="14.0" y1="54.8" x2="14.0" y2="57.8" />
          <line x1="10.2" y1="54.1" x2="9.1" y2="56.8" />
          <line x1="7.1" y1="51.9" x2="4.9" y2="54.1" />
          <line x1="4.9" y1="48.8" x2="2.2" y2="49.9" />
          <line x1="4.2" y1="45.0" x2="1.2" y2="45.0" />
          <line x1="4.9" y1="41.2" x2="2.2" y2="40.1" />
          <line x1="7.1" y1="38.1" x2="4.9" y2="35.9" />
          <line x1="10.2" y1="35.9" x2="9.1" y2="33.2" />
          <line x1="14.0" y1="35.2" x2="14.0" y2="32.2" />
          <line x1="17.8" y1="35.9" x2="18.9" y2="33.2" />
          <line x1="20.9" y1="38.1" x2="23.1" y2="35.9" />
          <line x1="23.1" y1="41.2" x2="25.8" y2="40.1" />
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
  /**
   * 纵长设备按 §9.4 的写法把几何画成斜的（右下 1:2），不旋转图元。
   * 带面是 `top` 面：滚动标记沿带面中线推进，因此 motion.belts 必须同时给两端高度，
   * 否则虚线会横穿倾斜的带面（见 MotionBelt.y2）。
   */
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="48" cy="82" rx="30" ry="6" data-shadow="1"/>
      <!-- 支腿：先画（画家算法），上半截由机架自然裁掉 -->
      <polygon points="29,57 34,59.5 34,76 29,73.5" data-face="front"/>
      <polygon points="34,59.5 37,58 37,74.5 34,76" data-face="side"/>
      <path d="M29 73.5 L34 76 L37 74.5" data-edge="lo"/>
      <polygon points="53,69 58,71.5 58,88 53,85.5" data-face="front"/>
      <polygon points="58,71.5 61,70 61,86.5 58,88" data-face="side"/>
      <path d="M53 85.5 L58 88 L61 86.5" data-edge="lo"/>
      <!-- 机架：带面（top）+ 侧板（front）+ 尾端（side） -->
      <polygon points="20,40 72,66 79,62.5 27,36.5" data-face="top"/>
      <polygon points="20,40 72,66 72,76 20,50" data-face="front"/>
      <polygon points="72,66 79,62.5 79,72.5 72,76" data-face="side"/>
      <path d="M20 40 L27 36.5 L79 62.5" data-edge="hi"/>
      <path d="M20 40 L20 50" data-edge="hi"/>
      <path d="M20 50 L72 76 L79 72.5" data-edge="lo"/>
      <!-- 头尾滚筒：正对观察者的立圆盘，轮廓另描 (只铺 cap 会像圆斑) -->
      <ellipse cx="26" cy="48" rx="2.4" ry="4.5" data-face="cap"/>
      <ellipse cx="26" cy="48" rx="2.4" ry="4.5" data-edge="hi" stroke-width="1.1"/>
      <ellipse cx="66" cy="68.5" rx="2.4" ry="4.5" data-face="cap"/>
      <ellipse cx="66" cy="68.5" rx="2.4" ry="4.5" data-edge="hi" stroke-width="1.1"/>
    </g>
  </svg>`,
  // 内容包围盒 59×51.5（aspect 1.15）：斜着画的输送机纵向占位比横放的线条稿大，
  // 尺寸按新画幅给，照抄 110×50 会把图形压成 19px 的小块
  defaultWidth: 110,
  defaultHeight: 84,
  defaultConfig: {
    beltSpeed: 0,
    length: 100,
    animate: true,
  },
  // 带面滚动：在带面中线（top 面的两条端边中点）之间推进竖线标记；
  // y2 必须给——带面是斜的，只给一端高度会让标记横穿带面
  motion: {
    driveVariable: 'speed',
    belts: [{ x1: 23.5, x2: 75.5, y: 38.25, y2: 64.25, bandHeight: 6, direction: 1 }],
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
  /**
   * 挂墙式检测仪：显示箱是 2:1 箱体，屏幕挖成 `hole` 暗面、CH4 直接写在屏幕上。
   * 文字保留普通 `<text>`（不参与面光照），换状态色时随 `fill="currentColor"` 一起变。
   */
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="92" rx="15" ry="3.5" data-shadow="1"/>
      <polygon points="28,42 50,31 72,42 50,53" data-face="top"/>
      <polygon points="28,42 50,53 50,83 28,72" data-face="front"/>
      <polygon points="50,53 72,42 72,72 50,83" data-face="side"/>
      <path d="M28 42 L50 31 L72 42" data-edge="hi"/>
      <path d="M28 42 L28 72" data-edge="hi"/>
      <path d="M28 72 L50 83 L72 72" data-edge="lo"/>
      <polygon points="32,47 48,55 48,73 32,65" data-face="hole"/>
      <path d="M32 47 L48 55 L48 73 L32 65 Z" data-edge="hi" stroke-width="1"/>
      <text x="40" y="67" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor" stroke="none">CH4</text>
      <path d="M50 31 L50 24" data-pipe="base"/>
      <path d="M48.4 31 L48.4 24" data-pipe="hi"/>
      <circle cx="50" cy="20" r="4.5" data-face="cap"/>
      <circle cx="50" cy="20" r="4.5" data-edge="hi" stroke-width="1.1"/>
      <path d="M57 15 Q62 20 57 25" stroke-opacity="0.55"/>
      <path d="M62 11 Q69 20 62 29" stroke-opacity="0.55"/>
    </g>
  </svg>`,
  defaultWidth: 60,
  defaultHeight: 88,
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
  /**
   * 井架 + 天轮 + 罐笼：平台是 2:1 箱体，两根前立柱与一根后立柱围出开口，
   * 天轮按「正对观察者的圆盘」写（`cap` + `hi` 轮廓），罐笼是悬在开口里的箱体。
   * 缆绳与桁架斜撑是装饰线（普通 path + stroke-opacity），不标 `data-edge`。
   */
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="93" rx="28" ry="4.5" data-shadow="1"/>
      <!-- 平台：井架落脚处 -->
      <polygon points="26,80 50,68 74,80 50,92" data-face="deck"/>
      <polygon points="26,80 50,92 50,95 26,83" data-face="front"/>
      <polygon points="50,92 74,80 74,83 50,95" data-face="side"/>
      <path d="M26 80 L50 68 L74 80" data-edge="hi"/>
      <path d="M26 83 L50 95 L74 83" data-edge="lo"/>
      <!-- 后立柱先画，上半截由天轮压住 -->
      <polygon points="55,76 57.5,76 57.5,31 55,31" data-face="side"/>
      <!-- 两根前立柱：上端收拢到天轮下方 -->
      <polygon points="30,79 33.5,80.75 47,32 43.5,30.25" data-face="front"/>
      <polygon points="55.5,30.25 59,32 66.5,80.75 63,79" data-face="front"/>
      <path d="M30 79 L43.5 30.25" data-edge="hi"/>
      <path d="M30 79 L33.5 80.75" data-edge="lo"/>
      <path d="M55.5 30.25 L63 79" data-edge="hi"/>
      <path d="M63 79 L66.5 80.75" data-edge="lo"/>
      <!-- 横撑与斜撑：开口内的桁架，只做结构细节 -->
      <g data-edge="lo" stroke-width="1.1">
        <line x1="43.1" y1="46" x2="57.9" y2="46"/>
        <line x1="41.5" y1="52" x2="58.8" y2="52"/>
        <line x1="43.1" y1="46" x2="58.8" y2="52"/>
      </g>
      <!-- 天轮：圆盘 + 轮缘环 + 轮毂 + 辐条 -->
      <circle cx="50" cy="24" r="9.5" data-face="cap"/>
      <circle cx="50" cy="24" r="9.5" data-edge="hi" stroke-width="1.2"/>
      <circle cx="50" cy="24" r="6.5" data-edge="lo" stroke-width="1.1"/>
      <circle cx="50" cy="24" r="2.2" data-face="cap"/>
      <circle cx="50" cy="24" r="2.2" data-edge="hi" stroke-width="1"/>
      <g data-edge="lo" stroke-width="1">
        <line x1="50" y1="18" x2="50" y2="30"/>
        <line x1="44.9" y1="21" x2="55.1" y2="27"/>
        <line x1="44.9" y1="27" x2="55.1" y2="21"/>
      </g>
      <!-- 缆绳与罐笼（罐笼压住缆绳下端） -->
      <path d="M56 31 L53 55" stroke-width="1.1" stroke-opacity="0.75"/>
      <polygon points="44,57 50,53.5 56,57 50,60.5" data-face="top"/>
      <polygon points="44,57 50,60.5 50,70 44,66.5" data-face="front"/>
      <polygon points="50,60.5 56,57 56,66.5 50,70" data-face="side"/>
      <path d="M44 57 L50 53.5 L56 57" data-edge="hi"/>
      <path d="M44 57 L44 66.5" data-edge="hi"/>
      <path d="M44 66.5 L50 70 L56 66.5" data-edge="lo"/>
      <path d="M44 62 L50 65.5" data-edge="lo" stroke-width="1.1"/>
    </g>
  </svg>`,
  defaultWidth: 68,
  defaultHeight: 96,
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
  /**
   * 方仓 + 锥斗：仓体是标准 2:1 箱体，锥斗按箱体底面菱形收敛到卸料口，
   * 只画朝观察者的两面（front / side），接缝与卸料口用 lo 压暗。
   * 料位虚线保留普通 path（装饰，不标 data-edge，否则会变成抢轮廓的亮线）。
   */
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="92" rx="30" ry="5" data-shadow="1"/>
      <!-- 支腿先画，上半截由仓体裁掉 -->
      <polygon points="24,52 29,54.5 29,92 24,89.5" data-face="front"/>
      <polygon points="29,54.5 31,53.5 31,91 29,92" data-face="side"/>
      <path d="M24 89.5 L29 92 L31 91" data-edge="lo"/>
      <polygon points="69,50 74,52.5 74,90 69,87.5" data-face="front"/>
      <polygon points="74,52.5 76,51.5 76,89 74,90" data-face="side"/>
      <path d="M69 87.5 L74 90 L76 89" data-edge="lo"/>
      <!-- 仓体 -->
      <polygon points="26,16 50,5 74,16 50,27" data-face="top"/>
      <polygon points="26,16 50,27 50,61 26,50" data-face="front"/>
      <polygon points="50,27 74,16 74,50 50,61" data-face="side"/>
      <path d="M26 16 L50 5 L74 16" data-edge="hi"/>
      <path d="M26 16 L26 50" data-edge="hi"/>
      <path d="M26 50 L50 61 L74 50" data-edge="lo"/>
      <path d="M26 40 L50 51 L74 40" stroke-dasharray="5 3" stroke-opacity="0.55"/>
      <!-- 锥斗：箱体底面菱形收敛到卸料口 -->
      <polygon points="26,50 50,61 50,83 44,80" data-face="front"/>
      <polygon points="50,61 74,50 56,80 50,83" data-face="side"/>
      <path d="M26 50 L44 80" data-edge="hi"/>
      <!-- 卸料口 -->
      <polygon points="44,80 50,83 50,88 44,85" data-face="front"/>
      <polygon points="50,83 56,80 56,85 50,88" data-face="side"/>
      <path d="M44 80 L50 83 L56 80" data-edge="lo"/>
      <path d="M44 85 L50 88 L56 85" data-edge="lo"/>
      <path d="M44 80 L44 85" data-edge="hi"/>
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
