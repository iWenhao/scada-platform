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

/**
 * 采煤机截割滚筒的面基转子片段（与素材滚筒同圆心同外径）。
 *
 * buildAssetComponents 从素材原稿挖出的滚筒是线条稿，覆盖机身的同时必须换掉转子片段，
 * 否则 2.5D 下面基机身配线条稿滚筒。锚点与圆心沿用 coalAssetMotion 不动——滚筒位置由
 * 圆心决定，片段只换画法：正面盘（cap）+ 轮缘环（lo）+ 六组轮叶（hi）+ 毂心两级 cap，
 * 16 支截齿按 22.5° 均布逐条算坐标（r47→r56，压在素材滚筒 r42.9+描边的外侧）。
 */
function shearerDrum25d(cx: number, cy: number): string {
  const radial = (r1: number, r2: number, count: number, total: number) =>
    Array.from({ length: count }, (_, k) => {
      const a = (k * 2 * Math.PI) / total
      const c = Math.cos(a)
      const s = Math.sin(a)
      return `<line x1="${(cx + r1 * c).toFixed(1)}" y1="${(cy + r1 * s).toFixed(1)}" x2="${(cx + r2 * c).toFixed(1)}" y2="${(cy + r2 * s).toFixed(1)}"/>`
    })
  const at = (r: number) => `cx="${cx}" cy="${cy}" r="${r}"`
  return `<g fill="none" stroke="currentColor" stroke-linecap="round">
    <circle ${at(46)} data-face="cap"/>
    <circle ${at(46)} data-edge="hi" stroke-width="3"/>
    <circle ${at(36)} data-edge="lo" stroke-width="2.5"/>
    <g data-edge="hi" stroke-width="2.5">${radial(22, 34, 6, 6).join('')}</g>
    <g data-edge="hi" stroke-width="4">${radial(47, 56, 16, 16).join('')}</g>
    <circle ${at(17.3)} data-face="cap"/>
    <circle ${at(17.3)} data-edge="hi" stroke-width="2"/>
    <circle ${at(11.4)} data-face="cap"/>
    <circle ${at(11.4)} data-edge="hi" stroke-width="1.6"/>
  </g>`
}

/**
 * 综采素材件的面基覆盖表（指南 §4.5 同姿态重绘）：`icon` 仍是素材原稿（2D 画布与
 * 组件面板共用），面基稿写进 `icon25d`——viewBox 逐字沿用、外沿不越原稿轮廓、
 * 默认尺寸沿用素材自带值。素材原稿是正面平视稿，按「正面 + 顶带 + 右侧带」切片。
 */
const illustratedAssets: Record<string, { icon25d: string; rotors?: [string, string] }> = {
  coal_combination_switch: {
    icon25d: `<svg viewBox="0 0 161 72" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="87" cy="70.4" rx="62" ry="1.4" data-shadow="1"/>
      <!-- 左侧进线电缆：三根，pipe 双线，端头压进箱体 -->
      <g data-pipe="base">
        <path d="M0 36.5 L19 36.5"/>
        <path d="M0 45.5 L19 45.5"/>
        <path d="M0 54.5 L19 54.5"/>
      </g>
      <g data-pipe="hi" stroke-width="1.1">
        <path d="M0 35.1 L19 35.1"/>
        <path d="M0 44.1 L19 44.1"/>
        <path d="M0 53.1 L19 53.1"/>
      </g>
      <!-- 底座撬板 -->
      <rect x="13" y="63" width="147" height="7" data-face="deck"/>
      <path d="M13 63 L160 63" data-edge="hi" stroke-width="1.4"/>
      <path d="M13 70 L160 70" data-edge="lo"/>
      <!-- 箱体：正面 + 顶带 + 右侧带 -->
      <rect x="19" y="0" width="136" height="63" data-face="front"/>
      <rect x="19" y="0" width="136" height="4" data-face="top"/>
      <rect x="148" y="4" width="7" height="59" data-face="side"/>
      <path d="M19 0 L155 0" data-edge="hi"/>
      <path d="M19 0 L19 63" data-edge="hi"/>
      <path d="M19 63 L155 63" data-edge="lo"/>
      <path d="M148 4 L148 63" data-edge="lo" stroke-width="1.4"/>
      <rect x="25" y="5" width="123" height="58" data-edge="lo" stroke-width="1.2"/>
      <!-- 四列操作把手：门板上的凹槽，lo 压暗 -->
      <g data-edge="lo" stroke-width="1.1">
        <rect x="38" y="13" width="18" height="6"/>
        <rect x="38" y="27" width="18" height="6"/>
        <rect x="64" y="13" width="18" height="6"/>
        <rect x="64" y="27" width="18" height="6"/>
        <rect x="92" y="13" width="18" height="6"/>
        <rect x="92" y="27" width="18" height="6"/>
        <rect x="118" y="13" width="18" height="6"/>
        <rect x="118" y="27" width="18" height="6"/>
      </g>
      <circle cx="50" cy="48" r="7" data-face="cap"/>
      <circle cx="50" cy="48" r="7" data-edge="hi" stroke-width="1.6"/>
      <circle cx="124" cy="48" r="7" data-face="cap"/>
      <circle cx="124" cy="48" r="7" data-edge="hi" stroke-width="1.6"/>
    </g>
  </svg>`,
  },
  coal_scraper: {
    icon25d: `<svg viewBox="0 0 81 88" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="39.5" cy="87.3" rx="36" ry="1.4" data-shadow="1"/>
      <!-- 槽体：正面 + 顶带 + 右侧带 + 底走道 -->
      <rect x="0" y="0" width="79" height="86" data-face="front"/>
      <rect x="0" y="0" width="79" height="6" data-face="top"/>
      <rect x="74" y="6" width="5" height="74" data-face="side"/>
      <rect x="0" y="80" width="79" height="6" data-face="deck"/>
      <path d="M0 0 L79 0" data-edge="hi"/>
      <path d="M0 0 L0 86" data-edge="hi"/>
      <path d="M0 80 L79 80" data-edge="hi" stroke-width="1.2"/>
      <path d="M0 86 L79 86" data-edge="lo"/>
      <path d="M74 6 L74 80" data-edge="lo" stroke-width="1.2"/>
      <rect x="0" y="15" width="79" height="56" data-edge="lo" stroke-width="1.2"/>
      <!-- 三条刮板链（竖圆柱面） -->
      <rect x="12" y="22" width="8" height="42" data-face="body"/>
      <rect x="35" y="22" width="8" height="42" data-face="body"/>
      <rect x="59" y="22" width="8" height="42" data-face="body"/>
      <!-- 上排刮板 -->
      <g data-edge="lo" stroke-width="1.1">
        <rect x="9" y="14" width="8" height="4" rx="2"/>
        <rect x="26.7" y="14" width="8" height="4" rx="2"/>
        <rect x="44.3" y="14" width="8" height="4" rx="2"/>
        <rect x="62" y="14" width="8" height="4" rx="2"/>
        <path d="M1 16 L9 16 M18.3 16 L26.3 16 M35.5 16 L43.5 16 M53.5 16 L61.5 16 M69 16 L77 16"/>
      </g>
      <!-- 下排刮板 -->
      <g data-edge="lo" stroke-width="1.1">
        <rect x="10" y="68" width="8" height="4" rx="2"/>
        <rect x="27" y="68" width="8" height="4" rx="2"/>
        <rect x="44" y="68" width="8" height="4" rx="2"/>
        <rect x="61" y="68" width="8" height="4" rx="2"/>
        <path d="M1 70 L10 70 M18 70 L27 70 M35 70 L44 70 M52 70 L61 70 M69 70 L77 70"/>
      </g>
    </g>
  </svg>`,
  },
  coal_belt: {
    icon25d: `<svg viewBox="0 0 81 88" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="39.5" cy="87.3" rx="36" ry="1.4" data-shadow="1"/>
      <rect x="0" y="0" width="79" height="86" data-face="front"/>
      <rect x="0" y="0" width="79" height="6" data-face="top"/>
      <rect x="74" y="6" width="5" height="74" data-face="side"/>
      <rect x="0" y="80" width="79" height="6" data-face="deck"/>
      <path d="M0 0 L79 0" data-edge="hi"/>
      <path d="M0 0 L0 86" data-edge="hi"/>
      <path d="M0 80 L79 80" data-edge="hi" stroke-width="1.2"/>
      <path d="M0 86 L79 86" data-edge="lo"/>
      <path d="M74 6 L74 80" data-edge="lo" stroke-width="1.2"/>
      <rect x="0" y="15" width="79" height="56" data-edge="lo" stroke-width="1.2"/>
      <!-- 带面纵向肋条 -->
      <rect x="12" y="16" width="8" height="54" data-face="body"/>
      <rect x="35" y="16" width="8" height="54" data-face="body"/>
      <rect x="59" y="16" width="8" height="54" data-face="body"/>
    </g>
  </svg>`,
  },
  coal_drive_tail: {
    icon25d: `<svg viewBox="0 0 118 88" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="58" cy="87.3" rx="52" ry="1.4" data-shadow="1"/>
      <rect x="0" y="0" width="116" height="86" data-face="front"/>
      <rect x="0" y="0" width="116" height="5" data-face="top"/>
      <rect x="111" y="5" width="5" height="81" data-face="side"/>
      <path d="M0 0 L116 0" data-edge="hi"/>
      <path d="M0 0 L0 86" data-edge="hi"/>
      <path d="M0 86 L116 86" data-edge="lo"/>
      <path d="M111 5 L111 86" data-edge="lo" stroke-width="1.2"/>
      <rect x="0" y="16" width="116" height="54" data-edge="lo" stroke-width="1.2"/>
      <!-- 中部开口：链槽进口，hole 压到接近背景 -->
      <rect x="0" y="21" width="116" height="44" data-face="hole"/>
      <rect x="0" y="21" width="116" height="44" data-edge="hi" stroke-width="1.2"/>
    </g>
  </svg>`,
  },
  coal_hydraulic_support: {
    icon25d: `<svg viewBox="0 0 98 302" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="48" cy="300.5" rx="46" ry="1.6" data-shadow="1"/>
      <!-- 顶梁两层 -->
      <rect x="0" y="0" width="96" height="10" data-face="front"/>
      <rect x="0" y="0" width="96" height="3" data-face="top"/>
      <path d="M0 0 L96 0" data-edge="hi"/>
      <path d="M0 0 L0 10" data-edge="hi"/>
      <path d="M0 10 L96 10" data-edge="lo"/>
      <rect x="5" y="10" width="86" height="10" data-face="front"/>
      <path d="M5 10 L5 20" data-edge="hi"/>
      <path d="M5 20 L91 20" data-edge="lo"/>
      <!-- 顶梁柱帽（铰接窝，lo 凹槽） -->
      <g data-edge="lo" stroke-width="1.2">
        <rect x="5" y="24" width="8" height="8"/>
        <rect x="31" y="24" width="8" height="8"/>
        <rect x="57" y="24" width="8" height="8"/>
        <rect x="83" y="24" width="8" height="8"/>
        <rect x="13" y="26" width="18" height="4"/>
        <rect x="39" y="26" width="18" height="4"/>
        <rect x="65" y="26" width="18" height="4"/>
      </g>
      <!-- 上平衡梁 -->
      <rect x="5" y="36" width="86" height="47" data-face="front"/>
      <rect x="5" y="36" width="86" height="3" data-face="top"/>
      <rect x="87" y="39" width="4" height="44" data-face="side"/>
      <path d="M5 36 L91 36" data-edge="hi"/>
      <path d="M5 36 L5 83" data-edge="hi"/>
      <path d="M5 83 L91 83" data-edge="lo"/>
      <path d="M87 39 L87 83" data-edge="lo" stroke-width="1.2"/>
      <!-- 平衡梁柱帽（叠在梁底） -->
      <rect x="30" y="73" width="36" height="14" data-face="front"/>
      <path d="M30 73 L30 87" data-edge="hi"/>
      <path d="M30 78 L66 78" data-edge="lo" stroke-width="1.2"/>
      <path d="M43 73 L43 87" data-edge="lo" stroke-width="1.2"/>
      <!-- 立柱主段（下端带活塞杆缺口） -->
      <path d="M5 87 L91 87 L91 200 L83 200 L83 208 L13 208 L13 200 L5 200 Z" data-face="front"/>
      <rect x="84" y="87" width="7" height="113" data-face="side"/>
      <path d="M5 87 L91 87" data-edge="hi"/>
      <path d="M5 87 L5 200" data-edge="hi"/>
      <path d="M5 200 L13 200 L13 208 L83 208 L83 200 L91 200" data-edge="lo"/>
      <path d="M84 87 L84 200" data-edge="lo" stroke-width="1.2"/>
      <!-- 中柱帽 -->
      <g data-edge="lo" stroke-width="1.2">
        <rect x="5" y="212" width="8" height="8"/>
        <rect x="31" y="212" width="8" height="8"/>
        <rect x="57" y="212" width="8" height="8"/>
        <rect x="83" y="212" width="8" height="8"/>
        <rect x="13" y="214" width="18" height="4"/>
        <rect x="39" y="214" width="18" height="4"/>
        <rect x="65" y="214" width="18" height="4"/>
      </g>
      <!-- 下伸缩段 -->
      <rect x="5" y="224" width="86" height="42" data-face="front"/>
      <rect x="5" y="224" width="86" height="3" data-face="top"/>
      <rect x="87" y="227" width="4" height="39" data-face="side"/>
      <path d="M5 224 L91 224" data-edge="hi"/>
      <path d="M5 224 L5 266" data-edge="hi"/>
      <path d="M5 266 L91 266" data-edge="lo"/>
      <path d="M87 227 L87 266" data-edge="lo" stroke-width="1.2"/>
      <!-- 底柱帽 -->
      <g data-edge="lo" stroke-width="1.2">
        <rect x="5" y="270" width="8" height="8"/>
        <rect x="31" y="270" width="8" height="8"/>
        <rect x="57" y="270" width="8" height="8"/>
        <rect x="83" y="270" width="8" height="8"/>
        <rect x="13" y="272" width="18" height="4"/>
        <rect x="39" y="272" width="18" height="4"/>
        <rect x="65" y="272" width="18" height="4"/>
      </g>
      <!-- 底座 -->
      <rect x="5" y="282" width="86" height="18" data-face="deck"/>
      <path d="M5 282 L91 282" data-edge="hi"/>
      <path d="M5 300 L91 300" data-edge="lo"/>
    </g>
  </svg>`,
  },
  coal_crusher: {
    icon25d: `<svg viewBox="0 0 112 214" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="55" cy="212.4" rx="44" ry="1.6" data-shadow="1"/>
      <!-- 机壳：正面 + 顶带 + 右侧带 -->
      <rect x="12" y="0" width="86" height="212" data-face="front"/>
      <rect x="12" y="0" width="86" height="4" data-face="top"/>
      <rect x="94" y="4" width="4" height="208" data-face="side"/>
      <path d="M12 0 L98 0" data-edge="hi"/>
      <path d="M12 0 L12 212" data-edge="hi"/>
      <path d="M12 212 L98 212" data-edge="lo"/>
      <path d="M94 4 L94 212" data-edge="lo" stroke-width="1.2"/>
      <!-- 转子笼双内框 -->
      <rect x="12" y="69.5" width="86" height="73" data-edge="lo" stroke-width="1.2"/>
      <rect x="12" y="79" width="86" height="54" data-edge="lo" stroke-width="1.2"/>
      <!-- 两列击打锤：保留素材实色（装饰件，不参与面光照） -->
      <path d="M12,19 L12,14 L28,14 L28,19 L12,19 Z M12,37 L12,32 L28,32 L28,37 L12,37 Z M12,55 L12,50 L28,50 L28,55 L12,55 Z M12,73 L12,68 L28,68 L28,73 L12,73 Z M12,91 L12,86 L28,86 L28,91 L12,91 Z M12,109 L12,104 L28,104 L28,109 L12,109 Z M12,127 L12,122 L28,122 L28,127 L12,127 Z M12,145 L12,140 L28,140 L28,145 L12,145 Z M12,163 L12,158 L28,158 L28,163 L12,163 Z M12,181 L12,176 L28,176 L28,181 L12,181 Z M12,199 L12,194 L28,194 L28,199 L12,199 Z" fill="currentColor" stroke="none"/>
      <path d="M82,19 L82,14 L98,14 L98,19 L82,19 Z M82,37 L82,32 L98,32 L98,37 L82,37 Z M82,55 L82,50 L98,50 L98,55 L82,55 Z M82,73 L82,68 L98,68 L98,73 L82,73 Z M82,91 L82,86 L98,86 L98,91 L82,91 Z M82,109 L82,104 L98,104 L98,109 L82,109 Z M82,127 L82,122 L98,122 L98,127 L82,127 Z M82,145 L82,140 L98,140 L98,145 L82,145 Z M82,163 L82,158 L98,158 L98,163 L82,163 Z M82,181 L82,176 L98,176 L98,181 L82,181 Z M82,199 L82,194 L98,194 L98,199 L82,199 Z" fill="currentColor" stroke="none"/>
      <!-- 左右铰接支座：窄立板 + 外伸轴头 -->
      <rect x="6" y="35" width="6" height="35" data-face="front"/>
      <rect x="0" y="44.5" width="6" height="16" data-face="side"/>
      <path d="M6 35 L6 70" data-edge="hi"/>
      <rect x="100" y="35" width="6" height="35" data-face="front"/>
      <rect x="106" y="44.5" width="6" height="16" data-face="side"/>
      <path d="M106 44.5 L106 60.5" data-edge="lo"/>
    </g>
  </svg>`,
  },
  coal_stage_loader: {
    icon25d: `<svg viewBox="0 0 88 148" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="44" cy="146.5" rx="40" ry="1.4" data-shadow="1"/>
      <!-- 顶帽 -->
      <rect x="0" y="0" width="86" height="12" data-face="front"/>
      <rect x="0" y="0" width="86" height="4" data-face="top"/>
      <path d="M0 0 L86 0" data-edge="hi"/>
      <path d="M0 0 L0 12" data-edge="hi"/>
      <path d="M0 12 L86 12" data-edge="lo"/>
      <!-- 槽体 -->
      <rect x="0" y="12" width="86" height="64" data-face="front"/>
      <rect x="81" y="16" width="5" height="60" data-face="side"/>
      <path d="M0 12 L0 76" data-edge="hi"/>
      <path d="M0 76 L86 76" data-edge="lo"/>
      <path d="M81 16 L81 76" data-edge="lo" stroke-width="1.2"/>
      <rect x="21" y="12" width="44" height="64" data-edge="lo" stroke-width="1.2"/>
      <!-- 两根支腿 -->
      <rect x="10" y="76" width="20" height="29" data-face="front"/>
      <rect x="27" y="76" width="3" height="29" data-face="side"/>
      <path d="M10 76 L10 105" data-edge="hi"/>
      <path d="M10 105 L30 105" data-edge="lo"/>
      <rect x="52" y="76" width="20" height="29" data-face="front"/>
      <rect x="69" y="76" width="3" height="29" data-face="side"/>
      <path d="M52 76 L52 105" data-edge="hi"/>
      <path d="M52 105 L72 105" data-edge="lo"/>
      <!-- 腿底连接板（保留素材实色） -->
      <rect x="10" y="105" width="6" height="10" fill="currentColor" stroke="none"/>
      <rect x="70" y="105" width="6" height="10" fill="currentColor" stroke="none"/>
      <rect x="10" y="136" width="6" height="10" fill="currentColor" stroke="none"/>
      <rect x="70" y="136" width="6" height="10" fill="currentColor" stroke="none"/>
      <!-- 底座 H 形 -->
      <path d="M22 115 L22 121 L64 121 L64 115 L76 115 L76 136 L64 136 L64 130 L22 130 L22 136 L10 136 L10 115 Z" data-face="front"/>
      <path d="M10 115 L22 115 M64 115 L76 115" data-edge="hi"/>
      <path d="M10 136 L76 136" data-edge="lo"/>
    </g>
  </svg>`,
  },
  coal_drive_head: {
    icon25d: `<svg viewBox="0 0 191 202" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="95" cy="200.4" rx="85" ry="1.6" data-shadow="1"/>
      <!-- L 形主机架：正面 + 顶带 + 右侧带 -->
      <path d="M0 86 L75 86 L75 0 L161 0 L161 172 L0 172 Z" data-face="front"/>
      <rect x="75" y="0" width="86" height="4" data-face="top"/>
      <rect x="156" y="4" width="5" height="168" data-face="side"/>
      <path d="M75 0 L161 0" data-edge="hi"/>
      <path d="M75 0 L75 86" data-edge="hi"/>
      <path d="M0 86 L75 86" data-edge="hi"/>
      <path d="M0 86 L0 172" data-edge="hi"/>
      <path d="M0 172 L161 172" data-edge="lo"/>
      <path d="M156 4 L156 172" data-edge="lo" stroke-width="1.2"/>
      <!-- 内板缝（双圈内 L） -->
      <path d="M0 156 L145 156 M0 102 L91 102 M91 0 L91 102 M145 0 L145 156" data-edge="lo" stroke-width="1.2"/>
      <path d="M0 166 L154.5 166 M154.5 0 L154.5 166 M0 92 L81.5 92 M81.5 0 L81.5 92" data-edge="lo" stroke-width="1.2"/>
      <!-- 右侧驱动电机：箱体 + 上方接线盒 -->
      <rect x="161" y="82" width="28" height="38" data-face="front"/>
      <rect x="185" y="86" width="4" height="30" data-face="side"/>
      <path d="M161 82 L189 82" data-edge="hi"/>
      <path d="M161 120 L189 120" data-edge="lo"/>
      <rect x="161" y="102" width="28" height="11" data-edge="lo" stroke-width="1.2"/>
      <rect x="161" y="52" width="22" height="20" data-face="front"/>
      <path d="M161 52 L183 52" data-edge="hi"/>
      <path d="M161 72 L183 72" data-edge="lo" stroke-width="1.2"/>
      <!-- 底部减速器：箱体 + 散热槽 + 端板 -->
      <rect x="60" y="172" width="38" height="28" data-face="front"/>
      <rect x="60" y="172" width="38" height="4" data-face="top"/>
      <rect x="94" y="176" width="4" height="24" data-face="side"/>
      <path d="M60 172 L98 172" data-edge="hi"/>
      <path d="M60 200 L98 200" data-edge="lo"/>
      <rect x="67" y="176" width="11" height="24" data-edge="lo" stroke-width="1.2"/>
      <rect x="98" y="178" width="5" height="16" data-face="side"/>
      <rect x="103" y="184" width="5" height="5" fill="currentColor" stroke="none"/>
      <rect x="108" y="172" width="20" height="22" data-face="front"/>
      <path d="M108 172 L128 172" data-edge="hi"/>
    </g>
  </svg>`,
  },
  coal_shearer_wide: {
    // 滚筒不画在基稿里：它是按锚点挖出的旋转件，由 rotors 的面基片段绕原圆心重画。
    // 首行定位框把内容包围盒钉满整个 viewBox——25D 基图与 2D 基图（挖滚筒后补的定位框）
    // 必须同口径，滚筒的坐标映射才不会错位
    icon25d: `<svg viewBox="0 0 610 232" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="610" height="232" fill="none" stroke="none"></rect>
    <g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="307" cy="226" rx="150" ry="3.5" data-shadow="1"/>
      <ellipse cx="553" cy="200.5" rx="46" ry="2.5" data-shadow="1"/>
      <!-- 行走部底架：梯形条 + 两端滑靴（先画，被机身压住上沿） -->
      <polygon points="198,180 429,180 447,192 167,192" data-face="front"/>
      <rect x="198" y="180" width="231" height="5" data-face="top"/>
      <path d="M198 180 L429 180" data-edge="hi"/>
      <path d="M429 180 L447 192" data-edge="hi"/>
      <path d="M198 180 L167 192" data-edge="hi"/>
      <path d="M181 192 L419 192" data-edge="lo" stroke-width="2.5"/>
      <rect x="167" y="192" width="14" height="26" data-face="front"/>
      <polygon points="167,218 181,218 184,227 164,227" data-face="front"/>
      <path d="M167 192 L167 218" data-edge="hi"/>
      <path d="M164 227 L184 227" data-edge="lo" stroke-width="2.5"/>
      <circle cx="176" cy="223" r="2.2" fill="currentColor" stroke="none"/>
      <rect x="419" y="192" width="14" height="26" data-face="front"/>
      <polygon points="419,218 433,218 436,227 416,227" data-face="front"/>
      <path d="M419 192 L419 218" data-edge="hi"/>
      <path d="M416 227 L436 227" data-edge="lo" stroke-width="2.5"/>
      <circle cx="422" cy="223" r="2.2" fill="currentColor" stroke="none"/>
      <!-- 机身：横卧筒体的正面投影，两端是竖直侧圆端盖 -->
      <rect x="138" y="139" width="325" height="44" rx="22" data-face="front"/>
      <ellipse cx="147" cy="161" rx="7" ry="20" data-face="cap"/>
      <ellipse cx="147" cy="161" rx="7" ry="20" data-edge="hi" stroke-width="2.5"/>
      <ellipse cx="454" cy="161" rx="7" ry="20" data-face="cap"/>
      <ellipse cx="454" cy="161" rx="7" ry="20" data-edge="hi" stroke-width="2.5"/>
      <!-- 顶部盖板 -->
      <polygon points="177,143 187,138 414,138 425,143 425,148 177,148" data-face="top"/>
      <path d="M177 143 L187 138 L414 138 L425 143" data-edge="hi" stroke-width="2.5"/>
      <path d="M177 148 L425 148" data-edge="lo" stroke-width="2.5"/>
      <g data-edge="lo" stroke-width="2.5">
        <path d="M232 148 L232 178"/>
        <path d="M303 148 L303 178"/>
        <path d="M375 148 L375 178"/>
        <path d="M199 178 L430 178"/>
      </g>
      <!-- 输送机槽沿（实色楔条，不参与面光照） -->
      <polygon points="212,184 214,181 388,181 390,184" fill="currentColor" stroke="none"/>
      <!-- 左张紧臂：机身左端连到滚筒毂，滚筒位由旋转件补上 -->
      <path d="M90 90 L150 150" data-pipe="base" stroke-width="9"/>
      <path d="M92.5 87.5 L152.5 147.5" data-pipe="hi" stroke-width="2.5"/>
      <circle cx="151.8" cy="151.8" r="13.3" data-face="cap"/>
      <circle cx="151.8" cy="151.8" r="13.3" data-edge="hi" stroke-width="2.5"/>
      <circle cx="151.8" cy="151.8" r="5.3" data-face="cap"/>
      <!-- 右张紧臂 -->
      <rect x="437" y="139" width="128" height="26" rx="13" data-face="front"/>
      <path d="M444 139 L558 139" data-edge="hi" stroke-width="2.5"/>
      <path d="M444 165 L558 165" data-edge="lo" stroke-width="2.5"/>
      <circle cx="449.9" cy="152.1" r="12.9" data-face="cap"/>
      <circle cx="449.9" cy="152.1" r="12.9" data-edge="hi" stroke-width="2.5"/>
      <circle cx="449.9" cy="152.1" r="5.3" data-face="cap"/>
    </g>
  </svg>`,
    rotors: [shearerDrum25d(78.441366, 78.441366), shearerDrum25d(553.742025, 152.190819)],
  },
}

const coalAssetComponents = buildAssetComponents(
  'coal',
  coalAssetIcons,
  coalAssetMeta,
  coalAssetMotion,
).map((def) => {
  const art = illustratedAssets[def.type]
  if (!art) return def
  // 采煤机的滚筒片段是从素材原稿挖出的线条稿：覆盖机身的同时按序替换转子片段，
  // 锚点与圆心沿用 coalAssetMotion 不变（指南 §4.5 第 4 条：转子必须与新机身同步重画）
  const rotors = def.motion?.rotors
  if (art.rotors && rotors && rotors.length === art.rotors.length) {
    return {
      ...def,
      icon25d: art.icon25d,
      motion: {
        ...def.motion!,
        rotors: rotors.map((rotor, i) => ({ ...rotor, svg: art.rotors![i] })),
      },
    }
  }
  return { ...def, icon25d: art.icon25d }
})

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
  // 采煤机的两只滚筒按 coalAssetMotion 声明挖成旋转件，其余图元保持静止；
  // 九台的面基稿经 illustratedAssets 以 icon25d 覆盖，2D 仍用素材原稿
  ...coalAssetComponents,
]
