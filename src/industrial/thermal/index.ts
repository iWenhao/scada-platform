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
