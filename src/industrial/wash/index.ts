/**
 * 洗选系统（外部素材导入）：磁选机 / 分料器 / 弧形筛 / 溜槽 / 原煤仓 / 煤仓 /
 * 浓缩机 / 浅槽分选机 / 脱介筛 / 压滤机 等 17 台。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 * 面基覆盖表（2.5D）按指南 §4.5 同姿态重绘：viewBox 逐字沿用原稿、外沿不越
 * 原稿轮廓，装饰线沿用原稿路径；17 台确认稿已由需求方逐台确认（2026-10-25）。
 */
import { buildAssetComponents } from '../assetComponents'
import { washIcons, washMeta } from './icons.generated'
import type { ComponentDefinition } from '@/types/scada'

/** 素材件的面基覆盖表：只有 icon25d 与可选的 name，默认尺寸沿用素材自带值 */
const illustratedAssets: Record<string, { icon25d: string; name?: string }> = {
// 磁选机：滚筒带（叠层矩形保留为纹理）+ 梯形槽 + 两侧立板
  wash_magnetic_separator: { icon25d: `<svg viewBox="0 0 88 48" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="44" cy="46.5" rx="36" ry="0.9" data-shadow="1"/>
    <polygon points="4.6,0.8 82.4,0.8 82.4,3.2 78,3.8 4.6,3.8" data-face="top"/>
    <polygon points="78,3.8 82.4,3.2 82.4,23.6 78,23.6" data-face="side"/>
    <polygon points="4.6,3.8 78,3.8 78,23.6 4.6,23.6" data-face="front"/>
    <g transform="translate(4.6,0.8)" stroke-width="1">
      <rect x="0.6" y="0.6" width="77.8" height="22.8" rx="11.4"/><rect x="4.76" y="0.6" width="73.64" height="22.8" rx="11.4"/>
      <rect x="21.39" y="0.6" width="57.01" height="22.8" rx="11.4"/><rect x="17.23" y="0.6" width="61.17" height="22.8" rx="11.4"/>
      <rect x="33.86" y="0.6" width="44.54" height="22.8" rx="11.4"/><rect x="46.34" y="0.6" width="32.06" height="22.8" rx="11.4"/>
      <rect x="42.18" y="0.6" width="36.22" height="22.8" rx="11.4"/><rect x="54.65" y="0.6" width="23.75" height="22.8" rx="11.4"/>
      <rect x="8.92" y="0.6" width="69.48" height="22.8" rx="11.4"/><rect x="25.55" y="0.6" width="52.85" height="22.8" rx="11.4"/>
      <rect x="13.07" y="0.6" width="65.33" height="22.8" rx="11.4"/><rect x="29.71" y="0.6" width="48.69" height="22.8" rx="11.4"/>
      <rect x="38.02" y="0.6" width="40.38" height="22.8" rx="11.4"/><rect x="50.49" y="0.6" width="27.91" height="22.8" rx="11.4"/>
    </g>
    <rect fill="currentColor" stroke="none" x="5.1" y="14.3" width="77" height="1" rx="0.5"/>
    <path d="M0.6,24.9 L4.4,26.5 L4.4,47.4 L0.6,47.4 Z" data-face="side"/>
    <path d="M83.6,24.9 L87.4,26.5 L87.4,47.4 L83.6,47.4 Z" data-face="side"/>
    <path d="M0.6,20.6 L87.4,20.6 L87.4,24.6 L47.4,42 L40,42 L0.6,24.6 Z" data-face="front"/>
    <path d="M4.6,3.8 L78,3.8" data-edge="hi"/>
    <path d="M4.6,0.8 L4.6,23.6" data-edge="hi"/>
    <path d="M78,3.8 L82.4,3.2" data-edge="lo"/>
    <path d="M78,3.8 L78,23.6" data-edge="lo"/>
    <path d="M0.6,42 L40,42" data-edge="lo"/>
    <path d="M27.13,36.6 L33.49,39.4 L4.6,39.4 L4.6,36.6 Z M83.4,36.6 L83.4,39.4 L53.99,39.4 L60.45,36.6 Z" data-edge="lo" stroke-width="1"/>
  </g>
</svg>` },

  // 分料器：主槽 + 闸箱 + 右侧给料机构（机构线条沿用原稿）
  wash_distributor: { icon25d: `<svg viewBox="0 0 82 61" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="33" cy="59" rx="26" ry="0.9" data-shadow="1"/>
    <path d="M47.0454983,1.11407359 L47.045,12.9390736 L53.860939,24.6 L49.5349426,24.6 L49.5349426,37.5 L61.3828392,37.5 L66,45.5170434 L40.7195805,60 L33,46.7320736 L25.2804195,60 L1.17239551e-13,45.5170434 L18.968,12.9160736 L18.9683848,1.11407359 L47.0454983,1.11407359 Z" data-face="front"/>
    <path d="M18.1227428,0 L25.5752883,0 L40.4571243,0 L47.8772572,0 C48.4973309,-1.139057e-16 49,0.502669094 49,1.12274285 L49,2 L17,2 L17,1.12274285 C17,0.502669094 17.5022669,1.139057e-16 18.1227428,0 Z" fill="currentColor" stroke="none"/>
    <polygon points="44.6,24.6 68.4,24.6 68.4,26.6 65.2,27.4 44.6,27.4" data-face="top"/>
    <polygon points="65.2,27.4 68.4,26.6 68.4,32.4 65.2,32.4" data-face="side"/>
    <polygon points="44.6,27.4 65.2,27.4 65.2,32.4 44.6,32.4" data-face="front"/>
    <path d="M18.97,1.6 L47.05,1.6" data-edge="hi"/>
    <path d="M0,45.5 L18.97,12.94" data-edge="hi"/>
    <path d="M66,45.5 L47.05,12.94" data-edge="lo"/>
    <path d="M44.6,27.4 L65.2,27.4" data-edge="hi"/>
    <path d="M65.2,27.4 L68.4,26.6" data-edge="lo"/>
    <path d="M25.28,60 L33,46.73" data-edge="lo"/>
    <path d="M41.4,26.6 L41.4,30.4 L39.5,30.4 C38.9753295,30.4 38.5003295,30.1873353 38.1564971,29.8435029 C37.8126647,29.4996705 37.6,29.0246705 37.6,28.5 C37.6,27.9753295 37.8126647,27.5003295 38.1564971,27.1564971 C38.5003295,26.8126647 38.9753295,26.6 39.5,26.6 Z" stroke-width="1"/>
    <rect transform="translate(36.384420, 32.039821) rotate(-45.000000) translate(-36.384420, -32.039821)" x="34.48442" y="32.1398208" width="3.8" height="1" stroke-width="1"/>
    <rect fill="currentColor" stroke="none" x="76" y="25" width="1.2" height="7"/>
    <rect fill="currentColor" stroke="none" transform="translate(72.6, 27.2) rotate(-270.000000) translate(-72.6, -27.2)" x="72" y="23.2" width="1.2" height="8"/>
    <rect fill="currentColor" stroke="none" transform="translate(60.1, 37.5) rotate(-270.000000) translate(-60.1, -37.5)" x="59.5" y="23.5" width="1.2" height="28" rx="0.5"/>
    <rect fill="currentColor" stroke="none" transform="translate(72.6, 29.8) rotate(-270.000000) translate(-72.6, -29.8)" x="72" y="25.8" width="1.2" height="8"/>
    <path d="M69,24.6 L79,24.6 C79.5522847,24.6 80,25.0477153 80,25.6 L80,31.4 C80,31.9522847 79.5522847,32.4 79,32.4 L69,32.4" stroke-width="1"/>
    <path d="M43.9824654,24.172708 C44.3528949,24.3531224 44.4,24.4601453 44.4,24.5723235 L44.4,32.5250771 C44.4,32.6355341 44.3552285,32.7355341 44.2828427,32.8079198 C44.2104569,32.8803056 44.1104569,32.9250771 44,32.9250771 C43.8914985,32.9250771 43.7876519,32.8809997 43.7122769,32.8029537 L41.6,30.6158284 L41.6,26.600392 L43.7050303,24.3021516 C43.7796362,24.2206979 43.8801948,24.1771955 43.9824654,24.172708 Z" stroke-width="1"/>
    <circle fill="currentColor" stroke="none" transform="translate(34.159074, 34.290551) rotate(-345.000000) translate(-34.159074, -34.290551)" cx="34.1590742" cy="34.2905506" r="1"/>
  </g>
</svg>` },

  // 弧形筛：斜筛面 top + 辊子 cap，内线沿用原稿
  wash_arc_screen: { icon25d: `<svg viewBox="0 0 72 82" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="38" cy="79" rx="30" ry="1" data-shadow="1"/>
    <polygon points="0 11.194542 34.9077158 0 44.0746765 1.89466858 49.9098816 5.04296875 63.7378398 48.9618846 70 56.4959507 38.6785858 80 31.7379363 71.4033204 21.1934397 78.7863666 0 69.1834305" data-face="top"/>
    <path d="M0,11.19 L34.91,0" data-edge="hi"/>
    <path d="M34.91,0 L44.07,1.89" data-edge="hi"/>
    <path d="M70,56.5 L38.68,80" data-edge="lo"/>
    <path d="M31.7,71.4 L0,69.18" data-edge="lo"/>
    <path d="M31.2758348,71.7076399 L63.7378398,48.9618846"/>
    <polyline points="0 11.6743546 16.2851325 15.5157524 31.7379363 71.4033204"/>
    <line x1="44.0746765" y1="2.33496094" x2="8.55726149" y2="13.6174779"/>
    <path d="M44.0746765,1.89466858 C42.3526054,20.9067592 48.9069932,36.5958312 63.7378398,48.9618846"/>
    <circle cx="13.5" cy="66.5" r="3.5" data-face="cap"/>
    <circle cx="13.5" cy="66.5" r="3.5" data-edge="hi"/>
    <ellipse fill="currentColor" stroke="none" cx="13.5" cy="66.5" rx="1.5" ry="1.5"/>
  </g>
</svg>` },

  // 溜槽：镜像烘进坐标的槽体 front + 上口双 top 带
  wash_chute: { icon25d: `<svg viewBox="0 0 75 81" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="40" cy="78.5" rx="34" ry="0.85" data-shadow="1"/>
    <polygon points="0.1,23.8 0.1,0 4.1,0 15.5,23.8 33.9,23.8 34.5,0 38.9,0 73.1,52.2 73.1,79.3 24,79.3" data-face="front"/>
    <polygon points="0.1,0 4.1,0 5.5,2.4 0.1,2.4" data-face="top"/>
    <polygon points="34.5,0 38.9,0 40.1,2.4 34.5,2.4" data-face="top"/>
    <path d="M0.1,23.8 L0.1,0" data-edge="hi"/>
    <path d="M0.1,0 L4.1,0" data-edge="hi"/>
    <path d="M34.5,0 L38.9,0" data-edge="hi"/>
    <path d="M24,79.3 L73.1,79.3" data-edge="lo"/>
    <path d="M73.1,52.2 L73.1,79.3" data-edge="lo"/>
    <polyline points="35,0 68.9,52.2 68.9,74.9 28.1,74.9 28.1,52.2 15.5,23.8"/>
    <line x1="33.86" y1="23.8" x2="68.42" y2="74.9"/>
    <line x1="24.3" y1="52.2" x2="24.3" y2="79.3"/>
    <path d="M0,23.67 L0,49.16 C0,50.01 0.69,50.7 1.53,50.7 C2.38,50.7 3.07,50.01 3.07,49.16 L3.07,31.14" fill="currentColor" stroke="none"/>
    <path d="M7.77,41.71 L7.77,58.16 C7.77,59 8.46,59.69 9.31,59.69 C10.15,59.69 10.84,59 10.84,58.16 L10.84,48.77" fill="currentColor" stroke="none"/>
  </g>
</svg>` },

  // 原煤仓：八角仓体 + 右侧旁仓 + 卸料口
  wash_raw_coal_bunker: { icon25d: `<svg viewBox="0 0 97 101" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="40" cy="97.6" rx="36" ry="1.6" data-shadow="1"/>
    <polygon points="0,8.06 16.2,0 51.7,0 67.9,8.06 67.9,78.26 40.7,95.73 27.1,95.73 0,78.26" data-face="front"/>
    <polygon points="0,8.06 16.2,0 51.7,0 67.9,8.06 63.4,10.8 4.6,10.8" data-face="top"/>
    <path d="M80.2241129,4.54545455 L94.6843854,11.7603261 L94.6843854,74.6191753 L70.3820598,90.0454545 L58.230897,90.0454545 L54.6212429,87.7544545 L67.8571429,78.2641557 L67.8571429,8.05816822 L60.8172429,4.54545455 Z" data-face="side"/>
    <path d="M16.2,0 L51.7,0" data-edge="hi"/>
    <path d="M0,8.06 L0,78.26" data-edge="hi"/>
    <path d="M67.9,8.06 L67.9,78.26" data-edge="lo"/>
    <path d="M0,78.26 L27.1,95.73" data-edge="lo"/>
    <path d="M67.9,78.26 L40.7,95.73" data-edge="lo"/>
    <path d="M94.68,11.76 L94.68,74.62" data-edge="lo"/>
    <line x1="67.8571429" y1="73.8636364" x2="95" y2="73.8636364" data-edge="lo" stroke-width="1"/>
    <line x1="0" y1="77.2727273" x2="67.8571429" y2="77.2727273" data-edge="lo" stroke-width="1"/>
    <path d="M58.2440476,90.0454545 L61.5778186,90.0454545 L67.3633537,90.0454545 L70.6845238,90.0454545 L70.6845238,92.0454545 C70.6845238,93.150024 69.7890933,94.0454545 68.6845238,94.0454545 L60.2440476,94.0454545 C59.1394781,94.0454545 58.2440476,93.150024 58.2440476,92.0454545 Z" fill="currentColor" stroke="none"/>
    <path d="M27,96 L30.7516886,96 L37.2624919,96 L41,96 L41,98 C41,99.1045695 40.1045695,100 39,100 L29,100 C27.8954305,100 27,99.1045695 27,98 Z" fill="currentColor" stroke="none"/>
  </g>
</svg>` },

  // 煤仓1：梯形仓体 + 横杆 + 料位三角
  wash_coal_bunker_1: { icon25d: `<svg viewBox="0 0 98 100" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="44" cy="97.2" rx="44" ry="0.8" data-shadow="1"/>
    <polygon points="18,8 70,8 84,90 4,90" data-face="front"/>
    <polygon points="18,8 70,8 66.8,11.6 21.2,11.6" data-face="top"/>
    <path d="M14,0 L30.0786656,0 L57.982108,0 L74,0 L74,4 C74,6.209139 72.209139,8 70,8 L18,8 C15.790861,8 14,6.209139 14,4 Z" fill="currentColor" stroke="none"/>
    <path d="M0,90 L23.5820429,90 L64.5070917,90 L88,90 L88,94 C88,96.209139 86.209139,98 84,98 L4,98 C1.790861,98 2.705415e-16,96.209139 0,94 Z" transform="translate(44, 94) rotate(-180) translate(-44, -94)" fill="currentColor" stroke="none"/>
    <line x1="0" y1="98" x2="96" y2="98" stroke-width="1.2"/>
    <path d="M18,8 L4,90" data-edge="hi"/>
    <path d="M18,11.6 L66.8,11.6" data-edge="hi"/>
    <path d="M70,8 L84,90" data-edge="lo"/>
    <path d="M4,90 L84,90" data-edge="lo"/>
    <path d="M56.6,32 L78.3522605,32 L78.3522605,33.2 L56.6,33.2 C56.2686292,33.2 56,32.9313708 56,32.6 C56,32.2686292 56.2686292,32 56.6,32 Z" fill="currentColor" stroke="none"/>
    <path d="M49.6,23 L76,23 L76.7824249,24.2 L49.6,24.2 C49.2686292,24.2 49,23.9313708 49,23.6 C49,23.2686292 49.2686292,23 49.6,23 Z" fill="currentColor" stroke="none"/>
    <path d="M41,51.39 C41.5583,52.72 43.2996,54.98 46.2238,58.16 C46.4105,58.37 46.3969,58.68 46.1934,58.87 C46.1012,58.95 45.9806,59 45.8554,59 L36.6615,59 C36.1092,59 35.6614,58.55 35.6614,58 C35.6614,57.83 35.7026,57.67 35.7813,57.53 C38.7024,52.11 40.442,50.07 41,51.39 Z" fill="currentColor" stroke="none"/>
    <path d="M55,51.39 C55.5583,52.72 57.2996,54.98 60.2238,58.16 C60.4105,58.37 60.3969,58.68 60.1934,58.87 C60.1012,58.95 59.9806,59 59.8554,59 L50.6615,59 C50.1092,59 49.6614,58.55 49.6614,58 C49.6614,57.83 49.7026,57.67 49.7813,57.53 C52.7024,52.11 54.442,50.07 55,51.39 Z" fill="currentColor" stroke="none"/>
    <path d="M48,61.39 C48.5583,62.72 50.2996,64.98 53.2238,68.16 C53.4105,68.37 53.3969,68.68 53.1934,68.87 C53.1012,68.95 52.9806,69 52.8554,69 L43.6615,69 C43.1092,69 42.6614,68.55 42.6614,68 C42.6614,67.83 42.7026,67.67 42.7813,67.53 C45.7024,62.11 47.442,60.07 48,61.39 Z" fill="currentColor" stroke="none"/>
  </g>
</svg>` },

  // 煤仓2：圆柱仓体 body + cap + 漏斗 front
  wash_coal_bunker_2: { icon25d: `<svg viewBox="0 0 83 101" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="40.6" cy="99" rx="38" ry="1" data-shadow="1"/>
    <path d="M0.6,13.4 L80.6,13.4 L80.6,65.37 C55.43,76.77 26.61,76.88 1.36,65.72 L0.6,65.37 Z" data-face="body"/>
    <ellipse cx="40.6" cy="13.4" rx="40" ry="13.4" data-face="cap"/>
    <ellipse cx="40.6" cy="13.4" rx="40" ry="13.4" data-edge="hi"/>
    <path d="M0.6,13.4 L0.6,65.37" data-edge="hi"/>
    <path d="M80.6,13.4 L80.6,65.37" data-edge="lo"/>
    <path d="M0.6,20.75 C18.8,14 62.4,14 80.6,20.75" data-edge="lo" stroke-width="1"/>
    <path d="M2.8,67.17 C26,77 55.4,77.1 78.9,67.17" data-edge="lo"/>
    <polygon points="2.78,67.17 35.6,93.36 45.6,93.36 78.92,67.17" data-face="front"/>
    <path d="M35.6,93.36 L45.6,93.36" data-edge="lo"/>
    <path d="M78.2,66.28 L81.2,64.54 L81.2,86.04 C81.2,86.87 80.53,87.54 79.7,87.54 C78.87,87.54 78.2,86.87 78.2,86.04 Z" fill="currentColor" stroke="none"/>
    <path d="M0,66.25 L3,64.54 L3,86.04 C3,86.87 2.33,87.54 1.5,87.54 C0.67,87.54 0,86.87 0,86.04 Z" fill="currentColor" stroke="none"/>
    <path d="M59.1,71.93 L62.1,71.54 L62.1,94.04 C62.1,94.87 61.43,95.54 60.6,95.54 C59.77,95.54 59.1,94.87 59.1,94.04 Z" fill="currentColor" stroke="none"/>
    <path d="M19.1,71.93 L22.1,71.54 L22.1,94.04 C22.1,94.87 21.43,95.54 20.6,95.54 C19.77,95.54 19.1,94.87 19.1,94.04 Z" fill="currentColor" stroke="none"/>
    <path d="M39.1,74 L42.1,74 L42.1,98.5 C42.1,99.33 41.43,100 40.6,100 C39.77,100 39.1,99.33 39.1,98.5 Z" fill="currentColor" stroke="none"/>
  </g>
</svg>` },

  // 煤仓3：八角仓 + 出料口 hole + 支腿
  wash_coal_bunker_3: { icon25d: `<svg viewBox="0 0 82 101" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="40.6" cy="99" rx="38" ry="1" data-shadow="1"/>
    <polygon points="0,4.52 21.44,0 58.64,0 80,4.52 80,80 59,85.5 21.05,85.5 0,80" data-face="front"/>
    <polygon points="0,4.52 21.44,0 58.64,0 80,4.52 74.6,7.9 5.4,7.9" data-face="top"/>
    <polygon points="35,85.51 35,70.54 56,70.54 56,85.54" data-face="hole"/>
    <path d="M21.44,0 L58.64,0" data-edge="hi"/>
    <path d="M0,4.52 L0,80" data-edge="hi"/>
    <path d="M80,4.52 L80,80" data-edge="lo"/>
    <path d="M0,80 L21.05,85.5 L59,85.5 L80,80" data-edge="lo"/>
    <polyline points="0,42.52 21.44,38 58.64,38 80,42.52" data-edge="lo" stroke-width="1"/>
    <path d="M35,85.51 L35,70.54 L56,70.54 L56,85.54" data-edge="lo" stroke-width="1"/>
    <rect fill="currentColor" stroke="none" x="0" y="96" width="12" height="3" rx="1.5"/>
    <rect fill="currentColor" stroke="none" x="68" y="97" width="12" height="3" rx="1.5"/>
    <rect fill="currentColor" stroke="none" x="18" y="93" width="12" height="3" rx="1.5"/>
    <rect fill="currentColor" stroke="none" x="50" y="94" width="12" height="3" rx="1.5"/>
    <path d="M3,80.73 L3,97 M9,97 L9,82.33"/>
    <path d="M71,80.73 L71,98 M77,98 L77,82.36"/>
    <path d="M21,85.5 L21,94 M27,94 L27,85.54"/>
    <path d="M53,85.5 L53,95 M59,95 L59,85.5"/>
  </g>
</svg>` },

  // 放料闸板阀：圆盘手轮 cap + 闸箱 + 立柱阀杆
  wash_gate_valve: { icon25d: `<svg viewBox="0 0 40 100" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="20" cy="98.5" rx="17" ry="0.9" data-shadow="1"/>
    <path d="M20,57.6 C25.36,57.6 30.21,59.77 33.72,63.28 C37.23,66.79 39.4,71.64 39.4,77 C39.4,82.76 36.89,87.93 32.91,91.49 C31.55,94 29.7,95.96 27.45,97.32 C25.28,98.64 22.73,99.4 20,99.4 C17.27,99.4 14.72,98.64 12.55,97.32 C10.3,95.96 8.45,94 7.23,91.66 C3.11,87.93 0.6,82.76 0.6,77 C0.6,71.64 2.77,66.79 6.28,63.28 C9.79,59.77 14.64,57.6 20,57.6 Z" stroke-width="1"/>
    <circle cx="20" cy="77" r="14.4" data-face="cap"/>
    <circle cx="20" cy="77" r="14.4" data-edge="lo" stroke-width="1"/>
    <circle cx="20" cy="77" r="9.4" data-face="hole"/>
    <circle cx="20" cy="77" r="9.4" data-edge="lo" stroke-width="1"/>
    <circle cx="20" cy="77" r="4.4" data-face="cap"/>
    <circle cx="20" cy="77" r="4.4" data-edge="hi" stroke-width="1"/>
    <circle cx="15" cy="74" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="81" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="9" cy="89" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="96" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="25" cy="96" r="1.4" fill="currentColor" stroke="none"/><circle cx="31" cy="89" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="25" cy="74" r="1.4" fill="currentColor" stroke="none"/><circle cx="31" cy="81" r="1.4" fill="currentColor" stroke="none"/>
    <path d="M28,4 L28,22 M12,22 L12,4"/>
    <polygon points="9,22 31,22 31,24 27.6,24.8 9,24.8" data-face="top"/>
    <polygon points="27.6,24.8 31,24 31,28 27.6,28" data-face="side"/>
    <polygon points="9,24.8 27.6,24.8 27.6,28 9,28" data-face="front"/>
    <path d="M9,0 L31,0 C31.55,0 32,0.45 32,1 L32,4 C32,4.55 31.55,5 31,5 L9,5 C8.45,5 8,4.55 8,4 L8,1 C8,0.45 8.45,0 9,0 Z" fill="currentColor" stroke="none"/>
    <polygon points="10,48 30,48 30,50 10,50" data-face="front"/>
    <polygon points="12,53.5 13,53.5 13,54.5 12,54.5" fill="currentColor" stroke="none"/>
    <polygon points="27,53.5 28,53.5 28,54.5 27,54.5" fill="currentColor" stroke="none"/>
    <path d="M14,28 L14,48 M12,48 L12,28"/>
    <path d="M28,28 L28,48 M26,48 L26,28"/>
    <line x1="14" y1="4" x2="14" y2="22"/><line x1="26" y1="4" x2="26" y2="22"/>
    <line x1="31" y1="26" x2="9" y2="26"/>
    <polyline points="17.42,28 17.42,30.46 22.73,30.46 22.73,28"/>
    <polyline points="18.51,30.46 18.51,42.76 21.73,42.76 21.73,30.46"/>
    <polyline points="17.5,45.52 17.5,48.46 22.5,48.46 22.5,45.52"/>
    <line x1="21.08" y1="43.19" x2="21.08" y2="45.19"/><line x1="19.16" y1="43.19" x2="19.16" y2="45.19"/>
    <rect fill="currentColor" stroke="none" x="11" y="52.5" width="3" height="1"/>
    <rect fill="currentColor" stroke="none" x="26" y="52.5" width="3" height="1"/>
    <line x1="17.5" y1="52.5" x2="17.5" y2="57.4"/><line x1="22.5" y1="52.5" x2="22.5" y2="57.4"/>
    <path d="M9,24.8 L27.6,24.8" data-edge="hi"/>
    <path d="M27.6,24.8 L31,24" data-edge="lo"/>
  </g>
</svg>` },

  // 浓缩机：池体双层 front + 顶带 + 中心塔 + 刮泥机构线条
  wash_thickener: { icon25d: `<svg viewBox="0 0 82 74" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="40" cy="71.9" rx="38" ry="0.85" data-shadow="1"/>
    <path d="M0,17 L21.44,17 L58.64,17 L80,17 L80,54.14 C80,55.04 79.39,55.83 78.52,56.07 L48,64.25 L48,70.21 C48,70.61 47.76,70.98 47.39,71.13 C44.81,72.24 42.29,72.79 39.86,72.79 C37.43,72.79 35.01,72.24 32.59,71.14 C32.23,70.98 32,70.62 32,70.23 L32,64.25 L1.48,56.07 C0.61,55.83 0,55.04 0,54.14 Z" data-face="front"/>
    <polygon points="0,17 80,17 80,20.2 0,20.2" data-face="top"/>
    <path d="M3,47 L22.83,47 L57.24,47 L77,47 L77,52.22 C77,52.68 76.69,53.08 76.24,53.19 L40.07,62.31 L3.76,53.19 C3.31,53.08 3,52.68 3,52.22 Z" data-face="front"/>
    <rect fill="currentColor" stroke="none" x="2.5" y="13.5" width="7" height="3"/>
    <path d="M10,0.6 C10.39,0.6 10.74,0.76 10.99,1.01 C11.24,1.26 11.4,1.61 11.4,2 L11.4,12.4 L0.6,12.4 L0.6,2 C0.6,1.61 0.76,1.26 1.01,1.01 C1.26,0.76 1.61,0.6 2,0.6 Z" data-face="front"/>
    <line x1="3" y1="1" x2="3" y2="13"/><line x1="6" y1="1" x2="6" y2="13"/><line x1="9" y1="1" x2="9" y2="13"/>
    <path d="M41,17 L41,69 C41,69.55 40.55,70 40,70 C39.45,70 39,69.55 39,69 L39,17" fill="currentColor" stroke="none"/>
    <path d="M33,47 L36.29,47 L43.73,47 L47,47 C47.55,47 48,47.45 48,48 C48,48.55 47.55,49 47,49 L33,49 C32.45,49 32,48.55 32,48 C32,47.45 32.45,47 33,47 Z" fill="currentColor" stroke="none"/>
    <path d="M10.5,44.5 L21.5,44.5 C22.05,44.5 22.5,44.95 22.5,45.5 C22.5,46.05 22.05,46.5 21.5,46.5 L10.5,46.5 C9.95,46.5 9.5,46.05 9.5,45.5 C9.5,44.95 9.95,44.5 10.5,44.5 Z" fill="currentColor" stroke="none"/>
    <path d="M58.5,44.5 L69.5,44.5 C70.05,44.5 70.5,44.95 70.5,45.5 C70.5,46.05 70.05,46.5 69.5,46.5 L58.5,46.5 C57.95,46.5 57.5,46.05 57.5,45.5 C57.5,44.95 57.95,44.5 58.5,44.5 Z" fill="currentColor" stroke="none"/>
    <path d="M19.5,44.5 L30.5,44.5 C31.05,44.5 31.5,44.95 31.5,45.5 C31.5,46.05 31.05,46.5 30.5,46.5 L19.5,46.5 C18.95,46.5 18.5,46.05 18.5,45.5 C18.5,44.95 18.95,44.5 19.5,44.5 Z" fill="currentColor" stroke="none"/>
    <path d="M67.5,44.5 L78.5,44.5 C79.05,44.5 79.5,44.95 79.5,45.5 C79.5,46.05 79.05,46.5 78.5,46.5 L67.5,46.5 C66.95,46.5 66.5,46.05 66.5,45.5 C66.5,44.95 66.95,44.5 67.5,44.5 Z" fill="currentColor" stroke="none"/>
    <path d="M1.5,44.5 L12.5,44.5 C13.05,44.5 13.5,44.95 13.5,45.5 C13.5,46.05 13.05,46.5 12.5,46.5 L1.5,46.5 C0.95,46.5 0.5,46.05 0.5,45.5 C0.5,44.95 0.95,44.5 1.5,44.5 Z" fill="currentColor" stroke="none"/>
    <path d="M49.5,44.5 L60.5,44.5 C61.05,44.5 61.5,44.95 61.5,45.5 C61.5,46.05 61.05,46.5 60.5,46.5 L49.5,46.5 C48.95,46.5 48.5,46.05 48.5,45.5 C48.5,44.95 48.95,44.5 49.5,44.5 Z" fill="currentColor" stroke="none"/>
    <path d="M32.97,47 L35,38.82 L35,24.83 C35,24.28 35.45,23.83 36,23.83 L44.03,23.83 C44.58,23.83 45.03,24.28 45.03,24.83 L45.03,38.82 L47.37,47" data-face="front"/>
    <path d="M0,17 L80,17" data-edge="hi"/>
    <path d="M0,20.2 L80,20.2" data-edge="hi"/>
    <path d="M0,20.2 L0,54.14" data-edge="hi"/>
    <path d="M80,20.2 L80,54.14" data-edge="lo"/>
    <path d="M0,54.14 L1.48,56.07 L32,64.25" data-edge="lo"/>
    <path d="M80,54.14 L78.52,56.07 L48,64.25" data-edge="lo"/>
    <path d="M32,70.23 L32,64.25 L1.48,56.07" data-edge="lo"/>
    <path d="M48,64.25 L48,70.21" data-edge="lo"/>
    <path d="M3,47 L77,47" data-edge="lo"/>
    <path d="M3,52.22 L3.76,53.19 L40.07,62.31 L76.24,53.19 L77,52.22" data-edge="lo"/>
    <path d="M35,24.83 L36,23.83 L44.03,23.83 L45.03,24.83" data-edge="hi"/>
    <path d="M36,23.83 L36,38.82" data-edge="hi"/>
    <path d="M44.03,23.83 L44.03,38.82" data-edge="lo"/>
  </g>
</svg>` },

  // 浅槽分选机：左斜斗 + 右箱体 + 漏斗组
  wash_dense_medium_separator: { icon25d: `<svg viewBox="0 0 89 34" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="45" cy="31.6" rx="42" ry="0.8" data-shadow="1"/>
    <path d="M1.36928004,0.544106206 L26.6604958,10.5939916 C27.1737441,10.7979394 27.4244817,11.3793416 27.220534,11.8925898 C27.2088777,11.9219236 27.1958391,11.950689 27.181462,11.9787895 L19.7747038,26.4554797 C19.6036997,26.7897113 19.2598949,27 18.8844576,27 L9.32261394,27 C8.92060623,27 8.55768109,26.759268 8.40133721,26.3889077 L0.0787232669,6.67361009 C0.0267679562,6.55053404 -8.70298461e-17,6.41829533 0,6.28470241 L0,1.47342437 C1.5440923e-16,0.921139623 0.44771525,0.473424373 1,0.473424373 C1.12645518,0.473424373 1.25176294,0.497408834 1.36928004,0.544106206 Z" data-face="front"/>
    <line x1="27.2773514" y1="11" x2="62.6694794" y2="11" data-edge="hi"/>
    <line x1="20.9706497" y1="24" x2="62.6694794" y2="24" data-edge="lo"/>
    <polygon points="62.6,8.6 87.4,8.6 87.4,10.6 83.9,11.4 62.6,11.4" data-face="top"/>
    <polygon points="83.9,11.4 87.4,10.6 87.4,32.4 83.9,32.4" data-face="side"/>
    <polygon points="62.6,11.4 83.9,11.4 83.9,32.4 62.6,32.4" data-face="front"/>
    <path d="M65.64,26 L70.36,26 C70.64,26 70.86,26.22 70.86,26.5 C70.86,26.54 70.85,26.58 70.84,26.62 L70.09,29.62 C70.04,29.84 69.84,30 69.61,30 L66.39,30 C66.16,30 65.96,29.84 65.91,29.62 L65.16,26.62 C65.09,26.35 65.25,26.08 65.52,26.01 C65.56,26.01 65.6,26 65.64,26 Z" fill="currentColor" stroke="none"/>
    <path d="M72.64,26 L77.36,26 C77.64,26 77.86,26.22 77.86,26.5 C77.86,26.54 77.85,26.58 77.84,26.62 L77.09,29.62 C77.04,29.84 76.84,30 76.61,30 L73.39,30 C73.16,30 72.96,29.84 72.91,29.62 L72.16,26.62 C72.09,26.35 72.25,26.08 72.52,26.01 C72.56,26.01 72.6,26 72.64,26 Z" fill="currentColor" stroke="none"/>
    <path d="M79.64,26 L84.36,26 C84.64,26 84.86,26.22 84.86,26.5 C84.86,26.54 84.85,26.58 84.84,26.62 L84.09,29.62 C84.04,29.84 83.84,30 83.61,30 L80.39,30 C80.16,30 79.96,29.84 79.91,29.62 L79.16,26.62 C79.09,26.35 79.25,26.08 79.52,26.01 C79.56,26.01 79.6,26 79.64,26 Z" fill="currentColor" stroke="none"/>
    <line x1="0" y1="5.85" x2="25.09" y2="15.61" data-edge="lo" stroke-width="1"/>
    <path d="M62.6,11.4 L83.9,11.4" data-edge="hi"/>
    <path d="M83.9,11.4 L87.4,10.6" data-edge="lo"/>
  </g>
</svg>` },

  // 分料器单：倒梯形斗 front + 底出口 hole
  wash_distributor_single: { icon25d: `<svg viewBox="0 0 62 59" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="30.6" cy="56.2" rx="27" ry="0.8" data-shadow="1"/>
    <path d="M58.5406571,1.22117398 L59.9780694,30.6954829 C59.991845,30.9779523 59.8693886,31.2499082 59.6487585,31.4268293 L35.6545557,50.6675522 C35.4979753,50.7931125 35.3032668,50.8615385 35.102561,50.8615385 L25.1185256,50.8615385 C24.9191536,50.8615385 24.7256583,50.7940175 24.5695702,50.6699784 L0.354136235,31.4265951 C0.131802223,31.249912 0.00809868795,30.9770155 0.0217601706,30.693356 L1.45927258,0.8456416 C1.48203288,0.373059348 1.87348313,0.00253899926 2.34660222,0.00575534001 L57.6653498,0.381821212 C58.1336235,0.385004613 58.5178468,0.753445383 58.5406571,1.22117398 Z" data-face="front"/>
    <path d="M41.4705882,56.1176471 C41.4705882,56.6049571 41.0755454,57 40.5882353,57 L19.4117647,57 C18.9244546,57 18.5294118,56.6049571 18.5294118,56.1176471 L18.5294118,45.869778 L24.8106251,50.8615385 L35.4126445,50.8615385 L41.4704118,46.002778 Z" data-face="hole"/>
    <path d="M2.3,1.2 L57.67,1.2" data-edge="hi"/>
    <path d="M1.46,0.85 L0.35,31.43" data-edge="hi"/>
    <path d="M59.98,30.7 L58.54,1.22" data-edge="lo"/>
    <path d="M0.35,31.43 L25.12,50.86 L35.1,50.86 L59.98,30.7" data-edge="lo"/>
    <path d="M55.19,4.64 L56.42,26.69 C56.45,27.18 56.07,27.59 55.59,27.62 L4.46,27.62 C3.97,27.62 3.58,27.23 3.58,26.74 L4.81,4.35 C4.83,3.88 5.22,3.51 5.69,3.51 L54.32,3.80 C54.78,3.81 55.17,4.17 55.19,4.64 Z" stroke-width="1"/>
    <path d="M18.53,56.12 L18.53,45.87 L24.81,50.86" data-edge="lo"/>
    <path d="M41.47,46 L41.47,56.12" data-edge="lo"/>
    <line x1="0" y1="31.1307692" x2="60" y2="31.1307692" data-edge="lo" stroke-width="1"/>
  </g>
</svg>` },

  // 脱介筛：双层斜筛面 + 电机 + 端部漏斗
  wash_desliming_screen: { icon25d: `<svg viewBox="0 0 90 47" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="44" cy="45.2" rx="42" ry="0.8" data-shadow="1"/>
    <path d="M0.905131803,16.3082657 L20.0988089,14.4791466 L25.3075552,7.90126377 L69.615725,29.3346473 L69.615725,41.0643874 C69.615725,41.6166722 69.1680098,42.0643874 68.615725,42.0643874 C68.5347943,42.0643874 68.4541628,42.0545629 68.3756,42.0351294 L0.759874937,25.3095412 C0.313533704,25.1991332 6.90623873e-16,24.7985932 0,24.3387993 L0,17.3037556 C-6.31348621e-17,16.7882203 0.391921676,16.3571736 0.905131803,16.3082657 Z" data-face="top"/>
    <path d="M25.2037532,7.76372946 L45.6456502,5.93008768 C45.819227,5.91451781 45.9938593,5.94458026 46.1522381,6.01729535 L87.1800141,24.8540221 C87.5351458,25.0170707 87.7627677,25.3720427 87.7627677,25.7628155 L87.7627677,36.5515133 C87.7627677,37.0108689 87.4498193,37.4111456 87.0040335,37.5219724 L68.9331646,42.0145712" data-face="front"/>
    <path d="M25.31,7.9 L69.62,29.33" data-edge="hi"/>
    <path d="M0,17.3 L0,24.34" data-edge="hi"/>
    <path d="M0.76,25.31 L68.38,42.04" data-edge="lo"/>
    <path d="M87.76,25.76 L87.76,36.55" data-edge="lo"/>
    <path d="M40.78,11.35 L48.17,11.36 C48.70,11.36 49.14,11.79 49.14,12.33 C49.14,12.88 48.70,13.32 48.17,13.32 L40.78,13.31 C40.24,13.31 39.81,12.87 39.81,12.33 C39.81,11.79 40.24,11.35 40.78,11.35 Z" fill="currentColor" stroke="none" transform="translate(45.122077, 11.346906) rotate(-8) translate(-45.122077, -11.346906)"/>
    <path d="M51.43,15.17 L58.52,15.18 C59.06,15.18 59.49,15.61 59.49,16.15 C59.49,16.7 59.06,17.13 58.52,17.13 L51.43,17.12 C50.9,17.12 50.46,16.69 50.46,16.14 C50.46,15.6 50.9,15.17 51.43,15.17 Z" fill="currentColor" stroke="none" transform="translate(55.478556, 16.169985) rotate(-8) translate(-55.478556, -16.169985)"/>
    <path d="M62.76,20.32 L69.85,20.32 C70.39,20.33 70.82,20.76 70.82,21.29 C70.82,21.84 70.39,22.28 69.85,22.28 L62.76,22.27 C62.22,22.27 61.79,21.84 61.79,21.28 C61.79,20.75 62.22,20.32 62.76,20.32 Z" fill="currentColor" stroke="none" transform="translate(66.805955, 21.314604) rotate(-8) translate(-66.805955, -21.314604)"/>
    <line x1="69.615725" y1="29.660703" x2="88" y2="25.3599453"/>
    <path d="M40.7903512,1.29084067 C41.5134164,1.28938747 42.1681642,1.58156972 42.6422793,2.05485991 C43.1167215,2.52847662 43.4102927,3.18341228 43.4106117,3.90458553 C43.4080079,4.6435576 43.1147656,5.30762684 42.6396872,5.78743216 C42.1651002,6.2667411 41.509484,6.56159365 40.7860766,6.56304997 L31.1243358,6.56726208 C30.4012706,6.56871528 29.7465227,6.27653304 29.2724077,5.80324284 C28.7979655,5.32962613 28.5044943,4.67469048 28.5040753,3.95351722 C28.5066799,3.21454515 28.7999214,2.55047591 29.2749998,2.07067059 C29.7495868,1.59136165 30.4052037,1.29650911 31.1286104,1.29505278 Z" stroke-width="1.2" transform="translate(35.957343, 3.929051) rotate(-5) translate(-35.957343, -3.929051)"/>
    <ellipse cx="31.1601022" cy="4.32994259" rx="2.63652348" ry="2.61526461" data-face="cap" transform="translate(31.160102, 4.329943) rotate(-5) translate(-31.160102, -4.329943)"/>
    <ellipse cx="31.1601022" cy="4.32994259" rx="2.63652348" ry="2.61526461" data-edge="hi" transform="translate(31.160102, 4.329943) rotate(-5) translate(-31.160102, -4.329943)"/>
    <path d="M2.89234761,26.1003424 L2.89234761,32.4599934 C2.89234761,33.0122782 3.34006286,33.4599934 3.89234761,33.4599934 L6.11240822,33.4599934 L6.11240822,26.9265812"/>
    <path d="M6.11240822,33.4599934 L6.11240822,34.7498785 C6.11240822,35.3021633 6.56012347,35.7498785 7.11240822,35.7498785 L8.3291318,35.7498785 C8.88141655,35.7498785 9.3291318,35.3021633 9.3291318,34.7498785 L9.3291318,27.1561818"/>
    <path d="M56.4569639,38.8308773 L56.4569639,45 C56.4569639,45.5522847 56.9046791,46 57.4569639,46 L58.6770245,46 C59.2293092,46 59.6770245,45.5522847 59.6770245,45 L59.6770245,39.8201858"/>
    <path d="M53.1700986,38.6257009 L53.1700986,43.8279719 C53.1700986,44.3802566 53.6178139,44.8279719 54.1700986,44.8279719 L56.4569639,44.8279719"/>
  </g>
</svg>` },

  // 压滤机：上下梁 front + 右封板 + 滤板杆组 + 液压缸
  wash_filter_press: { icon25d: `<svg viewBox="0 0 107 37" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="50.8" cy="35.9" rx="48" ry="0.6" data-shadow="1"/>
    <g fill="currentColor" stroke="none">
      <rect x="29" y="0.75" width="2" height="10.5"/><rect x="29" y="18.75" width="2" height="10.5"/><rect x="37" y="0.75" width="2" height="10.5"/><rect x="37" y="18.75" width="2" height="10.5"/>
      <rect x="45" y="0.75" width="2" height="10.5"/><rect x="45" y="18.75" width="2" height="10.5"/><rect x="53" y="0.75" width="2" height="10.5"/><rect x="53" y="18.75" width="2" height="10.5"/>
      <rect x="61" y="0.75" width="2" height="10.5"/><rect x="61" y="18.75" width="2" height="10.5"/><rect x="69" y="0.75" width="2" height="10.5"/><rect x="69" y="18.75" width="2" height="10.5"/>
      <rect x="77" y="0.75" width="2" height="10.5"/><rect x="77" y="18.75" width="2" height="10.5"/><rect x="85" y="0.75" width="2" height="10.5"/><rect x="85" y="18.75" width="2" height="10.5"/>
      <rect x="93" y="0.75" width="2" height="10.5"/><rect x="93" y="18.75" width="2" height="10.5"/>
    </g>
    <polygon points="26,0.6 100.9,0.6 100.9,3 26,3" data-face="front"/>
    <polygon points="26,27 101.6,26.9 101.6,29.5 26,29.5" data-face="front"/>
    <path d="M26,0.6 L100.9,0.6" data-edge="hi"/>
    <path d="M26,0.6 L26,11.25" data-edge="hi"/>
    <path d="M26,27 L101.6,26.9" data-edge="hi" stroke-width="1"/>
    <path d="M26,18.5 L26,29.5" data-edge="hi"/>
    <path d="M26,3 L100.9,3" data-edge="lo" stroke-width="1"/>
    <path d="M26,29.5 L101.6,29.4" data-edge="lo"/>
    <polygon points="2.6,11.1 9.4,11.1 9.4,12.9 8.2,13.3 2.6,13.3" data-face="top"/>
    <polygon points="8.2,13.3 9.4,12.9 9.4,18.9 8.2,18.9" data-face="side"/>
    <polygon points="2.6,13.3 8.2,13.3 8.2,18.9 2.6,18.9" data-face="front"/>
    <path d="M2.6,13.3 L8.2,13.3" data-edge="hi"/>
    <polyline points="9 13 11.8883362 13 11.8883362 17 9 17"/>
    <polygon points="12 13.7606913 14 13 14 17 12 16.3618062" fill="currentColor" stroke="none"/>
    <path d="M0,13.5 L1.88833618,13.5 C2.44062093,13.5 2.88833618,13.9477153 2.88833618,14.5 L2.88833618,15.5 C2.88833618,16.0522847 2.44062093,16.5 1.88833618,16.5 L0,16.5" fill="currentColor" stroke="none" transform="translate(1.444168, 15.000000) scale(-1, 1) translate(-1.444168, -15.000000)"/>
    <line x1="6.5" y1="19.5" x2="6.5" y2="34.5"/><line x1="4.5" y1="19.5" x2="4.5" y2="34.5"/>
    <line x1="61.5" y1="29.5" x2="61.5" y2="34.5"/><line x1="63.5" y1="29.5" x2="63.5" y2="34.5"/>
    <line x1="99.5" y1="29.5" x2="99.5" y2="34.5"/><line x1="101.5" y1="29.5" x2="101.5" y2="34.5"/>
    <rect fill="currentColor" stroke="none" x="2" y="33.5" width="7" height="3" rx="1.5"/>
    <rect fill="currentColor" stroke="none" x="59" y="33.5" width="7" height="3" rx="1.5"/>
    <rect fill="currentColor" stroke="none" x="97" y="33.5" width="7" height="3" rx="1.5"/>
  </g>
</svg>` },

  // 三通分料器：中间竖槽 + 闸箱 + 三叉线
  wash_three_way_distributor: { icon25d: `<svg viewBox="0 0 93 65" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="46" cy="62.9" rx="40" ry="0.9" data-shadow="1"/>
    <path d="M26.5649745,0 L33.295055,0 L46.7342154,0 L53.4350255,0 C53.9949881,-1.0286345e-16 54.4489274,0.453939328 54.4489274,1.01390187 L54.4489274,2 L25.5510726,2 L25.5510726,1.01390187 C25.5510726,0.453939328 26.0050119,1.0286345e-16 26.5649745,0 Z" fill="currentColor" stroke="none"/>
    <polygon points="28.23,1.81 28.23,11.39 51.77,11.39 51.77,1.81" data-face="front"/>
    <polygon points="28.23,11.39 51.77,11.39 51.77,13.4 28.23,13.4" data-face="top"/>
    <polyline points="28.2316962 1.81278652 28.2316962 11.3887922 0 46.2780312 17.7210794 61.9862845 28.1719194 49.3495006 28.1719194 64 40 64" data-pipe="base" stroke-width="3.4"/>
    <polyline points="28.2316962 1.81278652 28.2316962 11.3887922 0 46.2780312 17.7210794 61.9862845 28.1719194 49.3495006 28.1719194 64 40 64" data-pipe="hi" stroke-width="1"/>
    <polyline transform="translate(60.000000, 50.750000) scale(-1, 1) translate(-60.000000, -50.750000)" points="47.5570221 37.5 40 46.2780312 57.7210794 61.9862845 68.1719194 49.3495006 68.1719194 64 80 64" data-pipe="base" stroke-width="3.4"/>
    <polyline transform="translate(60.000000, 50.750000) scale(-1, 1) translate(-60.000000, -50.750000)" points="47.5570221 37.5 40 46.2780312 57.7210794 61.9862845 68.1719194 49.3495006 68.1719194 64 80 64" data-pipe="hi" stroke-width="1"/>
    <polyline points="51.7683038 1.81278652 51.7683038 11.3887922 62.3726654 24.5" data-pipe="base" stroke-width="3.4"/>
    <polyline points="51.7683038 1.81278652 51.7683038 11.3887922 62.3726654 24.5" data-pipe="hi" stroke-width="1"/>
    <polygon points="55.6,24.6 79.4,24.6 79.4,26.6 76.2,27.4 55.6,27.4" data-face="top"/>
    <polygon points="76.2,27.4 79.4,26.6 79.4,32.4 76.2,32.4" data-face="side"/>
    <polygon points="55.6,27.4 76.2,27.4 76.2,32.4 55.6,32.4" data-face="front"/>
    <line x1="74" y1="38" x2="74" y2="32"/><line x1="60" y1="38" x2="60" y2="25"/><line x1="77" y1="38" x2="77" y2="32"/>
    <path d="M52.4,26.6 L52.4,30.4 L50.5,30.4 C49.98,30.4 49.5,30.19 49.16,29.84 C48.81,29.5 48.6,29.02 48.6,28.5 C48.6,27.98 48.81,27.5 49.16,27.16 C49.5,26.81 49.98,26.6 50.5,26.6 Z" stroke-width="1"/>
    <rect transform="translate(47.384420, 32.039821) rotate(-45.000000) translate(-47.384420, -32.039821)" x="45.48442" y="32.1398208" width="3.8" height="1" stroke-width="1"/>
    <rect fill="currentColor" stroke="none" x="87" y="25" width="1.2" height="7"/>
    <rect fill="currentColor" stroke="none" transform="translate(83.6, 27.2) rotate(-270.000000) translate(-83.6, -27.2)" x="83" y="23.2" width="1.2" height="8"/>
    <rect fill="currentColor" stroke="none" transform="translate(71.1, 37.5) rotate(-270.000000) translate(-71.1, -37.5)" x="70.5" y="23.5" width="1.2" height="28" rx="0.6"/>
    <rect fill="currentColor" stroke="none" transform="translate(83.6, 29.8) rotate(-270.000000) translate(-83.6, -29.8)" x="83" y="25.8" width="1.2" height="8"/>
    <path d="M80,24.5 L90,24.5 C90.55,24.5 91,24.95 91,25.5 L91,31.5 C91,32.05 90.55,32.5 90,32.5 L80,32.5" stroke-width="1"/>
    <path d="M54.9824654,24.172708 C55.3528949,24.3531224 55.4,24.4601453 55.4,24.5723235 L55.4,32.5250771 C55.4,32.6355341 55.3552285,32.7355341 55.2828427,32.8079198 C55.2104569,32.8803056 55.1104569,32.9250771 55,32.9250771 C54.8914985,32.9250771 54.7876519,32.8809997 54.7122769,32.8029537 L52.6,30.6158284 L52.6,26.600392 L54.7050303,24.3021516 C54.7796362,24.2206979 54.8801948,24.1771955 54.9824654,24.172708 Z" stroke-width="1"/>
    <circle fill="currentColor" stroke="none" transform="translate(45.159074, 34.290551) rotate(-345.000000) translate(-45.159074, -34.290551)" cx="45.1590742" cy="34.2905506" r="1"/>
    <path d="M28.23,11.39 L51.77,11.39" data-edge="hi"/>
    <path d="M28.23,13.4 L51.77,13.4" data-edge="hi"/>
    <path d="M55.6,27.4 L76.2,27.4" data-edge="hi"/>
    <path d="M0,46.28 L17.72,61.99" data-edge="lo"/>
    <path d="M28.17,64 L40,64" data-edge="lo"/>
  </g>
</svg>` },

  // 打印机：机身 front + 纸槽 hole + 下纸盘立面
  wash_printer: { icon25d: `<svg viewBox="0 0 82 77" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="40" cy="74.9" rx="38" ry="1" data-shadow="1"/>
    <path d="M17,18 L4,18 C1.79,18 0,19.79 0,22 L0,62 C0,64.21 1.79,66 4,66 L76,66 C78.21,66 80,64.21 80,62 L80,22 C80,19.79 78.21,18 76,18 L63,18" data-face="front"/>
    <polygon points="0,18 80,18 80,20.8 0,20.8" data-face="top"/>
    <path d="M48.9055786,5 C54.9055786,5 59.2703857,5 62,5 C62.5522847,5 63,5.44771525 63,6 L63,29 C63,29.5522847 62.5522847,30 62,30 L18,30 C17.4477153,30 17,29.5522847 17,29 L17,6 C17,5.44771525 17.4477153,5 18,5 L31.1800995,5" data-face="hole"/>
    <path d="M48.9055786,5 C54.9055786,5 59.2703857,5 62,5 C62.5522847,5 63,5.44771525 63,6 L63,29 C63,29.5522847 62.5522847,30 62,30 L18,30 C17.4477153,30 17,29.5522847 17,29 L17,6 C17,5.44771525 17.4477153,5 18,5 L31.1800995,5" data-edge="lo" stroke-width="1"/>
    <path d="M36.1948853,9.27688599 L36.1948853,13.8651733 L31.4258577,13.8651733 C30.873573,13.8651733 30.4258577,14.3128886 30.4258577,14.8651733 C30.4258577,15.131567 30.5321492,15.3869499 30.7211567,15.5746777 L39.2960524,24.091521 C39.6857241,24.4785545 40.3146097,24.4788909 40.7046951,24.0922744 L49.2979563,15.5754312 C49.6902209,15.1866549 49.6930488,14.5534963 49.3042725,14.1612317 C49.1164859,13.9717601 48.8607792,13.8651733 48.5940147,13.8651733 L43.7803955,13.8651733 L43.7803955,9.27688599" stroke-width="1.2"/>
    <path d="M64,27 C65.1045695,27 66,27.8954305 66,29 C66,30.1045695 65.1045695,31 64,31 L16,31 C14.8954305,31 14,30.1045695 14,29 C14,27.8954305 14.8954305,27 16,27 L17,27 L17,28 C17,28.5128358 17.3860402,28.9355072 17.8833789,28.9932723 L18,29 L62,29 C62.5522847,29 63,28.5522847 63,28 L63,27 Z" fill="currentColor" stroke="none"/>
    <path d="M17,55.5 L64.5,55.5 C64.78,55.5 65.03,55.61 65.21,55.79 C65.39,55.97 65.5,56.22 65.5,56.5 C65.5,56.68 65.45,56.86 65.36,57 L65.32,57.07 L65.29,57 C65.21,56.82 65.11,56.65 64.99,56.49 L64.87,56.34 C64.45,55.87 63.85,55.56 63.18,55.51 L17,55.5 Z" stroke-width="3"/>
    <polygon points="16.5,56 63.5,56 63.5,75.5 16.5,75.5" data-face="front"/>
    <path d="M16.5,75.5 L63.5,75.5" data-edge="lo"/>
    <rect fill="currentColor" stroke="none" x="27" y="65" width="26" height="3"/>
    <circle fill="currentColor" stroke="none" cx="71.5" cy="37.5" r="2.5"/>
    <circle fill="currentColor" stroke="none" cx="36" cy="1" r="1"/><circle fill="currentColor" stroke="none" cx="36" cy="5" r="1"/>
    <circle fill="currentColor" stroke="none" cx="44" cy="1" r="1"/><circle fill="currentColor" stroke="none" cx="44" cy="5" r="1"/>
    <path d="M0,18 L0,66" data-edge="hi"/>
    <path d="M0,20.8 L80,20.8" data-edge="hi"/>
    <path d="M80,18 L80,66" data-edge="lo"/>
    <path d="M0,66 L80,66" data-edge="lo"/>
  </g>
</svg>` },

  // 工业计算机：显示器箱体 + 屏框饰条 + 底座
  wash_industrial_pc: { icon25d: `<svg viewBox="0 0 80 63" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="40" cy="61.5" rx="36" ry="0.85" data-shadow="1"/>
    <rect x="0.6" y="0.6" width="78.8" height="50.8" rx="4" data-face="front"/>
    <rect x="0.6" y="0.6" width="78.8" height="3" rx="1.5" data-face="top"/>
    <rect x="0.6" y="0.6" width="78.8" height="50.8" rx="4" data-edge="hi"/>
    <path d="M48.7682849,58.6 C50.4249085,58.6 51.9690932,59.4380075 52.8719338,60.826993 L53.4926914,61.7820047 L26.842686,62.4 L27.1280662,60.826993 C28.0309068,59.4380075 29.5750915,58.6 31.2317151,58.6 Z" data-face="front"/>
    <rect fill="currentColor" stroke="none" x="4" y="5" width="63" height="2" rx="1"/>
    <rect fill="currentColor" stroke="none" x="0" y="44" width="56" height="2" rx="1"/>
    <rect fill="currentColor" stroke="none" x="70" y="5" width="6" height="2" rx="1"/>
    <rect fill="currentColor" stroke="none" x="74" y="44" width="6" height="2" rx="1"/>
    <rect fill="currentColor" stroke="none" transform="translate(60, 45) rotate(-270.000000) translate(-60, -45)" x="58" y="44" width="4" height="2" rx="1"/>
    <rect fill="currentColor" stroke="none" transform="translate(65, 45) rotate(-270.000000) translate(-65, -45)" x="63" y="44" width="4" height="2" rx="1"/>
    <rect fill="currentColor" stroke="none" transform="translate(70, 45) rotate(-270.000000) translate(-70, -45)" x="68" y="44" width="4" height="2" rx="1"/>
    <line x1="33" y1="52" x2="33" y2="58"/><line x1="47" y1="52" x2="47" y2="58"/>
    <path d="M0.6,3.6 L79.4,3.6" data-edge="hi"/>
    <path d="M0.6,51.4 L79.4,51.4" data-edge="lo"/>
  </g>
</svg>` },
}

const washAssetComponents = buildAssetComponents('wash', washIcons, washMeta).map((def) => {
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

export const washComponents: ComponentDefinition[] = washAssetComponents
