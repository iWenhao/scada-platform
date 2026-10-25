import { buildAssetComponents } from '../assetComponents'
import { thermalIcons, thermalMeta } from './icons.generated'

/**
 * 2.5D 迁移：素材图元是线条稿，这里按面基同姿态重绘（见 docs/2.5D_ILLUSTRATION_GUIDE.md §4.5）。
 * 覆盖发生在组装之后，生成文件保持原样，重新导出素材不会把这层改动冲掉。
 *
 * 同姿态约定：viewBox、摆放角度、占地轮廓都与素材原稿一致，只把「线」换成「面 + 棱线 +
 * 接触阴影」，因此默认尺寸继续用素材自带的值，不在这里改画幅。
 *
 * 双源约定：`icon` 继续用生成文件里的素材原稿（2D 画布与组件面板必须与导入时一模一样），
 * 面基稿写进 `icon25d`，只在 2.5D 模式生效。名称属性同步改，否则属性面板里的默认名仍是素材原名。
 *
 * 素材原稿的描边宽度是 1.2（个别内部件 1），本组统一按 1.2 画棱线，避免与相邻图元的线重不一致。
 */
const illustratedAssets: Record<string, { icon25d: string; name?: string }> = {
  thermal_steam_header: {
    icon25d: `<svg viewBox="0 0 100 64" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="62.4" rx="44" ry="1.2" data-shadow="1"/>

      <!-- 支腿：先画，筒体自然压住腿顶 -->
      <rect x="15.4" y="47" width="9.2" height="16.6" data-face="front"/>
      <rect x="75.4" y="47" width="9.2" height="16.6" data-face="front"/>
      <path d="M15.4,63.6 L24.6,63.6" data-edge="lo"/>
      <path d="M75.4,63.6 L84.6,63.6" data-edge="lo"/>

      <!-- 筒体：横卧圆柱，两端是原稿的圆头，不另画端面 -->
      <path d="M20,8 C8.95,8 0,16.95 0,28 C0,39.05 8.95,48 20,48 L80,48 C91.05,48 100,39.05 100,28 C100,16.95 91.05,8 80,8 Z" data-face="barrel"/>
      <path d="M0,28 A20,20 0 0 1 20,8 L80,8 A20,20 0 0 1 100,28" data-edge="hi"/>
      <path d="M0,28 A20,20 0 0 0 20,48 L80,48 A20,20 0 0 0 100,28" data-edge="lo"/>

      <!-- 四个顶部接管：短颈走筒面，法兰拆成正面 + 顶面一条，圆角沿用原稿 r1 -->
      <rect x="17.5" y="2.5" width="5" height="7" data-face="body"/>
      <rect x="14.5" y="0.5" width="11" height="2" rx="1" data-face="front"/>
      <rect x="14.5" y="0.5" width="11" height="0.8" rx="0.4" data-face="top"/>
      <path d="M15.5,0.5 L24.5,0.5" data-edge="hi"/>
      <path d="M14.5,2.5 L25.5,2.5" data-edge="lo"/>

      <rect x="37.5" y="2.5" width="5" height="7" data-face="body"/>
      <rect x="34.5" y="0.5" width="11" height="2" rx="1" data-face="front"/>
      <rect x="34.5" y="0.5" width="11" height="0.8" rx="0.4" data-face="top"/>
      <path d="M35.5,0.5 L44.5,0.5" data-edge="hi"/>
      <path d="M34.5,2.5 L45.5,2.5" data-edge="lo"/>

      <rect x="57.5" y="2.5" width="5" height="7" data-face="body"/>
      <rect x="54.5" y="0.5" width="11" height="2" rx="1" data-face="front"/>
      <rect x="54.5" y="0.5" width="11" height="0.8" rx="0.4" data-face="top"/>
      <path d="M55.5,0.5 L64.5,0.5" data-edge="hi"/>
      <path d="M54.5,2.5 L65.5,2.5" data-edge="lo"/>

      <rect x="77.5" y="2.5" width="5" height="7" data-face="body"/>
      <rect x="74.5" y="0.5" width="11" height="2" rx="1" data-face="front"/>
      <rect x="74.5" y="0.5" width="11" height="0.8" rx="0.4" data-face="top"/>
      <path d="M75.5,0.5 L84.5,0.5" data-edge="hi"/>
      <path d="M74.5,2.5 L85.5,2.5" data-edge="lo"/>
    </g>
  </svg>`,
  },

  thermal_deaerator: {
    icon25d: `<svg viewBox="0 0 88 74" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="44" cy="72.8" rx="38" ry="1.2" data-shadow="1"/>

      <!-- 三组立柱：原稿每根由两条细线画成，合起来就是一根立柱；先画，两只罐体压住它们的上下端 -->
      <rect x="23.9" y="26" width="4.55" height="43.5" data-face="front"/>
      <rect x="41.73" y="26" width="4.54" height="43.5" data-face="front"/>
      <rect x="59.55" y="26" width="4.54" height="43.5" data-face="front"/>

      <!-- 底脚：顶面占顶部一条，正面落地 -->
      <rect x="20.05" y="69.5" width="10.03" height="4.5" data-face="front"/>
      <rect x="20.05" y="69.5" width="10.03" height="1.2" data-face="top"/>
      <rect x="38.99" y="69.5" width="10.02" height="4.5" data-face="front"/>
      <rect x="38.99" y="69.5" width="10.02" height="1.2" data-face="top"/>
      <rect x="57.92" y="69.5" width="10.03" height="4.5" data-face="front"/>
      <rect x="57.92" y="69.5" width="10.03" height="1.2" data-face="top"/>
      <path d="M20.05,74 L30.08,74 M38.99,74 L49.01,74 M57.92,74 L67.95,74" data-edge="lo"/>

      <!-- 上罐：横卧圆柱，两端圆头照旧 -->
      <path d="M19.79,0 C12.55,0 6.68,5.87 6.68,13.1 L6.68,13.8 C6.68,21.04 12.55,26.91 19.79,26.91 L68.21,26.91 C75.45,26.91 81.32,21.04 81.32,13.8 L81.32,13.1 C81.32,5.87 75.45,0 68.21,0 Z" data-face="barrel"/>
      <path d="M6.68,13.45 A13.45,13.45 0 0 1 20.13,0 L67.87,0 A13.45,13.45 0 0 1 81.32,13.45" data-edge="hi"/>
      <path d="M6.68,13.45 A13.45,13.45 0 0 0 20.13,26.91 L67.87,26.91 A13.45,13.45 0 0 0 81.32,13.45" data-edge="lo"/>

      <!-- 下罐：横卧圆柱；水位以下按原稿的波浪线压暗 -->
      <path d="M14.85,34 C6.65,34 0,40.65 0,48.85 L0,49.15 C0,57.35 6.65,64 14.85,64 L73.15,64 C81.35,64 88,57.35 88,49.15 L88,48.85 C88,40.65 81.35,34 73.15,34 Z" data-face="barrel"/>
      <path d="M0,49 A15,15 0 0 1 15,34 L73,34 A15,15 0 0 1 88,49" data-edge="hi"/>
      <path d="M0,49 A15,15 0 0 0 15,64 L73,64 A15,15 0 0 0 88,49" data-edge="lo"/>

      <!-- 水位：原稿的波浪水面，向下填到罐底内缘 -->
      <path d="M2,49 L9.09,51.79 C13.79,53.64 19.02,53.66 23.73,51.83 L24.47,51.55 C28.69,49.92 33.39,50.02 37.53,51.83 C41.67,53.65 46.36,53.71 50.55,52.02 L51,51.83 C55.49,50.02 60.51,50 65.02,51.8 L65.11,51.83 C69.67,53.65 74.76,53.62 79.3,51.76 L86,49 L86,49 C86,56.18 80.18,62 73,62 L15,62 C7.82,62 2,56.18 2,49 Z" data-face="hole"/>
      <path d="M2,49 L9.09,51.79 C13.79,53.64 19.02,53.66 23.73,51.83 L24.47,51.55 C28.69,49.92 33.39,50.02 37.53,51.83 C41.67,53.65 46.36,53.71 50.55,52.02 L51,51.83 C55.49,50.02 60.51,50 65.02,51.8 L65.11,51.83 C69.67,53.65 74.76,53.62 79.3,51.76 L86,49" data-edge="hi" stroke-width="1.1"/>

      <!-- 观察窗：原稿水面上那只小圆 -->
      <circle cx="45.1" cy="43.7" r="3" data-face="cap"/>
      <circle cx="45.1" cy="43.7" r="3" data-edge="hi" stroke-width="1.1"/>

      <!-- 罐内气泡保留普通描边：它们是装饰，不是结构面 -->
      <ellipse cx="59.04" cy="42.97" rx="1.63" ry="1.64" stroke-opacity="0.75"/>
      <ellipse cx="30.63" cy="46.29" rx="2.18" ry="2.2" stroke-opacity="0.75"/>
      <ellipse cx="50.13" cy="11.21" rx="1.63" ry="1.64" stroke-opacity="0.75"/>
      <ellipse cx="30.08" cy="8.97" rx="1.63" ry="1.64" stroke-opacity="0.75"/>
      <ellipse cx="37.32" cy="12.89" rx="2.18" ry="2.2" stroke-opacity="0.75"/>
    </g>
  </svg>`,
  },

  thermal_water_tank: {
    icon25d: `<svg viewBox="0 0 73 98" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="36.3" cy="96" rx="33" ry="1.2" data-shadow="1"/>

      <!-- 箱壁剖面：内外圈都沿用原稿 1 单位圆角，evenodd 挖出箱口。
           剖面是一整块板材，四边同属一个切面，因此不按朝向分档（分档会读成相框） -->
      <path d="M4.6,3.6 H68.6 A1,1 0 0 1 69.6,4.6 V92.6 A1,1 0 0 1 68.6,93.6 H4.6 A1,1 0 0 1 3.6,92.6 V4.6 A1,1 0 0 1 4.6,3.6 Z M7.6,6.6 H65.6 A1,1 0 0 1 66.6,7.6 V89.6 A1,1 0 0 1 65.6,90.6 H7.6 A1,1 0 0 1 6.6,89.6 V7.6 A1,1 0 0 1 7.6,6.6 Z" fill-rule="evenodd" data-face="front"/>
      <rect x="3.6" y="3.6" width="66" height="3" rx="1" data-face="top"/>
      <path d="M4.6,3.6 H68.6" data-edge="hi"/>
      <path d="M4.6,93.6 H68.6" data-edge="lo"/>

      <!-- 箱口内侧：顶沿是一块板材，其下留一窄条暗面，开口才有厚度 -->
      <rect x="6.6" y="6.6" width="60" height="1.6" data-face="side"/>

      <!-- 背墙：内腔要明显比板材和水体都暗，否则整块读成「玻璃窗」 -->
      <rect x="6.6" y="8.2" width="60" height="82.4" data-face="hole"/>
      <rect x="6.6" y="8.2" width="60" height="82.4" data-face="hole" fill-opacity="0.75"/>
      <!-- 顶光从箱口漏进内腔：上端略亮、往下衰减，开口才有深度 -->
      <defs>
        <linearGradient id="tk-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="currentColor" stop-opacity="0.16"/>
          <stop offset="0.45" stop-color="currentColor" stop-opacity="0.05"/>
          <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="6.6" y="8.2" width="60" height="30" fill="url(#tk-spill)" stroke="none"/>

      <!-- 水体：剖面里的液面画成浅波（与除氧罐同一套语言），越深越暗 -->
      <path d="M6.6,90.6 V77.6 Q11,77 15.4,77.6 T24.2,77.6 T33,77.6 T41.8,77.6 T50.6,77.6 T59.4,77.6 Q63.8,78.2 66.6,77.6 V90.6 Z" data-face="barrel" fill-opacity="0.5"/>
      <path d="M6.6,77.6 Q11,77 15.4,77.6 T24.2,77.6 T33,77.6 T41.8,77.6 T50.6,77.6 T59.4,77.6 Q63.8,78.2 66.6,77.6" data-edge="hi" stroke-width="1" stroke-opacity="0.9"/>
      <path d="M18.6,83.4 H30.2 M38.6,84.8 H50.2" stroke-opacity="0.16"/>
      <path d="M24.4,86.6 H33.2 M43.4,87.8 H52.2" stroke-opacity="0.12"/>

      <!-- 内腔转角：背光侧与底部各一道暗棱，把剖面边界压住；受光侧靠填色边缘自然收 -->
      <path d="M66.6,7.6 V89.6" data-edge="lo" stroke-width="1.1"/>
      <path d="M7.6,90.6 H65.6" data-edge="lo" stroke-width="1.1"/>

      <!-- 两侧立柱：原稿的槽钢柱，顶面可见；与箱壁、底板各留一道接缝 -->
      <rect x="0" y="0" width="5.6" height="97.2" data-face="front"/>
      <rect x="0" y="0" width="5.6" height="1.2" data-face="top"/>
      <path d="M0,0 H5.6" data-edge="hi"/>
      <path d="M5.6,0 V97.2" data-edge="lo" stroke-width="1.1"/>
      <path d="M0,92 H5.6" data-edge="lo" stroke-width="1.1"/>
      <rect x="67" y="0" width="5.6" height="97.2" data-face="front"/>
      <rect x="67" y="0" width="5.6" height="1.2" data-face="top"/>
      <path d="M67,0 H72.6" data-edge="hi"/>
      <path d="M67,0 V97.2" data-edge="lo" stroke-width="1.1"/>
      <path d="M67,92 H72.6" data-edge="lo" stroke-width="1.1"/>
    </g>
  </svg>`,
  },

  thermal_coal_powder_tower: {
    icon25d: `<svg viewBox="0 0 60 172" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="30" cy="169.5" rx="17" ry="1.1" data-shadow="1"/>

      <!-- 顶部排气筒：竖圆柱 + 顶盖，圆角沿用原稿的肩线 -->
      <rect x="21.4" y="2.3" width="17.2" height="15.3" data-face="body"/>
      <ellipse cx="30" cy="2.3" rx="8.6" ry="2.3" data-face="cap"/>
      <path d="M21.4,2.3 A8.6,2.3 0 0 1 38.6,2.3" data-edge="hi"/>

      <!-- 筒身：原稿的圆肩方筒，按竖圆柱铺面 -->
      <path d="M16,16.6 L44,16.6 C52.84,16.6 60,23.76 60,32.6 L60,124.6 L0,124.6 L0,32.6 C0,23.76 7.16,16.6 16,16.6 Z" data-face="body"/>
      <path d="M0,32.6 C0,23.76 7.16,16.6 16,16.6 L44,16.6 C52.84,16.6 60,23.76 60,32.6" data-edge="hi"/>

      <!-- 环向焊缝：只画朝观察者的横线 -->
      <path d="M0,73 L60,73" data-edge="lo"/>
      <path d="M0,80 L60,80" data-edge="lo"/>

      <!-- 锥斗：左半朝受光侧、右半背光，中缝分界 -->
      <path d="M0,124.6 L30,124.6 L30,161.6 L25,161.6 Z" data-face="front"/>
      <path d="M30,124.6 L60,124.6 L35,161.6 L30,161.6 Z" data-face="side"/>
      <path d="M0,124.6 L60,124.6" data-edge="lo"/>
      <path d="M30,124.6 L30,161.6" data-edge="lo" stroke-width="1.1"/>

      <!-- 卸料短管 -->
      <rect x="25" y="161.6" width="10" height="9" data-face="body"/>
      <path d="M25,170.6 L35,170.6" data-edge="lo"/>
    </g>
  </svg>`,
  },

  thermal_desulfurization_tower: {
    icon25d: `<svg viewBox="0 0 58 140" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="29" cy="139" rx="20" ry="1" data-shadow="1"/>

      <!-- 两侧梯柱：先画，塔壁与托盘后压 -->
      <rect x="0" y="60" width="6" height="80" data-face="front"/>
      <rect x="0" y="60" width="6" height="1.2" data-face="top"/>
      <path d="M0,60 L6,60" data-edge="hi"/>
      <rect x="52" y="60" width="6" height="80" data-face="front"/>
      <rect x="52" y="60" width="6" height="1.2" data-face="top"/>
      <path d="M52,60 L58,60" data-edge="hi"/>

      <!-- 托盘伸出塔壁的支耳，左受光右背光 -->
      <rect x="6" y="63.9" width="4" height="1.2" data-face="front"/>
      <rect x="6" y="67.9" width="4" height="1.2" data-face="front"/>
      <rect x="6" y="85.9" width="4" height="1.2" data-face="front"/>
      <rect x="6" y="89.9" width="4" height="1.2" data-face="front"/>
      <rect x="6" y="107.9" width="4" height="1.2" data-face="front"/>
      <rect x="6" y="111.9" width="4" height="1.2" data-face="front"/>
      <rect x="48" y="63.9" width="4" height="1.2" data-face="side"/>
      <rect x="48" y="67.9" width="4" height="1.2" data-face="side"/>
      <rect x="48" y="85.9" width="4" height="1.2" data-face="side"/>
      <rect x="48" y="89.9" width="4" height="1.2" data-face="side"/>
      <rect x="48" y="107.9" width="4" height="1.2" data-face="side"/>
      <rect x="48" y="111.9" width="4" height="1.2" data-face="side"/>

      <!-- 塔身按剖面画：三面塔壁 + 压暗的内腔，托盘才留得住（原稿本就是剖面线稿） -->
      <rect x="9.4" y="30" width="1.2" height="109.6" data-face="front"/>
      <rect x="47.4" y="30" width="1.2" height="109.6" data-face="side"/>
      <rect x="9.4" y="138.4" width="39.2" height="1.2" data-face="front"/>
      <path d="M9.4,30 L48.6,30" data-edge="hi"/>
      <rect x="10.6" y="30" width="36.8" height="108.4" data-face="hole"/>

      <!-- 托盘：每层是锥形罩 + 一层水平筛板 -->
      <rect x="10.6" y="33" width="36.8" height="5" data-face="front"/>
      <path d="M10.6,33 L47.4,33" data-edge="hi"/>

      <path d="M29,42 L47.4,50.4 L10.6,50.4 Z" data-face="side"/>
      <rect x="10.6" y="50" width="36.8" height="4" data-face="front"/>
      <path d="M10.6,50 L47.4,50" data-edge="hi"/>

      <path d="M29,65 L47.4,73.4 L10.6,73.4 Z" data-face="side"/>
      <rect x="10.6" y="73" width="36.8" height="4" data-face="front"/>
      <path d="M10.6,73 L47.4,73" data-edge="hi"/>

      <path d="M29,88 L47.4,96.4 L10.6,96.4 Z" data-face="side"/>
      <rect x="10.6" y="96" width="36.8" height="4" data-face="front"/>
      <path d="M10.6,96 L47.4,96" data-edge="hi"/>

      <path d="M29,111 L47.4,119.4 L10.6,119.4 Z" data-face="side"/>
      <rect x="10.6" y="119" width="36.8" height="4" data-face="front"/>
      <path d="M10.6,119 L47.4,119" data-edge="hi"/>

      <rect x="10.6" y="131" width="36.8" height="4" data-face="front"/>
      <path d="M10.6,131 L47.4,131" data-edge="hi"/>

      <!-- 顶部锥斗：左半受光、右半背光 -->
      <path d="M21,17 L9.3,29.8 L28.85,29.8 L29,17 Z" data-face="front"/>
      <path d="M29,17 L28.85,29.8 L48.4,29.8 L37,17 Z" data-face="side"/>
      <path d="M21,17 L9.3,29.8 L48.4,29.8 L37,17" data-edge="hi"/>

      <!-- 排气管 -->
      <rect x="21" y="1.8" width="16" height="15.6" data-face="body"/>
      <ellipse cx="29" cy="1.8" rx="8" ry="1.8" data-face="cap"/>
      <path d="M21,1.8 A8,1.8 0 0 1 37,1.8" data-edge="hi"/>
      <path d="M21,8.6 L37,8.6" data-edge="lo"/>
    </g>
  </svg>`,
  },

  thermal_chimney: {
    icon25d: `<svg viewBox="0 0 65 139" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="20" cy="136.86" rx="19" ry="0.9" data-shadow="1"/>

      <!-- 筒身：上下不同径的锥筒，母线与原稿两条边线重合 -->
      <path d="M10,23.7 L5,135 L35,135 L31.2,23.7 Z" data-face="body"/>
      <path d="M10,23.7 L5,135" data-edge="hi"/>
      <path d="M31.2,23.7 L35,135" data-edge="lo"/>
      <path d="M5,135 L35,135" data-edge="lo"/>

      <!-- 囱顶箍：外径比筒身宽，顶面朝上 -->
      <rect x="5.2" y="15.8" width="30.8" height="7.9" rx="0.6" data-face="front"/>
      <rect x="5.2" y="14.6" width="30.8" height="1.6" rx="0.8" data-face="top"/>
      <path d="M6.4,14.6 L34.8,14.6" data-edge="hi"/>
      <path d="M5.2,23.4 L36,23.4" data-edge="lo"/>

      <!-- 地面线与烟迹：装饰件沿用原稿路径（保证内容包围盒与 2D 一致），不参与受光 -->
      <path d="M0.312543434,136.61021 C13.8250988,129.231117 27.3751276,129.231117 40.887683,136.61021 C41.1785141,136.769031 41.2855299,137.133545 41.1267095,137.424376 C40.9678891,137.715208 40.6033745,137.822223 40.3125434,137.663403 C27.1584322,130.480053 14.0417943,130.480053 0.887683013,137.663403 C0.596851932,137.822223 0.232337378,137.715208 0.0735169685,137.424376 C-0.0853034408,137.133545 0.0217123531,136.769031 0.312543434,136.61021 Z" fill="currentColor" fill-opacity="0.5" stroke="none"/>
      <path d="M18.023,7.35280724 C19.5819158,1.87151763 22.6666787,-0.607362936 27.1546503,0.125834724 C28.7244752,0.375626256 30.7225163,1.67815586 33.2089301,4.02513425 L33.5096478,4.31178448 C36.6089577,7.29444117 39.5052663,7.11734523 42.2145664,4.49987408 L42.3949095,4.32176853 C44.8240348,1.87053688 47.7821591,2.20625198 50.2152782,4.28822315 C51.2151275,5.14377412 52.7328313,5.58420812 54.7876743,5.58420812 C55.1190451,5.58420812 55.3876743,5.85283727 55.3876743,6.18420812 C55.3876743,6.51557897 55.1190451,6.78420812 54.7876743,6.78420812 C52.4698569,6.78420812 50.6792365,6.26457436 49.4350978,5.19998983 C47.4919541,3.53728084 45.3047333,3.24535242 43.4227932,4.99628871 L43.2472725,5.16644446 C40.112502,8.32974305 36.493768,8.69599363 32.8935354,5.37982463 L32.6775476,5.1764285 C30.2152428,2.80680099 28.2888636,1.52140814 26.9636255,1.3105302 C23.1381722,0.685572259 20.5827678,2.73906635 19.1772265,7.68107708 C19.0865773,7.99980794 18.7547092,8.18470464 18.4359783,8.09405543 C18.1172474,8.00340622 17.9323507,7.6715381 18.023,7.35280724 Z" fill="currentColor" fill-opacity="0.85" stroke="none"/>
      <path d="M63.2627452,5.63278066 C63.5941161,5.63278066 63.8627452,5.90140981 63.8627452,6.23278066 C63.8627452,6.53101442 63.6451556,6.77842741 63.3600683,6.82492767 L63.2627452,6.83278066 L58.9613078,6.83278066 C58.629937,6.83278066 58.3613078,6.56415151 58.3613078,6.23278066 C58.3613078,5.93454689 58.5788974,5.6871339 58.8639847,5.64063364 L58.9613078,5.63278066 L63.2627452,5.63278066 Z" fill="currentColor" fill-opacity="0.85" stroke="none"/>
    </g>
  </svg>`,
  },
}

const thermalAssetComponents = buildAssetComponents('thermal', thermalIcons, thermalMeta).map(
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

/**
 * 热力系统（外部素材导入）：布袋除尘器 / 除氧罐 / 斗式提升机 / 分气缸 / 锅炉 /
 * 脱硫塔 / 烟囱 / 刮板机 / 一键点火 等 22 台。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const thermalComponents = thermalAssetComponents
