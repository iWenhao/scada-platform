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

  thermal_air_compressor: {
    icon25d: `<svg viewBox="0 0 66 59" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="33" cy="57.4" rx="29" ry="0.9" data-shadow="1"/>

      <!-- 底脚：先画，箱体压住顶边 -->
      <path d="M4.5,54 H15.5 L14.5,58.6 H5.5 Z" data-face="front"/>
      <path d="M50.5,54 H61.5 L60.5,58.6 H51.5 Z" data-face="front"/>
      <path d="M5.5,58.6 H14.5 M51.5,58.6 H60.5" data-edge="lo"/>

      <!-- 箱体：顶面一条 + 正面整块，底边压暗 -->
      <path d="M1,0 H65 A1,1 0 0 1 66,1 V2.2 H0 V1 A1,1 0 0 1 1,0 Z" data-face="top"/>
      <path d="M0,2.2 H66 V53 A1,1 0 0 1 65,54 H1 A1,1 0 0 1 0,53 Z" data-face="front"/>
      <path d="M1,0 H65" data-edge="hi"/>
      <path d="M0,54 H66" data-edge="lo"/>

      <!-- 两扇舱门：门缝是凹槽，门楣受光 -->
      <rect x="4.6" y="5.2" width="25.4" height="44.6" rx="1" data-edge="lo" stroke-width="1.1"/>
      <rect x="34.6" y="5.2" width="27.4" height="44.6" rx="1" data-edge="lo" stroke-width="1.1"/>
      <path d="M34.6,27.5 H62" data-edge="lo" stroke-width="1.1"/>
      <path d="M5.6,5.2 H29 M35.6,5.2 H61" data-edge="hi" stroke-width="1.1"/>

      <!-- 显示屏：内凹暗屏 -->
      <rect x="40.6" y="10.6" width="14.8" height="6.8" rx="1" data-face="hole"/>
      <path d="M41.6,10.6 H54.4" data-edge="hi" stroke-width="1"/>
      <path d="M40.6,17.4 H55.4" data-edge="lo" stroke-width="1"/>
    </g>
  </svg>`,
  },

  thermal_heat_extractor: {
    icon25d: `<svg viewBox="0 0 66 80" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="33" cy="78.8" rx="30" ry="0.9" data-shadow="1"/>

      <!-- 箱体：顶面一条 + 正面整块；百叶门在正面上真挖空，门内才暗得下去 -->
      <path d="M1,0 H65 A1,1 0 0 1 66,1 V2.4 H0 V1 A1,1 0 0 1 1,0 Z" data-face="top"/>
      <path d="M0,2.4 H66 V79 A1,1 0 0 1 65,80 H1 A1,1 0 0 1 0,79 Z M5,19 H31 V70 H5 Z M35,19 H61 V70 H35 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M1,0 H65" data-edge="hi"/>
      <path d="M0,80 H66" data-edge="lo"/>

      <!-- 顶部控制条：抬起的面板 + 两颗指示灯 -->
      <rect x="5" y="4" width="56" height="6" rx="1" data-face="front"/>
      <path d="M5.8,4 H60.2" data-edge="hi" stroke-width="1"/>
      <path d="M5,10 H61" data-edge="lo" stroke-width="1"/>
      <circle cx="51.5" cy="7" r="1.5" data-face="cap"/>
      <circle cx="56.5" cy="7" r="1.5" data-face="cap"/>

      <!-- 环向箍：顶面受光，下沿落影 -->
      <rect x="0" y="13.4" width="66" height="1.2" data-face="top"/>
      <path d="M0,14.6 H66" data-edge="lo" stroke-width="1"/>

      <!-- 两扇百叶门：门内压暗，叶片朝上受光 -->
      <rect x="5" y="19" width="26" height="51" data-face="hole"/>
      <rect x="35" y="19" width="26" height="51" data-face="hole"/>
      <path d="M6,23.9 H30.24 V25.1 H6 Z M6,28.9 H30.24 V30.1 H6 Z M6,33.9 H30.24 V35.1 H6 Z M6,38.9 H30.24 V40.1 H6 Z M6,43.9 H30.24 V45.1 H6 Z M6,48.9 H30.24 V50.1 H6 Z M6,53.9 H30.24 V55.1 H6 Z M6,58.9 H30.24 V60.1 H6 Z M6,63.9 H30.24 V65.1 H6 Z" data-face="top"/>
      <path d="M36,23.9 H60.24 V25.1 H36 Z M36,28.9 H60.24 V30.1 H36 Z M36,33.9 H60.24 V35.1 H36 Z M36,38.9 H60.24 V40.1 H36 Z M36,43.9 H60.24 V45.1 H36 Z M36,48.9 H60.24 V50.1 H36 Z M36,53.9 H60.24 V55.1 H36 Z M36,58.9 H60.24 V60.1 H36 Z M36,63.9 H60.24 V65.1 H36 Z" data-face="top"/>
      <path d="M5,19 H31 M35,19 H61" data-edge="hi" stroke-width="1"/>
      <path d="M5,70 H31 M35,70 H61" data-edge="lo" stroke-width="1"/>

      <!-- 四只支脚：原稿的钥匙形，凸出面板 -->
      <path d="M8,74 V70 H12 V74 C12,74.55 11.55,75 11,75 V77 C11,77.55 10.55,78 10,78 C9.45,78 9,77.55 9,77 V75 C8.45,75 8,74.55 8,74 Z" data-face="front" data-edge="lo" stroke-width="1"/>
      <path d="M24,74 V70 H28 V74 C28,74.55 27.55,75 27,75 V77 C27,77.55 26.55,78 26,78 C25.45,78 25,77.55 25,77 V75 C24.45,75 24,74.55 24,74 Z" data-face="front" data-edge="lo" stroke-width="1"/>
      <path d="M38,74 V70 H42 V74 C42,74.55 41.55,75 41,75 V77 C41,77.55 40.55,78 40,78 C39.45,78 39,77.55 39,77 V75 C38.45,75 38,74.55 38,74 Z" data-face="front" data-edge="lo" stroke-width="1"/>
      <path d="M54,74 V70 H58 V74 C58,74.55 57.55,75 57,75 V77 C57,77.55 56.55,78 56,78 C55.45,78 55,77.55 55,77 V75 C54.45,75 54,74.55 54,74 Z" data-face="front" data-edge="lo" stroke-width="1"/>
    </g>
  </svg>`,
  },

  thermal_ash_handler: {
    icon25d: `<svg viewBox="0 0 43 90" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="21.5" cy="88" rx="16" ry="0.6" data-shadow="1"/>

      <!-- 双腿：先画，罐体压住上端 -->
      <rect x="3.16" y="62.8" width="1.27" height="25.2" data-face="front"/>
      <path d="M3.16,88 H4.43" data-edge="lo"/>
      <path d="M37.94,62.66 H40.47 V87.34 H41.74 V88.6 H36.68 V87.34 H37.94 Z" data-face="front"/>
      <path d="M36.68,88.6 H41.74" data-edge="lo"/>

      <!-- 罐体：圆肩直筒，左受光右背光 -->
      <path d="M15.09,20.71 C6.75,20.71 0,27.47 0,35.8 V55.91 H43 V35.8 C43,27.47 36.25,20.71 27.91,20.71 Z" data-face="body"/>
      <path d="M15.09,20.71 C6.75,20.71 0,27.47 0,35.8" data-edge="hi"/>
      <path d="M43,35.8 C43,27.47 36.25,20.71 27.91,20.71" data-edge="lo"/>

      <!-- 肩部加强圈：封头与筒身的交界，环带按竖圆柱铺面，上下各一道棱 -->
      <path d="M41.145,31.574 H1.855 C1.46,32.811 1.234,34.124 1.203,35.486 L1.2,35.8 H41.8 C41.8,34.326 41.57,32.906 41.145,31.574 Z" data-face="body"/>
      <path d="M1.855,31.574 H41.145" data-edge="hi" stroke-width="1"/>
      <path d="M1.2,35.8 H41.8" data-edge="lo" stroke-width="1"/>

      <!-- 筒身底部的内壁折线：原稿在这里画了一道锥内壁 -->
      <path d="M1.2,52.945 H41.8" data-edge="lo" stroke-width="1"/>

      <!-- 腰部：收颈 + 法兰，两端各一只角撑 -->
      <path d="M0,55.914 H43 L40.475,58.128 H2.438 Z" data-face="side"/>
      <rect x="0.664" y="58.13" width="41.674" height="5.29" data-face="front"/>
      <path d="M0.664,58.13 H42.338" data-edge="hi"/>
      <path d="M0.664,63.42 H42.338" data-edge="lo"/>
      <path d="M3.341,58.844 L1.864,60.427 V62.056 H7.003 Z" data-face="front" data-edge="lo" stroke-width="1"/>
      <path d="M39.572,58.92 L35.815,62.215 H41.138 V60.586 Z" data-face="front" data-edge="lo" stroke-width="1"/>

      <!-- 锥斗：左半受光、右半背光，中缝分界 -->
      <path d="M8.37,63.42 H21.4 V69.23 H15.18 Z" data-face="front"/>
      <path d="M21.4,63.42 H34.45 L27.82,69.23 H21.4 Z" data-face="side"/>
      <path d="M8.37,63.42 H34.45" data-edge="lo"/>
      <path d="M21.4,63.42 V69.23" data-edge="lo" stroke-width="1.1"/>
      <path d="M15.18,69.23 H27.82" data-edge="lo"/>

      <!-- 卸料管 -->
      <rect x="15.18" y="69.23" width="12.64" height="5.6" data-face="body"/>
      <path d="M15.18,74.83 H27.82" data-edge="lo"/>

      <!-- 顶部接管：短筒分上下两段，法兰中间真开一道缝，缝里透出画布 -->
      <rect x="13.31" y="5.63" width="16.38" height="7.54" data-face="body"/>
      <path d="M13.31,5.63 C13.31,2.52 15.83,0 21.5,0 C27.17,0 29.69,2.52 29.69,5.63 Z" data-face="cap"/>
      <path d="M13.31,5.63 C13.31,2.52 15.83,0 21.5,0 C27.17,0 29.69,2.52 29.69,5.63" data-edge="hi"/>
      <rect x="13.31" y="18.2" width="16.38" height="3.45" data-face="body"/>
      <path d="M10.12,13.17 H32.88 V18.2 H10.12 Z M11.32,14.37 H31.68 V17 H11.32 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M10.12,13.17 H32.88" data-edge="hi"/>
      <path d="M10.12,18.2 H32.88" data-edge="lo"/>
      <path d="M13.31,21.65 H29.69" data-edge="lo" stroke-width="1"/>
    </g>
  </svg>`,
  },

  thermal_dryer: {
    icon25d: `<svg viewBox="0 0 74 64" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="37" cy="61.9" rx="36" ry="0.7" data-shadow="1"/>

      <!-- 两端机柜：顶面一条 + 正面，柜身横放一道压条 -->
      <rect x="0" y="13.6" width="15" height="46" rx="1.4" data-face="front"/>
      <rect x="0.7" y="13.6" width="13.6" height="1.4" data-face="top"/>
      <path d="M1,13.6 H14" data-edge="hi"/>
      <path d="M0,59.6 H15 M59,59.6 H74" data-edge="lo"/>
      <rect x="1" y="49" width="13.7" height="1.2" data-face="top"/>
      <rect x="59" y="13.6" width="15" height="46" rx="1.4" data-face="front"/>
      <rect x="59.7" y="13.6" width="13.6" height="1.4" data-face="top"/>
      <path d="M60,13.6 H73" data-edge="hi"/>
      <rect x="60" y="49" width="13.7" height="1.2" data-face="top"/>

      <!-- 机柜阀组：手轮 → 阀杆座 → 短管 → 卡箍，卡箍伸进罐体边缘由罐身压住 -->
      <rect x="2" y="21.6" width="4" height="4" rx="1" data-face="front" data-edge="lo" stroke-width="1"/>
      <rect x="8.5" y="19.6" width="4" height="8" rx="1" data-face="front" data-edge="lo" stroke-width="1"/>
      <rect x="9.7" y="20.8" width="1.6" height="5.6" data-edge="lo" stroke-width="1"/>
      <rect x="12.5" y="21" width="3.9" height="5.2" data-face="front" data-edge="lo" stroke-width="1"/>
      <path d="M16.4,20.49 C16.4,19.7 17.05,19.07 17.86,19.01 L18,19 L22.8,19 L22.8,20.2 L18,20.2 C17.79,20.2 17.64,20.31 17.61,20.44 L17.6,20.49 L17.6,26.71 C17.6,26.84 17.73,26.96 17.92,26.99 L18,27 L22.8,27 L22.8,28.2 L18,28.2 C17.18,28.2 16.48,27.62 16.41,26.85 L16.4,26.71 Z" data-face="front" data-edge="lo" stroke-width="1"/>
      <rect x="68" y="21.6" width="4" height="4" rx="1" data-face="front" data-edge="lo" stroke-width="1"/>
      <rect x="61.5" y="19.6" width="4" height="8" rx="1" data-face="front" data-edge="lo" stroke-width="1"/>
      <rect x="62.7" y="20.8" width="1.6" height="5.6" data-edge="lo" stroke-width="1"/>
      <rect x="57.6" y="21" width="3.9" height="5.2" data-face="front" data-edge="lo" stroke-width="1"/>
      <path d="M57.6,20.49 C57.6,19.7 56.95,19.07 56.14,19.01 L56,19 L51.2,19 L51.2,20.2 L56,20.2 C56.21,20.2 56.36,20.31 56.39,20.44 L56.4,20.49 L56.4,26.71 C56.4,26.84 56.27,26.96 56.08,26.99 L56,27 L51.2,27 L51.2,28.2 L56,28.2 C56.82,28.2 57.52,27.62 57.59,26.85 L57.6,26.71 Z" data-face="front" data-edge="lo" stroke-width="1"/>

      <!-- 罐体：顶盖法兰 → 上肩锥 → 筒身 → 下肩锥 → 卸料口 + 底盘 -->
      <rect x="33.4" y="1.2" width="7.2" height="2.07" data-face="body"/>
      <rect x="32" y="0" width="10" height="1.2" rx="0.6" data-face="front"/>
      <rect x="32" y="0" width="10" height="0.5" rx="0.25" data-face="top"/>
      <path d="M32.6,0 H41.4" data-edge="hi" stroke-width="1"/>
      <path d="M32,1.2 H42" data-edge="lo" stroke-width="1"/>

      <!-- 上肩锥：左半受光、右半背光，中缝分界 -->
      <path d="M33.4,3.27 H37 V15 H22.48 Z" data-face="front"/>
      <path d="M37,3.27 H41.5 L51.5,15 H37 Z" data-face="side"/>
      <path d="M33.4,3.27 H41.5" data-edge="hi"/>
      <path d="M22.48,15 H51.5" data-edge="lo"/>
      <path d="M37,3.27 V15" data-edge="lo" stroke-width="1.1"/>

      <!-- 筒身：竖圆柱，顶沿受光、底沿接锥斗 -->
      <rect x="22.18" y="15" width="29.64" height="18.35" data-face="body"/>
      <path d="M22.18,15 H51.82" data-edge="hi" stroke-width="1"/>
      <path d="M22.18,33.35 H51.82" data-edge="lo" stroke-width="1"/>

      <!-- 下肩锥：同样左右分面，收口到卸料口 -->
      <path d="M22.18,33.35 H37 V43.82 H32.6 Z" data-face="front"/>
      <path d="M37,33.35 H51.82 L41.34,43.82 H37 Z" data-face="side"/>
      <path d="M37,33.35 V43.82" data-edge="lo" stroke-width="1.1"/>
      <path d="M32.6,43.82 H41.34" data-edge="lo"/>

      <!-- 卸料口与底盘 -->
      <rect x="34.6" y="43.82" width="4.8" height="1.75" data-face="body"/>
      <rect x="32" y="45.57" width="10" height="1.2" rx="0.6" data-face="front"/>
      <path d="M32,46.77 H42" data-edge="lo" stroke-width="1"/>

      <!-- 罐体右上角的小阀件：菱形手轮 + 短接管 -->
      <path d="M46.207,18.479 L48.328,20.6 C48.719,20.99 48.719,21.624 48.328,22.014 L48.001,22.341 L49.585,23.999 L52.494,24 L52.494,25.2 L49.073,25.2 L47.152,23.19 L46.914,23.428 C46.524,23.819 45.891,23.819 45.5,23.428 L43.379,21.307 C42.988,20.917 42.988,20.283 43.379,19.893 L44.793,18.479 C45.183,18.088 45.817,18.088 46.207,18.479 Z" data-face="front" data-edge="lo" stroke-width="1"/>
      <path d="M45.501,19.469 L44.369,20.6 L46.208,22.438 L47.339,21.307 Z" data-edge="lo" stroke-width="1"/>

      <!-- 底座：顶面一条 + 正面板身 -->
      <rect x="0" y="58.6" width="74" height="1.2" data-face="top"/>
      <path d="M0,59.8 H74" data-edge="hi" stroke-width="1"/>
      <rect x="0" y="59.8" width="74" height="2.8" data-face="front"/>
      <path d="M0,62.6 H74" data-edge="lo"/>
    </g>
  </svg>`,
  },

  thermal_bag_filter: {
    icon25d: `<svg viewBox="0 0 82 69" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="40.6" cy="68.2" rx="38" ry="0.4" data-shadow="1"/>

      <!-- 支腿先画：三根落到地脚上，箱体与灰斗后压 -->
      <path d="M3,44.9 H4.4 L5.67,65.6 H2.1 Z" data-face="front"/>
      <path d="M38.5,42.7 H42.3 L42.7,65.6 H38.5 Z" data-face="front"/>
      <path d="M77.5,44.3 H78.9 L79.7,65.6 H75.1 Z" data-face="front"/>

      <!-- 两只灰斗：左半受光、右半背光，锥口中缝分界 -->
      <path d="M1.2,38.8 H21 V59 H19 Z" data-face="front"/>
      <path d="M21,38.8 H40.6 L23,59 H21 Z" data-face="side"/>
      <path d="M21,38.8 V59" data-edge="lo" stroke-width="1.1"/>
      <path d="M1.2,38.8 L19,59" data-edge="lo"/>
      <path d="M41.4,38.8 H59.5 V59 H57 Z" data-face="front"/>
      <path d="M59.5,38.8 H80 L62,59 H59.5 Z" data-face="side"/>
      <path d="M59.5,38.8 V59" data-edge="lo" stroke-width="1.1"/>
      <path d="M80,38.8 L62,59" data-edge="lo"/>
      <rect x="19" y="59" width="4" height="1.2" data-face="body"/>
      <rect x="57" y="59" width="5" height="1.2" data-face="body"/>

      <!-- 地脚：三块落在支腿下 -->
      <rect x="0.6" y="65.6" width="6" height="3" rx="1.5" data-face="front"/>
      <rect x="37.6" y="65.6" width="6" height="3" rx="1.5" data-face="front"/>
      <rect x="74.6" y="65.6" width="6" height="3" rx="1.5" data-face="front"/>
      <path d="M0.6,68.6 H6.6 M37.6,68.6 H43.6 M74.6,68.6 H80.6" data-edge="lo"/>

      <!-- 箱体：顶檐 + 正面，正面 15 道滤袋竖条按 body 铺面 -->
      <rect x="0" y="0" width="81.2" height="2.6" data-face="top"/>
      <path d="M0,0 H81.2" data-edge="hi"/>
      <rect x="0" y="2.6" width="80" height="35.93" data-face="front"/>
      <path d="M0,2.6 V38.53" data-edge="hi"/>
      <path d="M80,2.6 V38.53" data-edge="lo"/>
      <rect x="1.2" y="8.53" width="78.4" height="1.2" data-face="front"/>
      <path d="M1.2,9.73 H79.6" data-edge="lo"/>
      <rect x="5" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="10" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="15" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="20" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="25" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="30" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="35" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="40" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="45" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="50" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="55" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="60" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="65" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="70" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="75" y="9.73" width="1.2" height="28.8" data-face="body"/>
      <rect x="0" y="38.53" width="80" height="1.2" data-face="front"/>
      <path d="M0,39.73 H80" data-edge="lo"/>
      <path d="M1.5,39.73 V65.6" data-edge="lo"/>
      <path d="M78.5,39.73 V65.6" data-edge="hi"/>
    </g>
  </svg>`,
  },

  thermal_feeder: {
    icon25d: `<svg viewBox="0 0 78 84" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <g transform="translate(0.103,0.4)">
        <ellipse cx="38.9" cy="72.3" rx="27" ry="0.5" data-shadow="1"/>

        <!-- 料斗：开口朝上的漏斗，内腔压暗，斗壁左右分面 -->
        <path d="M1.2,1.2 H76.48 L50.1,24 H27.7 Z" data-face="hole"/>
        <path d="M1.2,1.2 H76.48 L50.1,24 H27.7 Z" data-face="hole" fill-opacity="0.8"/>
        <path d="M0,0 H38.9 V25.2 H27.27 Z M1.2,1.2 H38.9 V24 H27.7 Z" fill-rule="evenodd" data-face="front"/>
        <path d="M38.9,0 H77.79 L50.53,25.2 H38.9 Z M38.9,1.2 H76.48 L50.1,24 H38.9 Z" fill-rule="evenodd" data-face="side"/>
        <rect x="0" y="0" width="77.79" height="1.2" data-face="top"/>
        <path d="M0,0 H77.79" data-edge="hi"/>
        <path d="M0,0 L27.27,25.2" data-edge="hi"/>
        <path d="M77.79,0 L50.53,25.2" data-edge="lo"/>
        <path d="M1.2,1.2 L27.7,24" data-edge="lo"/>
        <path d="M76.48,1.2 L50.1,24" data-edge="lo"/>
        <path d="M27.7,24 H50.1" data-edge="lo"/>

        <!-- 给料室：正面按箱体铺面，四角沿用原稿 1.2 圆角 -->
        <rect x="22.3" y="35" width="33.2" height="30.2" rx="1.2" data-face="front"/>
        <path d="M22.3,35 H26.3 M51.5,35 H55.5" data-edge="hi"/>
        <path d="M22.3,35 V65.2" data-edge="hi"/>
        <path d="M55.5,35 V65.2" data-edge="lo"/>
        <path d="M22.3,65.2 H55.5" data-edge="lo"/>

        <!-- 漏斗颈：原稿里下探进给料室 1.2，后画压住室顶中段 -->
        <rect x="26.3" y="24.6" width="25.2" height="11.6" data-face="body"/>
        <path d="M26.3,24.6 H51.5" data-edge="hi"/>

        <!-- 侧挂电机 + 阀杆 -->
        <!-- 侧挂电机：竖置圆筒（body 横向受光）+ 顶沿 top；
             电机前的两根接管与环箍先画，壳身后压，接口才藏在轮廓里 -->
        <path d="M66.107,45.038 L70.023,46.5 L69.912,47.7 L65.686,46.162 Z" data-face="front"/>
        <path d="M66.108,56.662 L69.999,55.2 L69.681,54.038 L65.686,55.538 Z" data-face="front"/>
        <path d="M70,46.5 H75.9 A1.6,1.6 0 0 1 77.5,48.1 V53.6 A1.6,1.6 0 0 1 75.9,55.2 H70 A1.6,1.6 0 0 1 68.8,53.6 V48.1 A1.6,1.6 0 0 1 70,46.5 Z M70,47.7 H75.9 A0.4,0.4 0 0 1 76.3,48.1 V53.6 A0.4,0.4 0 0 1 75.9,54 H70 A0.4,0.4 0 0 1 69.6,53.6 V48.1 A0.4,0.4 0 0 1 70,47.7 Z" fill-rule="evenodd" data-face="front"/>
        <rect x="68.797" y="46.6" width="1.2" height="8.3" data-face="body"/>
        <rect x="68.897" y="49" width="8" height="1.2" data-face="top"/>
        <rect x="68.897" y="51.5" width="8" height="1.2" data-face="top"/>
        <rect x="54.9" y="45" width="5" height="1.2" data-face="body"/>
        <rect x="54.9" y="55" width="5" height="1.2" data-face="body"/>
        <path d="M54.9,46.2 H59.9 M54.9,56.2 H59.9" data-edge="lo"/>
        <rect x="59.3" y="42" width="7.2" height="17.2" rx="0.8" data-face="body"/>
        <rect x="59.9" y="42" width="6" height="1.2" rx="0.6" data-face="top"/>
        <path d="M59.9,42 H65.9" data-edge="hi"/>
        <path d="M59.3,42.8 V58.4" data-edge="hi"/>
        <path d="M66.5,42.8 V58.4" data-edge="lo"/>

        <!-- 底座横梁 + 卸料溜管 -->
        <rect x="11.5" y="69.2" width="54.8" height="2.8" rx="1.4" data-face="front"/>
        <path d="M12.9,69.2 H64.9" data-edge="hi"/>
        <path d="M11.5,72 H66.3" data-edge="lo"/>
        <rect x="33.3" y="71.6" width="12.2" height="7.6" data-face="front"/>
        <path d="M33.3,79.2 H45.5" data-edge="lo"/>
        <rect x="35.3" y="78.6" width="8.2" height="4.6" data-face="body"/>
        <path d="M35.3,83.2 H43.5" data-edge="lo"/>
      </g>
    </g>
  </svg>`,
  },

  thermal_economizer: {
    icon25d: `<svg viewBox="0 0 80 46" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <!-- 外壳：一圈板材 + 压暗的内腔；板材顶面一条交代厚度 -->
      <path d="M0,0 H80 V46 H0 Z M1.2,1.2 H78.8 V44.8 H1.2 Z" fill-rule="evenodd" data-face="front"/>
      <rect x="0" y="0" width="80" height="1.2" data-face="top"/>
      <path d="M0,0 H80" data-edge="hi"/>
      <ellipse cx="40" cy="45.5" rx="34" ry="0.5" data-shadow="1"/>
      <rect x="1.2" y="1.2" width="77.6" height="43.6" data-face="hole"/>
      <rect x="1.2" y="1.2" width="77.6" height="43.6" data-face="hole" fill-opacity="0.75"/>
      <path d="M78.8,1.2 V44.8" data-edge="lo"/>
      <path d="M1.2,44.8 H78.8" data-edge="lo"/>

      <!-- 蛇形管：沿用原稿路径与 3 的管径（改粗会让包围盒补偿跳变） -->
      <path d="M18.5714286,12.4575163 L18.5714286,34.745098 C18.5714286,37.0950155 16.6526489,39 14.2857143,39 C11.9187796,39 10,37.0950155 10,34.745098 L10,12.4575163 M18.5714286,34.5424837 L18.5714286,12.254902 C18.5714286,9.9049845 20.4902082,8 22.8571429,8 C25.2240775,8 27.1428571,9.9049845 27.1428571,12.254902 L27.1428571,34.5424837" stroke="currentColor" stroke-width="3"/>
      <path d="M35.7142857,12.4575163 L35.7142857,34.745098 C35.7142857,37.0950155 33.7955061,39 31.4285714,39 C29.0616368,39 27.1428571,37.0950155 27.1428571,34.745098 L27.1428571,12.4575163 M35.7142857,34.5424837 L35.7142857,12.254902 C35.7142857,9.9049845 37.6330654,8 40,8 C42.3669346,8 44.2857143,9.9049845 44.2857143,12.254902 L44.2857143,34.5424837" stroke="currentColor" stroke-width="3"/>
      <path d="M52.8571429,12.4575163 L52.8571429,34.745098 C52.8571429,37.0950155 50.9383632,39 48.5714286,39 C46.2044939,39 44.2857143,37.0950155 44.2857143,34.745098 L44.2857143,12.4575163 M52.8571429,34.5424837 L52.8571429,12.254902 C52.8571429,9.9049845 54.7759225,8 57.1428571,8 C59.5097918,8 61.4285714,9.9049845 61.4285714,12.254902 L61.4285714,34.5424837" stroke="currentColor" stroke-width="3"/>
      <path d="M70,12.4575163 L70,34.745098 C70,37.0950155 68.0812204,39 65.7142857,39 C63.3473511,39 61.4285714,37.0950155 61.4285714,34.745098 L61.4285714,12.4575163" stroke="currentColor" stroke-width="3"/>

      <!-- 翅片：8 列 × 7 片，压在管束上 -->
      <rect x="7" y="14" width="6" height="1.2" data-face="top"/>
      <rect x="7" y="17" width="6" height="1.2" data-face="top"/>
      <rect x="7" y="20" width="6" height="1.2" data-face="top"/>
      <rect x="7" y="23" width="6" height="1.2" data-face="top"/>
      <rect x="7" y="26" width="6" height="1.2" data-face="top"/>
      <rect x="7" y="29" width="6" height="1.2" data-face="top"/>
      <rect x="7" y="32" width="6" height="1.2" data-face="top"/>
      <rect x="15.5" y="14" width="6" height="1.2" data-face="top"/>
      <rect x="15.5" y="17" width="6" height="1.2" data-face="top"/>
      <rect x="15.5" y="20" width="6" height="1.2" data-face="top"/>
      <rect x="15.5" y="23" width="6" height="1.2" data-face="top"/>
      <rect x="15.5" y="26" width="6" height="1.2" data-face="top"/>
      <rect x="15.5" y="29" width="6" height="1.2" data-face="top"/>
      <rect x="15.5" y="32" width="6" height="1.2" data-face="top"/>
      <rect x="24" y="14" width="6" height="1.2" data-face="top"/>
      <rect x="24" y="17" width="6" height="1.2" data-face="top"/>
      <rect x="24" y="20" width="6" height="1.2" data-face="top"/>
      <rect x="24" y="23" width="6" height="1.2" data-face="top"/>
      <rect x="24" y="26" width="6" height="1.2" data-face="top"/>
      <rect x="24" y="29" width="6" height="1.2" data-face="top"/>
      <rect x="24" y="32" width="6" height="1.2" data-face="top"/>
      <rect x="32.7" y="14" width="6" height="1.2" data-face="top"/>
      <rect x="32.7" y="17" width="6" height="1.2" data-face="top"/>
      <rect x="32.7" y="20" width="6" height="1.2" data-face="top"/>
      <rect x="32.7" y="23" width="6" height="1.2" data-face="top"/>
      <rect x="32.7" y="26" width="6" height="1.2" data-face="top"/>
      <rect x="32.7" y="29" width="6" height="1.2" data-face="top"/>
      <rect x="32.7" y="32" width="6" height="1.2" data-face="top"/>
      <rect x="41.3" y="14" width="6" height="1.2" data-face="top"/>
      <rect x="41.3" y="17" width="6" height="1.2" data-face="top"/>
      <rect x="41.3" y="20" width="6" height="1.2" data-face="top"/>
      <rect x="41.3" y="23" width="6" height="1.2" data-face="top"/>
      <rect x="41.3" y="26" width="6" height="1.2" data-face="top"/>
      <rect x="41.3" y="29" width="6" height="1.2" data-face="top"/>
      <rect x="41.3" y="32" width="6" height="1.2" data-face="top"/>
      <rect x="49.9" y="14" width="6" height="1.2" data-face="top"/>
      <rect x="49.9" y="17" width="6" height="1.2" data-face="top"/>
      <rect x="49.9" y="20" width="6" height="1.2" data-face="top"/>
      <rect x="49.9" y="23" width="6" height="1.2" data-face="top"/>
      <rect x="49.9" y="26" width="6" height="1.2" data-face="top"/>
      <rect x="49.9" y="29" width="6" height="1.2" data-face="top"/>
      <rect x="49.9" y="32" width="6" height="1.2" data-face="top"/>
      <rect x="58.5" y="14" width="6" height="1.2" data-face="top"/>
      <rect x="58.5" y="17" width="6" height="1.2" data-face="top"/>
      <rect x="58.5" y="20" width="6" height="1.2" data-face="top"/>
      <rect x="58.5" y="23" width="6" height="1.2" data-face="top"/>
      <rect x="58.5" y="26" width="6" height="1.2" data-face="top"/>
      <rect x="58.5" y="29" width="6" height="1.2" data-face="top"/>
      <rect x="58.5" y="32" width="6" height="1.2" data-face="top"/>
      <rect x="67" y="14" width="6" height="1.2" data-face="top"/>
      <rect x="67" y="17" width="6" height="1.2" data-face="top"/>
      <rect x="67" y="20" width="6" height="1.2" data-face="top"/>
      <rect x="67" y="23" width="6" height="1.2" data-face="top"/>
      <rect x="67" y="26" width="6" height="1.2" data-face="top"/>
      <rect x="67" y="29" width="6" height="1.2" data-face="top"/>
      <rect x="67" y="32" width="6" height="1.2" data-face="top"/>
    </g>
  </svg>`,
  },

  thermal_src_reactor: {
    icon25d: `<svg viewBox="0 0 56 101" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <g transform="translate(0.4,0.4)">
        <ellipse cx="36.6" cy="100.2" rx="10" ry="0.4" data-shadow="1"/>

        <!-- 支腿与地脚：先画，罐体锥底压住腿顶 -->
        <rect x="34" y="93.6" width="1.2" height="6" data-face="front"/>
        <rect x="38" y="93.6" width="1.2" height="6" data-face="front"/>
        <path d="M34,99.6 H35.2 M38,99.6 H39.2" data-edge="lo" stroke-width="1.2"/>
        <rect x="32.6" y="98.6" width="8" height="2" rx="1" data-face="front"/>
        <rect x="32.6" y="98.6" width="8" height="0.6" rx="0.3" data-face="top"/>
        <path d="M32.6,100.6 H40.6" data-edge="lo" stroke-width="1.2"/>

        <!-- 侧管：一段横管接罐体上肩，再沿左侧落地 -->
        <rect x="0" y="14" width="6.2" height="64.2" data-face="body"/>
        <rect x="0" y="14" width="22.14" height="6.2" data-face="body"/>
        <path d="M0,14 H22.14" data-edge="hi"/>
        <path d="M0,14 V78.2" data-edge="hi"/>
        <path d="M6.2,16.6 V78.2" data-edge="lo" stroke-width="1.2"/>
        <path d="M0,78.2 H6.2" data-edge="lo" stroke-width="1.2"/>
        <rect x="0" y="77" width="5" height="1.2" data-face="front"/>

        <!-- 罐体：上肩锥 → 筒身 → 下肩锥，锥体左右分面 -->
        <path d="M28.32,14 H37.1 V22.47 H18.93 Z" data-face="front"/>
        <path d="M37.1,14 H45.88 L54.7,22.47 H37.1 Z" data-face="side"/>
        <path d="M28.32,14 H45.88" data-edge="hi"/>
        <path d="M18.93,22.47 H54.7" data-edge="lo" stroke-width="1.2"/>
        <path d="M37.1,14 V22.47" data-edge="lo" stroke-width="1.2"/>
        <rect x="18.93" y="22.47" width="35.77" height="50.31" data-face="body"/>
        <path d="M18.93,22.47 V72.78" data-edge="hi"/>
        <path d="M54.7,22.47 V72.78" data-edge="lo" stroke-width="1.2"/>
        <path d="M18.93,72.78 H54.7" data-edge="lo" stroke-width="1.2"/>
        <path d="M18.93,72.78 H37.1 V94.62 H33.28 Z" data-face="front"/>
        <path d="M37.1,72.78 H54.7 L39.96,94.62 H37.1 Z" data-face="side"/>
        <path d="M37.1,72.78 V94.62" data-edge="lo" stroke-width="1.2"/>
        <path d="M33.28,94.62 H39.96" data-edge="lo" stroke-width="1.2"/>

        <!-- 顶部接管：锥颈 + 法兰 -->
        <path d="M29.57,0 H44.63 L47.09,10.2 H27.1 Z" data-face="body"/>
        <path d="M29.57,0 H44.63" data-edge="hi"/>
        <rect x="25.6" y="8.6" width="23" height="3" rx="1.5" data-face="front"/>
        <rect x="25.6" y="8.6" width="23" height="0.9" rx="0.45" data-face="top"/>
        <path d="M26.4,8.6 H47.8" data-edge="hi"/>
        <path d="M25.6,11.6 H48.6" data-edge="lo" stroke-width="1.2"/>

        <!-- 接口卡箍：横管与上肩的交接 -->
        <path d="M22.14,13.3 H27.4 V16.5 H22.14 Z" data-face="front"/>
        <path d="M22.14,16.5 H27.4" data-edge="lo" stroke-width="1.2"/>

        <!-- 环向箍带 -->
        <rect x="18.93" y="22.31" width="35.77" height="1.2" data-face="front"/>
        <rect x="18.93" y="32.31" width="35.77" height="1.2" data-face="front"/>
        <rect x="18.93" y="39.31" width="35.77" height="1.2" data-face="front"/>
        <rect x="18.93" y="42.31" width="35.77" height="1.2" data-face="front"/>
        <rect x="18.93" y="49.31" width="35.77" height="1.2" data-face="front"/>
        <rect x="18.93" y="71.31" width="35.77" height="1.2" data-face="front"/>
        <path d="M18.93,23.51 H54.7 M18.93,33.51 H54.7 M18.93,40.51 H54.7 M18.93,43.51 H54.7 M18.93,50.51 H54.7 M18.93,72.51 H54.7" data-edge="lo" stroke-width="1.2"/>

        <!-- 中部交叉纹与卡子 -->
        <path d="M22.936,32.482 L30.022,39.482 M29.13,32.445 L22.13,40.374 M33.936,32.482 L41.022,39.482 M38.13,32.445 L31.13,39.374 M43.936,32.482 L51.022,39.482 M50.13,32.445 L43.13,39.374" data-edge="lo" stroke-width="1.2"/>
        <path d="M24,43.5 V49.9 M30,43.5 V49.9 M36,43.5 V49.9 M42,43.5 V49.9 M48,43.5 V49.9" data-edge="lo" stroke-width="1.2"/>

        <!-- 下部箍带与铭牌 -->
        <rect x="22.62" y="76.31" width="28.68" height="1.2" data-face="front"/>
        <path d="M22.62,77.51 H51.3" data-edge="lo" stroke-width="1.2"/>
        <rect x="25.6" y="81" width="22.32" height="1.2" data-face="front"/>
        <path d="M25.6,82.2 H47.92" data-edge="lo" stroke-width="1.2"/>
        <rect x="28.6" y="85.5" width="16.16" height="1.2" data-face="front"/>
        <path d="M28.6,86.7 H44.76" data-edge="lo" stroke-width="1.2"/>
      </g>
    </g>
  </svg>`,
  },

  thermal_bucket_elevator: {
    icon25d: `<svg viewBox="0 0 52 132" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="23.727" cy="131.2" rx="16.4" ry="0.29" data-shadow="1"/>

      <!-- 底部两侧溜槽：先画，机壳壁压住槽口；左槽朝左受光、右槽背光 -->
      <path d="M11.9865968,112.289781 H0.267320026 C0.212091551,112.289781 0.167320026,112.334553 0.167320026,112.389781 C0.167320026,112.418719 0.179855146,112.446237 0.201687804,112.465229 L11.9865968,122.716913 Z" data-face="front"/>
      <path d="M11.9865968,112.289781 H0.267320026" data-edge="hi"/>
      <path d="M0.201687804,112.465229 L11.9865968,122.716913" data-edge="lo" stroke-width="1.2"/>
      <g transform="translate(41.223887, 120.503347) scale(-1, 1) translate(-41.223887, -120.503347)">
        <path d="M47.2171857,115.289781 H35.497909 C35.4426805,115.289781 35.397909,115.334553 35.397909,115.389781 C35.397909,115.418719 35.4104441,115.446237 35.4322767,115.465229 L47.2171857,125.716913 Z" data-face="front"/>
        <path d="M47.2171857,115.289781 H35.497909" data-edge="hi"/>
        <path d="M35.4322767,115.465229 L47.2171857,125.716913" data-edge="lo" stroke-width="1.2"/>
      </g>

      <!-- 机壳：外轮廓减内轮廓得到一圈 1.2 厚的壁板，内腔铺两层暗面做进深 -->
      <path d="M4.31184087,0 L4.31184087,27.1728737 L11.43,27.172 L11.4303431,131.490344 L36.0244549,131.490344 L36.024,22 L39.2089402,23.7591125 L50.6,23.7591125 L50.6,14.6 C50.6,6.53664265 44.0633573,0 36,0 L4.31184087,0 Z M5.511,25.972 L5.511,1.199 L36,1.199 L36.3118553,1.20355751 C43.5684223,1.36927471 49.4,7.30361838 49.4,14.6 L49.399,22.559 L39.519,22.559 L35.862947,20.5396986 C35.5245523,20.3527546 35.0986811,20.4755296 34.9117371,20.8139243 L34.8636631,20.9214306 C34.8378017,20.9954143 34.8244549,21.0734855 34.8244549,21.1524164 L34.824,130.29 L12.63,130.29 L12.6303431,25.9728737 L5.511,25.972 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M5.511,25.972 L5.511,1.199 L36,1.199 L36.3118553,1.20355751 C43.5684223,1.36927471 49.4,7.30361838 49.4,14.6 L49.399,22.559 L39.519,22.559 L35.862947,20.5396986 C35.5245523,20.3527546 35.0986811,20.4755296 34.9117371,20.8139243 L34.8636631,20.9214306 C34.8378017,20.9954143 34.8244549,21.0734855 34.8244549,21.1524164 L34.824,130.29 L12.63,130.29 L12.6303431,25.9728737 L5.511,25.972 Z" data-face="hole" fill-opacity="0.5"/>

      <!-- 顶部一条受光的板材厚度；外轮廓左/上受光、右/下走暗棱线 -->
      <rect x="5.511" y="0" width="30.489" height="1.199" data-face="top"/>
      <path d="M4.31184087,0 H36 C44.0633573,0 50.6,6.53664265 50.6,14.6" data-edge="hi"/>
      <path d="M4.31184087,0 V27.1728737" data-edge="hi"/>
      <path d="M11.4303431,27.1728737 V131.490344" data-edge="hi"/>
      <path d="M50.6,14.6 V23.7591125 H39.2089402 L36.024,22 V131.490344 H11.4303431" data-edge="lo" stroke-width="1.2"/>
      <path d="M11.4303431,27.1728737 H4.31184087" data-edge="lo" stroke-width="1.2"/>
      <path d="M5.511,25.972 L5.511,1.199 L36,1.199 L36.3118553,1.20355751 C43.5684223,1.36927471 49.4,7.30361838 49.4,14.6 L49.399,22.559 L39.519,22.559 L35.862947,20.5396986 C35.5245523,20.3527546 35.0986811,20.4755296 34.9117371,20.8139243 L34.8636631,20.9214306 C34.8378017,20.9954143 34.8244549,21.0734855 34.8244549,21.1524164 L34.824,130.29 L12.63,130.29 L12.6303431,25.9728737 L5.511,25.972 Z" data-edge="lo" stroke-width="1.2"/>

      <!-- 头部：上滚筒 → 轴承板 → 吊架（吊架下端压在皮带肩部之下） -->
      <path d="M26.0147548,13.1 A2.5,2.5 0 1 1 21.0147548,13.1 A2.5,2.5 0 1 1 26.0147548,13.1 Z M24.8147548,13.1 A1.3,1.3 0 1 1 22.2147548,13.1 A1.3,1.3 0 1 1 24.8147548,13.1 Z" fill-rule="evenodd" data-face="cap"/>
      <rect x="19.7706383" y="15" width="7.6411656" height="1.2" rx="0.6" data-face="front"/>
      <path d="M20.3706383,15 H26.8118039" data-edge="hi"/>
      <path d="M19.7706383,16.2 H27.4118039" data-edge="lo" stroke-width="1.2"/>
      <rect x="21.702988" y="15.6" width="1.2" height="5.9457474" data-face="body"/>
      <rect x="24.2794542" y="15.6" width="1.2" height="5.9457474" data-face="body"/>
      <path d="M21.702988,21.5457474 H22.902988 M24.2794542,21.5457474 H25.4794542" data-edge="lo" stroke-width="1.2"/>

      <!-- 机壳分段箍带：横贯内腔，皮带从前面压过 -->
      <rect x="12.4348915" y="25.9728737" width="22.6168788" height="1.2" data-face="front"/>
      <rect x="12.4348915" y="37.9728737" width="22.6168788" height="1.2" data-face="front"/>
      <rect x="12.4348915" y="55.5728737" width="6.2178045" height="2" data-face="front"/>
      <rect x="29.181922" y="55.5728737" width="6.2178045" height="2" data-face="front"/>
      <rect x="12.4348915" y="63.5" width="22.6168788" height="1.2" data-face="front"/>
      <rect x="12.4348915" y="88.5" width="22.6168788" height="1.2" data-face="front"/>
      <path d="M12.4348915,27.1728737 H35.0517703 M12.4348915,39.1728737 H35.0517703 M12.4348915,57.5728737 H18.652696 M29.181922,57.5728737 H35.3997265 M12.4348915,64.7 H35.0517703 M12.4348915,89.7 H35.0517703" data-edge="lo" stroke-width="1.2"/>

      <!-- 畚斗皮带：闭合环带（evenodd 挖空带身内侧） -->
      <path d="M24.232788,20.386045 L29.3882701,24.6 L29.3882701,110.6 L17.7941721,110.6 L17.7941721,24.6 L22.9683414,20.3850012 C23.3365869,20.0850198 23.8650382,20.085456 24.232788,20.386045 Z M23.599,21.418 L18.994,25.17 L18.994,109.4 L28.188,109.4 L28.188,25.169 L23.599,21.418 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M22.9683414,20.3850012 L17.7941721,24.6 V110.6" data-edge="hi"/>
      <path d="M29.3882701,24.6 V110.6 H17.7941721" data-edge="lo" stroke-width="1.2"/>

      <!-- 流向箭头沿用原稿实心 V（功能性标记，不参与面基光照） -->
      <path d="M22.4923208,34.1108541 C23.0697675,33.5633085 23.9538565,33.5278478 24.5710379,34.0053098 L24.6907455,34.1076415 L29.1599817,38.3207151 L28.3368467,39.1938982 L23.8676105,34.9808246 C23.7352574,34.8560576 23.5391354,34.8384927 23.388831,34.9279698 L23.3180043,34.9816278 L18.8769742,39.1926935 L18.0512907,38.3219198 L22.4923208,34.1108541 Z" fill="currentColor"/>

      <!-- 下部：尾部滚筒 → 畚斗 → 靴部导轨（导轨压在滚筒前面） -->
      <path d="M26.0147548,118.1 A2.5,2.5 0 1 1 21.0147548,118.1 A2.5,2.5 0 1 1 26.0147548,118.1 Z M24.8147548,118.1 A1.3,1.3 0 1 1 22.2147548,118.1 A1.3,1.3 0 1 1 24.8147548,118.1 Z" fill-rule="evenodd" data-face="cap"/>
      <path d="M25.8118039,99.6 C26.3640886,99.6 26.8118039,100.047715 26.8118039,100.6 L26.8118039,103.6 C26.8118039,104.152285 26.3640886,104.6 25.8118039,104.6 L21.3706383,104.6 C20.8183535,104.6 20.3706383,104.152285 20.3706383,103.6 L20.3706383,100.6 C20.3706383,100.047715 20.8183535,99.6 21.3706383,99.6 Z M25.611,100.8 L21.57,100.8 L21.57,103.4 L25.611,103.4 Z" fill-rule="evenodd" data-face="front"/>
      <rect x="21.57" y="100.8" width="4.041" height="2.6" data-face="hole" fill-opacity="0.5"/>
      <path d="M21.3706383,99.6 H25.8118039" data-edge="hi"/>
      <path d="M20.3706383,104.6 H26.8118039" data-edge="lo" stroke-width="1.2"/>
      <rect x="21.033917" y="104.201067" width="1.2" height="26.363567" data-face="front"/>
      <rect x="24.8986164" y="104.201067" width="1.2" height="26.363567" data-face="front"/>
      <path d="M21.033917,130.564634 H22.233917 M24.8986164,130.564634 H26.0986164" data-edge="lo" stroke-width="1.2"/>
    </g>
  </svg>`,
  },

  thermal_boiler: {
    icon25d: `<svg viewBox="0 0 52 110" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0, 1)" fill="none" stroke="none" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="26" cy="107.8" rx="18.5" ry="0.2" data-shadow="1"/>

      <!-- 罐体：整台筒身按 body 横向渐变（左偏亮带），颈圈顶面一条 top -->
      <path d="M34,-0.6 L18,-0.6 C17.1163444,-0.6 16.4,0.1163444 16.4,1 L16.4,4 L16.4065387,4.14563261 C16.4801102,4.96103848 17.1654364,5.6 18,5.6 L20.4,5.6 L20.4,7.975 L20.1133407,8.03666512 C10.5004609,10.1615748 3.57614803,17.3052984 3.40332555,25.6775768 L3.4,25.9938119 L3.4,92 C3.4,98.9587878 9.04121215,104.6 16,104.6 L36,104.6 C42.9587878,104.6 48.6,98.9587878 48.6,92 L48.6,26 L48.5967703,25.6837714 L48.5862631,25.3493186 C48.2387477,17.1161612 41.3718769,10.1337392 31.8876428,8.03688284 L31.6,7.975 L31.599,5.6 L34,5.6 C34.8836556,5.6 35.6,4.8836556 35.6,4 L35.6,1 C35.6,0.1163444 34.8836556,-0.6 34,-0.6 Z" data-face="body"/>
      <rect x="16.4" y="-0.6" width="19.2" height="1.2" rx="1" data-face="top"/>
      <path d="M3.4,25.9938119 H48.6 M3.4,92 H48.6" data-edge="lo" stroke-width="1"/>
      <path d="M3.4,25.9938119 V92 C3.4,98.9587878 9.04121215,104.6 16,104.6" data-edge="hi" stroke-width="1"/>
      <path d="M48.6,26 V92 C48.6,98.9587878 42.9587878,104.6 36,104.6" data-edge="lo" stroke-width="1"/>

      <!-- 炉膛火焰与火点：原稿实色（功能标识，不参与面基光照） -->
      <g transform="translate(20, 24)" stroke="none">
        <path d="M6,16 C9.3137085,16 12,13.2032029 12,9.75317876 C12,6.30315465 9.37931034,1.80063946 4.75556472,0 C4.55562565,1.2004263 4.3318413,2.03799238 4.08421168,2.51269823 C3.1669312,4.27112439 1.9694328,5.28416423 1.69286268,5.59056394 C0.68397541,6.70826514 0,8.09833218 0,9.75317876 C0,13.2032029 2.6862915,16 6,16 Z" fill="#F8575D"/>
        <path d="M6.06060919,15.2221391 C8.1127787,15.2221391 9.77639079,13.4900912 9.77639079,11.3535019 C9.77639079,9.21691253 8.15340572,6.42851868 5.28993424,5.31338818 C5.16611258,6.05680851 5.02752362,6.57551062 4.87416735,6.86949449 C4.30609836,7.95848242 3.56449128,8.58585489 3.39321225,8.77560729 C2.76841146,9.46779621 2.34482759,10.3286605 2.34482759,11.3535019 C2.34482759,13.4900912 4.00843968,15.2221391 6.06060919,15.2221391 Z" fill="#C13B44"/>
        <path d="M6.04637248,14.6477188 C7.17655279,14.6477188 8.09274495,13.6938373 8.09274495,12.5171649 C8.09274495,11.3404925 7.19892709,9.80485534 5.62194279,9.1907255 C5.55375116,9.6001454 5.4774268,9.88580742 5.39296973,10.0477116 C5.08012014,10.6474441 4.67169885,10.9929535 4.57737126,11.0974549 C4.23327808,11.4786604 4,11.9527595 4,12.5171649 C4,13.6938373 4.91619216,14.6477188 6.04637248,14.6477188 Z" fill="#982F39"/>
      </g>
      <g transform="translate(14.294118, 14)" fill="#DE636B" stroke="none">
        <circle cx="15.2941176" cy="1.29411765" r="1.29411765"/>
        <circle cx="5.82352941" cy="6.47058824" r="1.29411765"/>
        <circle cx="25.1176471" cy="9.70588235" r="1.29411765"/>
        <circle cx="10.7647059" cy="1.94117647" r="1"/>
        <circle cx="14.7647059" cy="6.94117647" r="1"/>
        <circle cx="0.970588235" cy="7.44117647" r="1"/>
        <circle cx="21.9117647" cy="7.08823529" r="1"/>
      </g>

      <!-- 中部炉排：环形围板 front + 内腔压暗 + 五根立管（body 圆柱） -->
      <path d="M32,46 C32.5522847,46 33,46.4477153 33,47 L33,48 L51,48 C51.5522847,48 52,48.4477153 52,49 L52,63 C52,63.5522847 51.5522847,64 51,64 L33,64 L33,66 C33,66.5522847 32.5522847,67 32,67 L26,67 C25.4477153,67 25,66.5522847 25,66 L25,64 L1,64 C0.44771525,64 0,63.5522847 0,63 L0,49 C0,48.4477153 0.44771525,48 1,48 L25,48 L25,47 C25,46.4477153 25.4477153,46 26,46 L32,46 Z M31.8,47.2 L26.2,47.2 L26.2,49.2 L1.2,49.2 L1.2,62.8 L26.2,62.8 L26.2,65.8 L31.8,65.8 L31.8,62.8 L50.8,62.8 L50.8,49.2 L31.8,49.2 L31.8,47.2 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M1.2,49.2 H26.2 V47.2 H31.8 V49.2 H50.8 V62.8 H31.8 V65.8 H26.2 V62.8 H1.2 Z" data-edge="lo" stroke-width="1"/>
      <rect x="1" y="48" width="24" height="1.2" data-face="top"/>
      <rect x="33" y="48" width="18" height="1.2" data-face="top"/>
      <rect x="25" y="46" width="8" height="1.2" data-face="top"/>
      <path d="M1,48 H25 V47 C25.4477153,46 26,46 32,46 C32.5522847,46 33,46.4477153 33,47 V48 H51" data-edge="hi" stroke-width="1"/>
      <path d="M1,64 H25 V66 C25,66.5522847 25.4477153,67 26,67 L32,67 C32.5522847,67 33,66.5522847 33,66 V64 H51" data-edge="lo" stroke-width="1"/>
      <rect x="8" y="46" width="2" height="21" rx="1" data-face="body"/>
      <rect x="14" y="46" width="2" height="21" rx="1" data-face="body"/>
      <rect x="20" y="46" width="2" height="21" rx="1" data-face="body"/>
      <rect x="36" y="46" width="2" height="21" rx="1" data-face="body"/>
      <rect x="42" y="46" width="2" height="21" rx="1" data-face="body"/>
      <path d="M8,46 H10 M14,46 H16 M20,46 H22 M36,46 H38 M42,46 H44" data-edge="hi" stroke-width="1"/>

      <!-- 炉膛内的两道旋流箭头：刻在筒身上的暗纹 -->
      <path d="M15.4537772,26.6770941 L15.8353064,26.2260396 L17.0639233,27.676878 C17.2423786,27.8876108 17.2162125,28.2031101 17.0054797,28.3815655 C16.8181617,28.5401924 16.5480652,28.5371432 16.3650214,28.3865029 L16.3007923,28.323122 L15.842,27.782 L15.8045603,27.8291797 C12.5664558,31.9569303 12.4989622,36.0055877 15.6013019,40.1051353 L15.806,40.37 L16.2745226,39.7107416 C16.4165253,39.5105272 16.6789004,39.4463346 16.893647,39.546741 L16.9716162,39.5921648 C17.1718306,39.7341675 17.2360232,39.9965427 17.1356168,40.2112892 L17.090193,40.2892584 L15.8715087,42.0075225 L15.4548208,41.518113 C11.3553438,36.7031839 11.2821388,31.7892168 15.2342173,26.941451 L15.4537772,26.6770941 Z" fill-rule="nonzero" data-edge="lo" stroke-width="1"/>
      <path d="M37.9495966,26.6770941 L38.3311258,26.2260396 L39.5597427,27.676878 C39.738198,27.8876108 39.7120319,28.2031101 39.5012991,28.3815655 C39.3139811,28.5401924 39.0438846,28.5371432 38.8608408,28.3865029 L38.7966117,28.323122 L38.338,27.782 L38.3003797,27.8291797 C35.0622751,31.9569303 34.9947816,36.0055877 38.0971213,40.1051353 L38.302,40.37 L38.770342,39.7107416 C38.9123447,39.5105272 39.1747198,39.4463346 39.3894664,39.546741 L39.4674356,39.5921648 C39.66765,39.7341675 39.7318426,39.9965427 39.6314362,40.2112892 L39.5860124,40.2892584 L38.3673281,42.0075225 L37.9506402,41.518113 C33.8511631,36.7031839 33.7779582,31.7892168 37.7300367,26.941451 L37.9495966,26.6770941 Z" fill-rule="nonzero" data-edge="lo" stroke-width="1" transform="translate(37.249109, 34.116781) scale(-1, 1) translate(-37.249109, -34.116781)"/>

      <!-- 底部裙座：先画阴影，裙板 front，底口一条暗线 -->
      <path d="M8,108 C10.9390497,108 12.1510085,106.666667 11.6358766,104 H40.3641234 C39.8489915,106.666667 41.0609503,108 44,108 Z" data-face="front"/>
      <path d="M8,108 C10.9390497,108 12.1510085,106.666667 11.6358766,104 M40.3641234,104 C39.8489915,106.666667 41.0609503,108 44,108" data-edge="lo" stroke-width="1"/>
    </g>
  </svg>`,
  },

  thermal_discharge_motor: {
    icon25d: `<svg viewBox="0 0 81 45" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0.4, 0)" fill="none" stroke="none" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="18.6" cy="43.98" rx="17" ry="0.16" data-shadow="1"/>

      <!-- 出风罩：罩内先铺暗面，格栅压在上面，最后勾一圈受光外框 -->
      <g transform="translate(52.6, 11)">
        <path d="M21,-0.4 C22.4911688,-0.4 23.8411688,0.204415588 24.8183766,1.18162338 C25.7955844,2.15883118 26.4,3.50883118 26.4,5 L26.4,26.4 L1.6,26.4 L1.6,5 C1.6,3.50883118 2.20441559,2.15883118 3.18162338,1.18162338 C4.15883118,0.204415588 5.50883118,-0.4 7,-0.4 Z" transform="translate(14, 13) rotate(-270) translate(-14, -13)" data-face="side"/>
      </g>
      <path d="M73.4666667,11.4214286 L73.4666667,36.2711029 L72.2666667,36.2711029 L72.2662857,32.1994286 L52.9492857,32.2 L52.9492857,31 L72.2662857,30.9994286 L72.2662857,27.1994286 L52.9492857,27.2 L52.9492857,26 L72.2662857,25.9994286 L72.2662857,22.1994286 L52.9492857,22.2 L52.9492857,21 L72.2662857,20.9994286 L72.2662857,17.1994286 L52.9492857,17.2 L52.9492857,16 L72.2662857,15.9994286 L72.2666667,11.4214286 L73.4666667,11.4214286 Z M53.3225037,29.4 L53.3225037,30.6 L49.4392448,30.6 L49.4392448,29.4 L53.3225037,29.4 Z M53.3225037,17.4 L53.3225037,18.6 L49.4392448,18.6 L49.4392448,17.4 L53.3225037,17.4 Z" fill-rule="nonzero" data-face="front"/>
      <path d="M52.9492857,17.2 H72.2662857 M52.9492857,22.2 H72.2662857 M52.9492857,27.2 H72.2662857 M52.9492857,32.2 H72.2662857" data-edge="lo" stroke-width="1.2"/>
      <g transform="translate(52.6, 11)">
        <path d="M21,-0.4 C22.4911688,-0.4 23.8411688,0.204415588 24.8183766,1.18162338 C25.7955844,2.15883118 26.4,3.50883118 26.4,5 L26.4,26.4 L1.6,26.4 L1.6,5 C1.6,3.50883118 2.20441559,2.15883118 3.18162338,1.18162338 C4.15883118,0.204415588 5.50883118,-0.4 7,-0.4 Z" transform="translate(14, 13) rotate(-270) translate(-14, -13)" data-edge="hi"/>
      </g>

      <!-- 电机机体：实心 front + 罩壳内板缝；顶部颈板一条 top -->
      <path d="M35.6,0 C36.1522847,0 36.6,0.44771525 36.6,1 L36.6,4 C36.6,4.55228475 36.1522847,5 35.6,5 L33.08,5 L30.8046754,8.00514593 C32.9187017,8.11169562 34.6,9.85950368 34.6,12 L34.599,13.85 L42.1223726,15.4175979 L42.122,18.283 L46.4823303,17.4116516 L46.7176697,18.5883484 L42.122,19.507 L42.122,28.492 L46.7176697,29.4116516 L46.4823303,30.5883484 L42.122,29.716 L42.1223726,33.0600296 L34.599,34.627 L34.599,38.799 L35.6,38.8 C36.4345636,38.8 37.1198898,39.4389615 37.1934613,40.2543674 L37.2,40.4 L37.2,42.5486145 C37.2,43.3831781 36.5610385,44.0685043 35.7456326,44.1420758 L35.6,44.1486145 L1.6,44.1486145 C0.765436378,44.1486145 0.0801102148,43.509653 0.00653867702,42.6942471 L-4.54747351e-13,42.5486145 L-4.54747351e-13,40.3978462 C0.00431810523,39.5142016 0.724138392,38.801351 1.60763088,38.8056475 L2.599,38.808 L2.6,12 C2.6,9.790861 4.390861,8 6.6,8 L6.65,8 L4.376,5 L1.6,5 C1.04771525,5 0.6,4.55228475 0.6,4 L0.6,1 C0.6,0.44771525 1.04771525,0 1.6,0 Z" data-face="front"/>
      <rect x="0.6" y="0" width="36" height="1.2" rx="1" data-face="top"/>
      <path d="M3.8,12 C3.8932611,10.3624629 5.11087667,9.2 6.6,9.2 H30.6 C32.2375371,9.2932611 33.4,10.5108767 33.4,12 V38.799 H3.8 Z" data-edge="lo" stroke-width="1.2"/>
      <path d="M34.599,15.076 H40.921 V17.999 H34.599 Z M34.599,20 H40.921 V23 H34.599 Z M34.599,25 H40.921 V28 H34.599 Z M34.599,30 H40.921 V33.06 H34.599 Z" data-edge="lo" stroke-width="1.2"/>
      <path d="M1.2,40.4 H36 V42.55 H1.2 Z" data-edge="lo" stroke-width="1.2"/>
      <path d="M8.155,8 H29.301" data-edge="lo" stroke-width="1.2"/>
      <path d="M2.599,38.808 H34.599" data-edge="lo" stroke-width="1.2"/>
      <path d="M2.599,38.808 V12 C2.6,9.790861 4.390861,8 6.65,8" data-edge="hi" stroke-width="1.2"/>
      <path d="M34.599,13.85 V38.799" data-edge="lo" stroke-width="1.2"/>

      <!-- 联轴器法兰盘：立着的窄板，左侧受光 -->
      <rect x="40.7" y="22.6" width="14.8" height="2.8" transform="translate(48.1, 24) rotate(-270) translate(-48.1, -24)" data-face="front"/>
      <path d="M46.7,16.6 V31.4" data-edge="hi" stroke-width="1.2"/>
      <path d="M49.5,16.6 V31.4" data-edge="lo" stroke-width="1.2"/>
    </g>
  </svg>`,
  },

  thermal_supply_feeder: {
    icon25d: `<svg viewBox="0 0 62 86" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0.4, 0.4)" fill="none" stroke="none" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="30.8" cy="84.55" rx="26" ry="0.19" data-shadow="1"/>

      <!-- 轮体：原稿是空心轮辐稿（外圈 + 内圈 + 八根辐条 + 轴帽）。2.5D 下轮面必须先落成实体，
           照搬线稿会成一只空心的圈；外圈只有 1.2 宽，放不下面 + 两道棱线，仍按带宽走亮棱线；
           原稿那道内圈改成压在轮面上的暗槽（辋与轮盘的接缝），辐条当加强筋 -->
      <circle cx="30.6" cy="42.6" r="29.4" data-face="front"/>
      <circle cx="30.6" cy="42.6" r="29.4" data-edge="hi" stroke-width="1.2"/>
      <ellipse cx="30.669" cy="42.669" rx="23.844" ry="23.736" data-edge="lo" stroke-width="1.2"/>
      <g transform="translate(6.225, 18.333333)">
        <!-- 原稿右侧那根横辐条只画到半途（素材瑕疵），悬在轮面上就是一截断筋；
             内端补齐到与其余七根同距的轮毂边 -->
        <path d="M25.00625,1.5333 V19 M25.00625,29.5333 V47.9333 M41.9224852,8.5718182 L28.8868189,21.1441564 M28.0892658,28.012796 L41.9224852,40.6560523 M6.8275148,8.5718182 L20.8900148,20.7051515 M20.8900148,28.012796 L7.5559334,40.6560523 M0.356,25.004 H19.106 M29.778,24.978 H48.374" data-edge="hi" stroke-width="1.2"/>
        <!-- 轮毂是凸起的轴帽：cap 亮面 + 同参压暗圈，浅色底上才不糊进轮盘里 -->
        <ellipse cx="24.4444444" cy="24.3358025" rx="5.0625" ry="5.0375" data-face="cap"/>
        <ellipse cx="24.4444444" cy="24.3358025" rx="5.0625" ry="5.0375" data-edge="lo" stroke-width="1.2"/>
      </g>

      <!-- 支腿先画、端头压进法兰：原稿支腿就是 1.2 宽的实心细条，按中轴走一根亮棱线即同宽；
           去掉圆头端帽，免得比原稿长出半个线宽 -->
      <path d="M11.85,7.1332 L14.6625,18.3334 M49.3495,7.1332 L46.5375,18.3334 M11.85,77.613 L14.6625,66.4129 M49.3495,77.613 L46.5375,66.4129" data-edge="hi" stroke-width="1.2" stroke-linecap="butt"/>

      <!-- 上法兰：原稿是 1.2 宽的空心框，补成实体正面 + 顶面窄条（两角随外框圆角收进），
           下缘压一条暗缝交代板厚 -->
      <rect x="0" y="0" width="61.2" height="7.7333" rx="1.5375" data-face="front"/>
      <path d="M1.5375,0 H59.6625 A1.5375,1.5375 0 0 1 61.1625,1.2 H0.0375 A1.5375,1.5375 0 0 1 1.5375,0 Z" data-face="top"/>
      <path d="M1.5375,7.7333 H59.6625" data-edge="lo" stroke-width="1.2"/>

      <!-- 下法兰：上板镜像；顶面条仍在上缘——翻转只改位置，不改受光方向 -->
      <rect x="0" y="77.0129" width="61.2" height="7.7333" rx="1.5375" data-face="front"/>
      <path d="M1.5375,77.0129 H59.6625 A1.5375,1.5375 0 0 1 61.1625,78.2129 H0.0375 A1.5375,1.5375 0 0 1 1.5375,77.0129 Z" data-face="top"/>
      <path d="M1.5375,84.7462 H59.6625" data-edge="lo" stroke-width="1.2"/>
    </g>
  </svg>`,
  },

  thermal_scraper: {
    icon25d: `<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="none" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="33" cy="58.35" rx="31" ry="0.19" data-shadow="1"/>

      <!-- 槽体：整条斜槽侧面一块板，上缘受光、下缘压暗，两端端面分开明暗 -->
      <path d="M108.373664,0.60155206 L118.896567,12.948572 C118.967607,13.0331539 118.997637,13.138523 118.988763,13.2405065 C118.979888,13.3424901 118.932108,13.441088 118.848135,13.5116171 L65.1058306,58.5280665 L1,58.5476169 C0.88954305,58.5476169 0.78954305,58.5028454 0.717157288,58.4304596 C0.644771525,58.3580739 0.6,58.2580739 0.6,58.1476169 L0.6,42.1476169 C0.6,42.03716 0.644771525,41.93716 0.717157288,41.8647742 C0.78954305,41.7923884 0.88954305,41.7476169 1.0000064,41.7476169 L59.0710947,41.7469977 L108.081869,0.693388495 C108.166466,0.622525242 108.271768,0.592617779 108.373664,0.60155206 Z" data-face="front"/>
      <path d="M0.6,42.1476169 L59.0710947,41.7469977 L108.081869,0.693388495" data-edge="hi" stroke-width="1.2"/>
      <path d="M0.6,58.1476169 L65.1058306,58.5280665 L118.848135,13.5116171" data-edge="lo" stroke-width="1.2"/>
      <path d="M0.6,42.1476169 V58.1476169" data-edge="hi" stroke-width="1.2"/>
      <path d="M108.373664,0.60155206 L118.896567,12.948572" data-edge="lo" stroke-width="1.2"/>

      <!-- 中部刮板：斗内受光（top），两侧外沿按受光方向分亮棱与暗棱 -->
      <path d="M43.8807576,34.5487741 C44.7644132,34.5487741 45.4807576,35.2651186 45.4807576,36.1487741 C45.4807576,36.3839608 45.4289199,36.6155103 45.3297967,36.8272194 L45.2466595,36.9820279 L42.1749084,42.0173616 L41.1504819,41.3924212 L44.222233,36.3570876 C44.2605085,36.294345 44.2807576,36.22227 44.2807576,36.1487741 C44.2807576,35.9554745 44.1436448,35.7941992 43.9613715,35.7569007 L43.8807576,35.7487741 L20.7397775,35.7487741 C20.6662817,35.7487741 20.5942066,35.7690232 20.5314641,35.8072987 C20.3664464,35.907966 20.3001736,36.1090071 20.3632572,36.2840362 L20.3983021,36.3570876 L23.4700532,41.3924212 L22.4456267,42.0173616 L19.3738756,36.9820279 C18.9136822,36.2276611 19.1521569,35.2430656 19.9065238,34.7828722 C20.1072999,34.6603909 20.3319674,34.5840569 20.5643227,34.5584226 L20.7397775,34.5487741 L43.8807576,34.5487741 Z" data-face="front"/>
      <path d="M20.7398,35.7488 L43.8808,35.7488 L41.1505,41.3924 L22.4456,41.3924 Z" data-face="top"/>
      <path d="M20.7398,34.5488 L43.8808,34.5488" data-edge="hi" stroke-width="1.2"/>
      <path d="M19.9065,34.7829 L22.4456,42.0174" data-edge="hi" stroke-width="1.2"/>
      <path d="M45.3298,36.8272 L41.1505,42.0174" data-edge="lo" stroke-width="1.2"/>

      <!-- 两端链轮：花形环面 + 轮心轴帽（环孔里露出轴帽，与线稿一致） -->
      <circle cx="105" cy="14.1487741" r="1.4" data-face="cap"/>
      <circle cx="11" cy="50.1487741" r="1.4" data-face="cap"/>
      <circle cx="105" cy="14.1487741" r="1.4" data-edge="lo" stroke-width="1.2"/>
      <circle cx="11" cy="50.1487741" r="1.4" data-edge="lo" stroke-width="1.2"/>
      <path d="M103.928337,8.64177012 L103.809709,8.67000056 C103.468882,8.77334321 103.204217,9.05210582 103.136913,9.40835218 L103.013,10.039 L102.773846,10.1516854 C102.683006,10.1979096 102.593797,10.2469187 102.506364,10.2986358 L102.272,10.447 L101.599113,10.220139 C101.265012,10.1089174 100.897656,10.1813593 100.636821,10.4063456 L100.527797,10.5159486 C100.133227,10.9567495 99.8145954,11.449328 99.5813899,11.9779799 L99.4598595,12.2777662 L99.4244499,12.3926882 C99.3415437,12.7405007 99.4667499,13.1099048 99.751714,13.3435896 L100.277,13.769 L100.266589,13.8999831 C100.261928,13.9826684 100.259598,14.0656423 100.259598,14.1486982 L100.266592,14.3981439 L100.277,14.528 L99.7551593,14.9507527 C99.4667035,15.1867329 99.341118,15.5573251 99.4261324,15.9089398 L99.4708974,16.0483816 C99.676208,16.5916736 99.967897,17.099048 100.335802,17.5552205 L100.546524,17.8018732 L100.639809,17.892485 C100.901894,18.1153792 101.265033,18.1871278 101.595925,18.0778207 L102.272,17.85 L102.506198,17.9987786 C102.593718,18.0505624 102.683028,18.0996161 102.773982,18.1458617 L103.013,18.258 L103.137898,18.8922667 C103.214088,19.2864827 103.532331,19.5861355 103.927693,19.6552176 L103.960374,19.6608766 C104.550102,19.761248 105.151018,19.7755867 105.742877,19.7040758 L106.071418,19.6553763 L106.188401,19.6274112 C106.531169,19.5236371 106.79587,19.2445799 106.86293,18.8880759 L106.984,18.263 L107.227268,18.1503227 C107.318854,18.1039659 107.408786,18.0547684 107.496913,18.0028093 L107.733,17.852 L108.40067,18.0767671 C108.733459,18.1878684 109.099335,18.1164344 109.360873,17.8925789 L109.474499,17.7783721 C109.86689,17.3399933 110.185211,16.8477608 110.418372,16.3191584 L110.539895,16.0193803 L110.575268,15.9045857 C110.658052,15.5571536 110.532601,15.188127 110.247516,14.955157 L109.731,14.538 L109.748045,14.2996556 C109.751448,14.199793 109.751448,14.0998535 109.748045,13.9999909 L109.731,13.761 L110.245282,13.3460561 C110.533362,13.1103798 110.65891,12.739818 110.573892,12.3882064 L110.529126,12.2487648 C110.324112,11.7054423 110.032368,11.1979053 109.664187,10.7417112 L109.4535,10.4952733 L109.361208,10.4047167 C109.101177,10.181915 108.735605,10.1098569 108.404163,10.2193046 L107.733,10.444 L107.496818,10.2944623 C107.408737,10.2425478 107.318865,10.1933753 107.227349,10.1470228 L106.985,10.033 L106.862186,9.40493783 C106.787944,9.01224511 106.469188,8.71204037 106.073103,8.6421119 L106.039381,8.63626987 C105.449457,8.53638224 104.848848,8.52211258 104.257255,8.59322399 L103.928337,8.64177012 Z M105.559116,9.7800079 L105.716,9.802 L105.934718,10.9188843 L106.256736,11.0336881 C106.624281,11.1647229 106.965071,11.3511176 107.265166,11.584891 L107.519587,11.7830847 L108.65,11.402 L108.753337,11.5241129 C108.975644,11.8043128 109.160667,12.1072739 109.304857,12.4267985 L109.347,12.529 L108.444506,13.2595964 L108.504148,13.6063703 C108.56608,13.9664577 108.56608,14.3331888 108.504148,14.6932763 L108.444493,15.0401279 L109.346,15.77 L109.304035,15.8719226 C109.160161,16.189933 108.975212,16.4926812 108.753311,16.7727479 L108.651,16.894 L107.518952,16.5139386 L107.264425,16.7126237 C106.964987,16.946366 106.624594,17.1325135 106.257352,17.262989 L105.934801,17.3775867 L105.717,18.495 L105.558071,18.5175662 C105.187549,18.5592664 104.812239,18.5592395 104.440966,18.5173995 L104.282,18.495 L104.063862,17.3741973 L103.742674,17.2592198 C103.37815,17.1287293 103.040321,16.9432418 102.743057,16.710732 L102.488482,16.5116123 L101.349,16.894 L101.246799,16.7729949 C101.024603,16.492738 100.83954,16.1897012 100.695197,15.8701132 L100.652,15.767 L101.56531,15.0311885 L101.50484,14.6834371 C101.474769,14.5105023 101.459598,14.3307279 101.459598,14.1486982 C101.459598,13.9675797 101.474784,13.7876775 101.504902,13.6138526 L101.565094,13.2664588 L100.652,12.529 L100.69572,12.4252239 C100.839594,12.1072135 101.024542,11.8044652 101.246444,11.5243985 L101.349,11.402 L102.488027,11.7854604 L102.742562,11.5868013 C103.040363,11.3543741 103.378431,11.1687121 103.74308,11.0376843 L104.063703,10.9224765 L104.282,9.801 L104.164827,9.81867782 C104.624195,9.74090258 105.094748,9.72794004 105.559116,9.7800079 Z" fill-rule="nonzero" data-face="cap"/>
      <path d="M103.928337,8.64177012 L103.809709,8.67000056 C103.468882,8.77334321 103.204217,9.05210582 103.136913,9.40835218 L103.013,10.039 L102.773846,10.1516854 C102.683006,10.1979096 102.593797,10.2469187 102.506364,10.2986358 L102.272,10.447 L101.599113,10.220139 C101.265012,10.1089174 100.897656,10.1813593 100.636821,10.4063456 L100.527797,10.5159486 C100.133227,10.9567495 99.8145954,11.449328 99.5813899,11.9779799 L99.4598595,12.2777662 L99.4244499,12.3926882 C99.3415437,12.7405007 99.4667499,13.1099048 99.751714,13.3435896 L100.277,13.769 L100.266589,13.8999831 C100.261928,13.9826684 100.259598,14.0656423 100.259598,14.1486982 L100.266592,14.3981439 L100.277,14.528 L99.7551593,14.9507527 C99.4667035,15.1867329 99.341118,15.5573251 99.4261324,15.9089398 L99.4708974,16.0483816 C99.676208,16.5916736 99.967897,17.099048 100.335802,17.5552205 L100.546524,17.8018732 L100.639809,17.892485 C100.901894,18.1153792 101.265033,18.1871278 101.595925,18.0778207 L102.272,17.85 L102.506198,17.9987786 C102.593718,18.0505624 102.683028,18.0996161 102.773982,18.1458617 L103.013,18.258 L103.137898,18.8922667 C103.214088,19.2864827 103.532331,19.5861355 103.927693,19.6552176 L103.960374,19.6608766 C104.550102,19.761248 105.151018,19.7755867 105.742877,19.7040758 L106.071418,19.6553763 L106.188401,19.6274112 C106.531169,19.5236371 106.79587,19.2445799 106.86293,18.8880759 L106.984,18.263 L107.227268,18.1503227 C107.318854,18.1039659 107.408786,18.0547684 107.496913,18.0028093 L107.733,17.852 L108.40067,18.0767671 C108.733459,18.1878684 109.099335,18.1164344 109.360873,17.8925789 L109.474499,17.7783721 C109.86689,17.3399933 110.185211,16.8477608 110.418372,16.3191584 L110.539895,16.0193803 L110.575268,15.9045857 C110.658052,15.5571536 110.532601,15.188127 110.247516,14.955157 L109.731,14.538 L109.748045,14.2996556 C109.751448,14.199793 109.751448,14.0998535 109.748045,13.9999909 L109.731,13.761 L110.245282,13.3460561 C110.533362,13.1103798 110.65891,12.739818 110.573892,12.3882064 L110.529126,12.2487648 C110.324112,11.7054423 110.032368,11.1979053 109.664187,10.7417112 L109.4535,10.4952733 L109.361208,10.4047167 C109.101177,10.181915 108.735605,10.1098569 108.404163,10.2193046 L107.733,10.444 L107.496818,10.2944623 C107.408737,10.2425478 107.318865,10.1933753 107.227349,10.1470228 L106.985,10.033 L106.862186,9.40493783 C106.787944,9.01224511 106.469188,8.71204037 106.073103,8.6421119 L106.039381,8.63626987 C105.449457,8.53638224 104.848848,8.52211258 104.257255,8.59322399 L103.928337,8.64177012 Z M105.559116,9.7800079 L105.716,9.802 L105.934718,10.9188843 L106.256736,11.0336881 C106.624281,11.1647229 106.965071,11.3511176 107.265166,11.584891 L107.519587,11.7830847 L108.65,11.402 L108.753337,11.5241129 C108.975644,11.8043128 109.160667,12.1072739 109.304857,12.4267985 L109.347,12.529 L108.444506,13.2595964 L108.504148,13.6063703 C108.56608,13.9664577 108.56608,14.3331888 108.504148,14.6932763 L108.444493,15.0401279 L109.346,15.77 L109.304035,15.8719226 C109.160161,16.189933 108.975212,16.4926812 108.753311,16.7727479 L108.651,16.894 L107.518952,16.5139386 L107.264425,16.7126237 C106.964987,16.946366 106.624594,17.1325135 106.257352,17.262989 L105.934801,17.3775867 L105.717,18.495 L105.558071,18.5175662 C105.187549,18.5592664 104.812239,18.5592395 104.440966,18.5173995 L104.282,18.495 L104.063862,17.3741973 L103.742674,17.2592198 C103.37815,17.1287293 103.040321,16.9432418 102.743057,16.710732 L102.488482,16.5116123 L101.349,16.894 L101.246799,16.7729949 C101.024603,16.492738 100.83954,16.1897012 100.695197,15.8701132 L100.652,15.767 L101.56531,15.0311885 L101.50484,14.6834371 C101.474769,14.5105023 101.459598,14.3307279 101.459598,14.1486982 C101.459598,13.9675797 101.474784,13.7876775 101.504902,13.6138526 L101.565094,13.2664588 L100.652,12.529 L100.69572,12.4252239 C100.839594,12.1072135 101.024542,11.8044652 101.246444,11.5243985 L101.349,11.402 L102.488027,11.7854604 L102.742562,11.5868013 C103.040363,11.3543741 103.378431,11.1687121 103.74308,11.0376843 L104.063703,10.9224765 L104.282,9.801 L104.164827,9.81867782 C104.624195,9.74090258 105.094748,9.72794004 105.559116,9.7800079 Z" fill-rule="nonzero" transform="translate(-94, 36)" data-face="cap"/>
    </g>
  </svg>`,
  },

  thermal_one_key_ignition: {
    icon25d: `<svg viewBox="0 0 98 95" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- 火焰保留原稿三档红：颜色本身就是图元语义，不参与 currentColor 光照 -->
      <g stroke="none">
        <path d="M15.5,40 C24.0604136,40 31,33.0080072 31,24.3829469 C31,15.7578866 24.2298851,4.50159864 12.2852089,0 C11.7686996,3.00106576 11.19059,5.09498096 10.5508802,6.28174559 C8.18123893,10.677811 5.08770141,13.2104106 4.37322858,13.9764098 C1.76693647,16.7706629 0,20.2458305 0,24.3829469 C0,33.0080072 6.93958638,40 15.5,40 Z" fill="#F8575D"/>
        <path d="M15.6565737,38.0553478 C20.9580116,38.0553478 25.2556762,33.7252281 25.2556762,28.3837547 C25.2556762,23.0422813 21.0629648,16.0712967 13.6656634,13.2834705 C13.3457908,15.1420213 12.9877694,16.4387765 12.591599,17.1737362 C11.1240874,19.8962061 9.20826914,21.4646372 8.76579831,21.9390182 C7.1517296,23.6694905 6.05747126,25.8216512 6.05747126,28.3837547 C6.05747126,33.7252281 10.3551358,38.0553478 15.6565737,38.0553478 Z" fill="#C13B44"/>
        <path d="M15.6197956,36.6192969 C18.539428,36.6192969 20.9062578,34.2345933 20.9062578,31.2929123 C20.9062578,28.3512313 18.5972283,24.5121384 14.5233522,22.9768138 C14.3471905,24.0003635 14.1500192,24.7145186 13.9318385,25.119279 C13.1236437,26.6186102 12.0685554,27.4823839 11.8248758,27.7436372 C10.9359684,28.6966509 10.3333333,29.8818988 10.3333333,31.2929123 C10.3333333,34.2345933 12.7001631,36.6192969 15.6197956,36.6192969 Z" fill="#982F39"/>
      </g>

      <ellipse cx="82" cy="94.4" rx="14" ry="0.2" data-shadow="1"/>

      <!-- 遥控器：外轮廓填成整块面板，左上缘受光、右下缘压暗，按钮段与手柄间留一道暗缝 -->
      <g transform="translate(28.780991, 36.780526)">
        <path d="M8.99902654,7.28306304e-14 L54.3115135,38.0216911 C57.3097283,40.537492 60.5511682,42.7482771 63.9877944,44.6212819 L68.0826106,46.8530087 C68.5675489,47.1173063 68.7464137,47.724682 68.4821161,48.2096204 C68.4503258,48.2679499 68.4128023,48.3229665 68.3701019,48.3738549 L60.6825657,57.5355038 C60.3765791,57.9001645 59.8559511,57.9985808 59.4379682,57.7707748 L54.9887678,55.3459041 C51.5521416,53.4728993 48.3107018,51.2621142 45.3124869,48.7463133 L18.53,26.273 L18.5137624,26.2933775 L17.5945091,25.5220324 L17.611,25.502 L1.04805054e-13,10.7246222 L8.99902654,7.28306304e-14 Z" data-face="front"/>
        <path d="M8.99902654,7.28306304e-14 L54.3115135,38.0216911 C57.3097283,40.537492 60.5511682,42.7482771 63.9877944,44.6212819 L68.0826106,46.8530087" data-edge="hi" stroke-width="1"/>
        <path d="M0,10.7246222 L45.3124869,48.7463133 C48.3107018,51.2621142 51.5521416,53.4728993 54.9887678,55.3459041" data-edge="lo" stroke-width="1"/>
        <path d="M1.04805054e-13,10.7246222 L8.99902654,7.28306304e-14" data-edge="hi" stroke-width="1"/>
        <path d="M59.4379682,57.7707748 L68.3701019,48.3738549" data-edge="lo" stroke-width="1"/>
        <path d="M26.3,16.08 L18.84,24.97" data-edge="lo" stroke-width="1"/>
        <circle cx="13.6207731" cy="13.049821" r="3" data-face="cap"/>
        <circle cx="13.6207731" cy="13.049821" r="3" data-edge="lo" stroke-width="1"/>
      </g>
    </g>
  </svg>`,
  },

  thermal_level_gauge: {
    icon25d: `<svg viewBox="0 0 46 104" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- 落地投影压在喇叭口下方，两侧各露一点 -->
      <ellipse cx="23" cy="103.35" rx="9" ry="0.19" data-shadow="1"/>

      <!-- 喇叭口（向下张开的锥体）：左缘受光、右缘压暗，底口一道暗棱 -->
      <path d="M20.19,59.46 H25.81 L29.55,103.6 H16.45 Z" data-face="body"/>
      <path d="M20.19,59.46 L16.45,103.6" data-edge="hi" stroke-width="1.2"/>
      <path d="M25.81,59.46 L29.55,103.6" data-edge="lo" stroke-width="1.2"/>
      <path d="M16.45,103.6 H29.55" data-edge="lo" stroke-width="1.2"/>

      <!-- 法兰盘：线稿是空心环，这里做成整块水平台面 -->
      <ellipse cx="23" cy="53.702" rx="23" ry="7.698" data-face="top"/>
      <path d="M0,53.702 A23,7.698 0 0 1 46,53.702" data-edge="hi" stroke-width="1.2"/>
      <path d="M0,53.702 A23,7.698 0 0 0 46,53.702" data-edge="lo" stroke-width="1.2"/>

      <!-- 六颗螺栓：台面很亮，只能靠压暗的环把螺帽分出来 -->
      <ellipse cx="6" cy="54.218" rx="1.4" ry="1" data-face="cap"/>
      <ellipse cx="11" cy="52.218" rx="1.4" ry="1" data-face="cap"/>
      <ellipse cx="16" cy="54.918" rx="1.4" ry="1" data-face="cap"/>
      <ellipse cx="29" cy="54.918" rx="1.4" ry="1" data-face="cap"/>
      <ellipse cx="35" cy="52.218" rx="1.4" ry="1" data-face="cap"/>
      <ellipse cx="40" cy="54.218" rx="1.4" ry="1" data-face="cap"/>
      <ellipse cx="6" cy="54.218" rx="1.4" ry="1" data-edge="lo" stroke-width="1.2"/>
      <ellipse cx="11" cy="52.218" rx="1.4" ry="1" data-edge="lo" stroke-width="1.2"/>
      <ellipse cx="16" cy="54.918" rx="1.4" ry="1" data-edge="lo" stroke-width="1.2"/>
      <ellipse cx="29" cy="54.918" rx="1.4" ry="1" data-edge="lo" stroke-width="1.2"/>
      <ellipse cx="35" cy="52.218" rx="1.4" ry="1" data-edge="lo" stroke-width="1.2"/>
      <ellipse cx="40" cy="54.218" rx="1.4" ry="1" data-edge="lo" stroke-width="1.2"/>

      <!-- 底座垫圈：颈根坐在盘面上的一圈台肩；后缘先画，前缘等颈部落位后再压上 -->
      <ellipse cx="23" cy="49.53" rx="9.022" ry="2.33" data-face="top"/>
      <path d="M13.978,49.53 A9.022,2.33 0 0 1 18.313,47.539" data-edge="hi" stroke-width="1.2"/>
      <path d="M27.689,47.539 A9.022,2.33 0 0 1 32.022,49.53" data-edge="hi" stroke-width="1.2"/>

      <!-- 颈根的喇叭座 -->
      <path d="M18.313,47.888 H27.689 V48.029 C27.689,49.416 25.691,50.253 23,50.253 C20.396,50.253 18.443,49.416 18.319,48.029 Z" data-face="front"/>
      <path d="M18.313,47.888 H27.689" data-edge="lo" stroke-width="1.2"/>
      <path d="M18.319,48.029 C18.443,49.416 20.396,50.253 23,50.253 C25.691,50.253 27.689,49.416 27.689,48.029" data-edge="lo" stroke-width="1.2"/>

      <!-- 颈下段 -->
      <path d="M18.313,43.582 H27.689 V47.888 H18.313 Z" data-face="body"/>
      <path d="M18.313,43.582 V47.888" data-edge="hi" stroke-width="1.2"/>
      <path d="M27.689,43.582 V47.888" data-edge="lo" stroke-width="1.2"/>

      <path d="M13.978,49.53 A9.022,2.33 0 0 0 32.022,49.53" data-edge="lo" stroke-width="1.2"/>

      <!-- 带三个插槽的压块：槽是凹槽，压暗的槽口比填色更接近线稿 -->
      <path d="M17.388,36.582 H28.611 A0.5,0.5 0 0 1 29.111,37.082 V43.082 A0.5,0.5 0 0 1 28.611,43.582 H17.388 A0.5,0.5 0 0 1 16.888,43.082 V37.082 A0.5,0.5 0 0 1 17.388,36.582 Z" data-face="front"/>
      <path d="M16.888,37.082 V43.082" data-edge="hi" stroke-width="1.2"/>
      <path d="M29.111,37.082 V43.082" data-edge="lo" stroke-width="1.2"/>
      <path d="M16.888,43.082 A0.5,0.5 0 0 0 17.388,43.582 H28.611 A0.5,0.5 0 0 0 29.111,43.082" data-edge="lo" stroke-width="1.2"/>
      <rect x="18.088" y="37.782" width="2.395" height="4.6" rx="0.3" data-edge="lo" stroke-width="1.2"/>
      <rect x="21.683" y="37.782" width="2.633" height="4.6" rx="0.3" data-edge="lo" stroke-width="1.2"/>
      <rect x="25.516" y="37.782" width="2.395" height="4.6" rx="0.3" data-edge="lo" stroke-width="1.2"/>

      <!-- 颈中段：柱面打底，两圈卡箍叠亮面，接缝走暗棱 -->
      <path d="M17.899,29.899 H28.1 V34.472 H27.433 V36.582 H18.566 V34.472 H17.899 Z" data-face="body"/>
      <path d="M17.899,29.899 H28.1" data-edge="lo" stroke-width="1.2"/>
      <path d="M17.899,29.899 V34.472 H18.566 V36.582" data-edge="hi" stroke-width="1.2"/>
      <path d="M28.1,29.899 V34.472 H27.433 V36.582" data-edge="lo" stroke-width="1.2"/>
      <rect x="19.1" y="30.455" width="7.8" height="3.079" data-face="front"/>
      <path d="M19.1,30.455 H26.9 M19.1,33.534 H26.9" data-edge="lo" stroke-width="1.2"/>
      <rect x="19.766" y="34.734" width="6.467" height="1.848" data-face="front"/>
      <path d="M19.766,34.734 H26.233 M19.766,36.582 H26.233" data-edge="lo" stroke-width="1.2"/>

      <!-- 过渡锥 -->
      <path d="M14.733,25.681 H31.266 L28.1,29.899 H17.899 Z" data-face="front"/>
      <path d="M14.733,25.681 H31.266" data-edge="lo" stroke-width="1.2"/>
      <path d="M14.733,25.681 L17.899,29.899" data-edge="hi" stroke-width="1.2"/>
      <path d="M31.266,25.681 L28.1,29.899" data-edge="lo" stroke-width="1.2"/>

      <!-- 表体圆柱；右缘被表镜盖住的一段不画棱线，免得透过镜面显出来 -->
      <rect x="14.733" y="8" width="16.533" height="17.681" data-face="body"/>
      <path d="M14.733,8 V25.681" data-edge="hi" stroke-width="1.2"/>
      <path d="M31.266,8 V10.8 M31.266,19.9 V25.681" data-edge="lo" stroke-width="1.2"/>
      <path d="M13,8 H33" data-edge="lo" stroke-width="1.2"/>

      <!-- 右侧表镜：线稿是实心半圆，径向面当透镜 -->
      <path d="M32.0072027,11.4691632 L32.0072027,19.2307772 C32.0067165,19.5852311 31.7189812,19.8721791 31.3645273,19.8716935 C31.2290157,19.8715078 31.0970401,19.8284338 30.9888209,19.7468432 C29.1121866,18.3708932 28.1738694,16.9052688 28.1738694,15.3499702 C28.1738694,13.7946716 29.1121866,12.3290473 30.9888209,10.9530972 C31.2740048,10.7425909 31.675445,10.8056508 31.8841516,11.0921458 C31.9639424,11.201676 32.0070165,11.3336516 32.0072027,11.4691632 Z" data-face="cap"/>
      <path d="M32.0072027,11.4691632 L32.0072027,19.2307772 C32.0067165,19.5852311 31.7189812,19.8721791 31.3645273,19.8716935 C31.2290157,19.8715078 31.0970401,19.8284338 30.9888209,19.7468432 C29.1121866,18.3708932 28.1738694,16.9052688 28.1738694,15.3499702 C28.1738694,13.7946716 29.1121866,12.3290473 30.9888209,10.9530972 C31.2740048,10.7425909 31.675445,10.8056508 31.8841516,11.0921458 C31.9639424,11.201676 32.0070165,11.3336516 32.0072027,11.4691632 Z" data-edge="hi" stroke-width="1.2"/>

      <!-- 旋钮支架：窗口里先铺旋钮面，再由框片的 evenodd 洞把它露出来 -->
      <rect x="36.688" y="12.879" width="1.719" height="4.952" data-face="cap"/>
      <path d="M38.3654066,11.6785828 C39.0083676,11.6785828 39.5371991,12.1672292 39.6007915,12.7934125 L39.6072027,12.9203789 L39.6072027,17.7887155 C39.6072027,18.4316765 39.1185563,18.9605081 38.492373,19.0241004 L38.3654066,19.0305117 L32.0072027,19.0305117 L32.0072027,17.8305117 L35.4882027,17.8295828 L35.4882027,12.8785828 L32.0072027,12.8785828 L32.0072027,11.6785828 L38.3654066,11.6785828 Z M36.6882027,17.8295828 L38.3654066,17.8305117 C38.3807955,17.8305117 38.3942419,17.8221949 38.4014963,17.8098108 L38.4072027,17.7887155 L38.4072027,12.9203789 C38.4072027,12.90499 38.3988859,12.8915436 38.3865019,12.8842892 L38.3654066,12.8785828 L36.6882027,12.8785828 L36.6882027,17.8295828 Z" fill-rule="evenodd" data-face="front"/>
      <rect x="36.688" y="12.879" width="1.719" height="4.952" data-edge="lo" stroke-width="1.2"/>
      <path d="M32.007,11.679 H38.365 A1.24,1.24 0 0 1 39.607,12.92" data-edge="hi" stroke-width="1.2"/>
      <path d="M32.007,19.031 H38.365 A1.24,1.24 0 0 0 39.607,17.789" data-edge="lo" stroke-width="1.2"/>

      <!-- 顶盖：正面 + 顶面窄带，窗口沉成凹槽 -->
      <path d="M14,0 H32 A1,1 0 0 1 33,1 V7 A1,1 0 0 1 32,8 H13 V1 A1,1 0 0 1 14,0 Z" data-face="front"/>
      <path d="M14,0 H32 A1,1 0 0 1 33,1 V1.6 H13 V1 A1,1 0 0 1 14,0 Z" data-face="top"/>
      <rect x="14.2" y="1.2" width="17.6" height="5.6" data-edge="lo" stroke-width="1.2"/>
      <path d="M13,1 V7" data-edge="hi" stroke-width="1.2"/>
      <path d="M33,1 V7" data-edge="lo" stroke-width="1.2"/>
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
