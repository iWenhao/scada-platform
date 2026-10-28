import { buildAssetComponents } from '../assetComponents'
import { ventilationIcons, ventilationMeta } from './icons.generated'

/**
 * 2.5D 迁移：素材图元是线条稿，这里按面基同姿态重绘（见 docs/2.5D_ILLUSTRATION_GUIDE.md §4.5）。
 * 覆盖发生在组装之后，生成文件保持原样，重新导出素材不会把这层改动冲掉。
 *
 * 同姿态约定：viewBox、摆放角度、占地轮廓都与素材原稿一致，只把「线」换成「面 + 棱线 +
 * 接触阴影」，因此默认尺寸继续用素材自带的值，不在这里改画幅。
 *
 * 双源约定：`icon` 继续用生成文件里的素材原稿（2D 画布与组件面板必须与导入时一模一样），
 * 面基稿写进 `icon25d`，只在 2.5D 模式生效。
 *
 * 描边宽度口径：`tightenIconSvg` 按「最大描边宽度 / 2 + 0.5」外扩包围盒，两种风格的最大
 * 线宽不一致会让同一条设备在切换风格时缩放比差 1% 以上。本组原稿是 2 宽（风门另有一根
 * 4 宽锁杆、主扇电机有一个 3.135 宽的轮毂描边），因此组默认取 2，个别件把原稿更宽的
 * 那一档挂在无描边的元素上（见各件注释），只为对齐包围盒补偿。
 */
const illustratedAssets: Record<string, { icon25d: string; name?: string }> = {
  vent_main_starter: {
    icon25d: `<svg viewBox="0 0 62 80" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="31" cy="77.8" rx="29" ry="1.2" data-shadow="1"/>

      <!-- 柜体：原稿 rx4 的圆角留在轮廓上，顶面只取一条窄带（正对观察者的机柜照空压机的切法） -->
      <path d="M5,1 H57 A4,4 0 0 1 61,5 V6.4 H1 V5 A4,4 0 0 1 5,1 Z" data-face="top"/>

      <!-- 内门板要真挖：hole 是加色，叠在亮面上的暗腔反而会比柜面更亮 -->
      <rect x="10.538" y="10.552" width="40.923" height="58.896" data-face="hole"/>
      <path d="M1,6.4 H61 V75 A4,4 0 0 1 57,79 H5 A4,4 0 0 1 1,75 Z M10.538,10.552 H51.461 V69.448 H10.538 Z" fill-rule="evenodd" data-face="front"/>
      <rect x="10.538" y="10.552" width="40.923" height="58.896" data-edge="lo" stroke-width="1.2"/>
      <path d="M5,1 H57" data-edge="hi"/>
      <path d="M1,5 V75" data-edge="hi"/>
      <path d="M61,5 V75" data-edge="lo"/>
      <path d="M5,79 H57" data-edge="lo"/>

      <!-- 铭牌是凸起的板：上缘受光、下缘落影 -->
      <path d="M17.097,17.313 H44.903 A1,1 0 0 1 45.903,18.313 V25.866 A1,1 0 0 1 44.903,26.866 H17.097 A1,1 0 0 1 16.097,25.866 V18.313 A1,1 0 0 1 17.097,17.313 Z" data-face="front"/>
      <path d="M17.097,17.313 H44.903" data-edge="hi"/>
      <path d="M17.097,26.866 H44.903" data-edge="lo"/>

      <!-- 两只指示灯是功能本体（停机灰 / 运行青绿 / 报警红），颜色就是语义，不参与面光照 -->
      <ellipse cx="21.462" cy="46.567" rx="5.365" ry="5.373" stroke="#00C21F" stroke-width="1.194"/>
      <ellipse cx="40.538" cy="46.567" rx="5.365" ry="5.373" stroke="#FF4556" stroke-width="1.194"/>
      <ellipse cx="40.538" cy="46.567" rx="3.577" ry="3.582" fill="#FF4556" stroke="none"/>
      <rect x="19.077" y="45.851" width="4.769" height="1.433" rx="0.716" fill="#1EBE3F" stroke="none"/>
    </g>
  </svg>`,
  },
  vent_control_station: {
    icon25d: `<svg viewBox="0 0 72 80" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="36" cy="77.8" rx="34" ry="1.2" data-shadow="1"/>

      <!-- 柜体：与主启动器同一套箱体切法，整组机柜才像一批货。
           屏面那一块要连柜面一起挖空：只挖边框的话，暗腔底下仍压着受光的柜面，照样是亮的 -->
      <path d="M5,1 H67 A4,4 0 0 1 71,5 V6.4 H1 V5 A4,4 0 0 1 5,1 Z" data-face="top"/>
      <path d="M1,6.4 H71 V75 A4,4 0 0 1 67,79 H5 A4,4 0 0 1 1,75 Z M12.522,12.549 H59.478 V31.373 H12.522 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M5,1 H67" data-edge="hi"/>
      <path d="M1,5 V75" data-edge="hi"/>
      <path d="M71,5 V75" data-edge="lo"/>
      <path d="M5,79 H67" data-edge="lo"/>

      <!-- 显示屏：屏面同样要真挖（hole 叠加只会变亮），边框留成四条窄边；屏内文字是发光内容，保留实色 -->
      <rect x="12.522" y="12.549" width="46.956" height="18.824" data-face="hole"/>
      <path d="M9.391,9.412 H62.609 V34.51 H9.391 Z M12.522,12.549 H59.478 V31.373 H12.522 Z" fill-rule="evenodd" data-face="front"/>
      <rect x="12.522" y="12.549" width="46.956" height="18.824" data-edge="lo" stroke-width="1.2"/>
      <path d="M9.391,9.412 H62.609" data-edge="hi" stroke-width="1.2"/>
      <path d="M9.391,9.412 V34.51" data-edge="hi" stroke-width="1.2"/>
      <path d="M62.609,9.412 V34.51" data-edge="lo" stroke-width="1.2"/>
      <path d="M9.391,34.51 H62.609" data-edge="lo" stroke-width="1.2"/>

      <rect fill="currentColor" stroke="none" x="18.783" y="17.255" width="9.391" height="3.137"/>
      <rect fill="currentColor" stroke="none" x="18.783" y="23.529" width="9.391" height="3.137"/>
      <rect fill="currentColor" stroke="none" x="31.304" y="17.255" width="9.391" height="3.137"/>
      <rect fill="currentColor" stroke="none" x="31.304" y="23.529" width="9.391" height="3.137"/>
      <rect fill="currentColor" stroke="none" x="43.826" y="17.255" width="9.391" height="3.137"/>
      <rect fill="#FF4556" stroke="none" x="43.826" y="23.529" width="9.391" height="3.137"/>

      <!-- 六只薄膜按键：受光的是上表面，下缘落影 -->
      <rect x="9.391" y="43.922" width="14.087" height="3.137" rx="1.569" data-face="top"/>
      <rect x="28.174" y="43.922" width="14.087" height="3.137" rx="1.569" data-face="top"/>
      <rect x="9.391" y="51.765" width="14.087" height="3.137" rx="1.569" data-face="top"/>
      <rect x="28.174" y="51.765" width="14.087" height="3.137" rx="1.569" data-face="top"/>
      <rect x="9.391" y="59.608" width="14.087" height="3.137" rx="1.569" data-face="top"/>
      <rect x="28.174" y="59.608" width="14.087" height="3.137" rx="1.569" data-face="top"/>
      <path d="M9.9,47.059 H22.97 M28.68,47.059 H41.75 M9.9,54.902 H22.97 M28.68,54.902 H41.75 M9.9,62.745 H22.97 M28.68,62.745 H41.75" data-edge="lo" stroke-width="1"/>

      <!-- 四只圆形按钮：凸起的轴帽配同参压暗圈，亮面板上才立得起来；红色那颗是功能色 -->
      <circle cx="49.304" cy="46.275" r="2.348" data-face="cap"/>
      <circle cx="49.304" cy="46.275" r="2.348" data-edge="lo" stroke-width="1.1"/>
      <circle cx="49.304" cy="60.392" r="2.348" data-face="cap"/>
      <circle cx="49.304" cy="60.392" r="2.348" data-edge="lo" stroke-width="1.1"/>
      <circle cx="60.261" cy="46.275" r="2.348" data-face="cap"/>
      <circle cx="60.261" cy="46.275" r="2.348" data-edge="lo" stroke-width="1.1"/>
      <circle cx="60.261" cy="60.392" r="2.348" fill="#FF4556" data-edge="lo" stroke-width="1.1"/>
    </g>
  </svg>`,
  },
  vent_local_ventilation: {
    icon25d: `<svg viewBox="0 0 257 91" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="128" cy="88.9" rx="118" ry="0.9" data-shadow="1"/>

      <!-- 支腿与落地横撑原稿就是 2 宽的实心带，放不下面再放两道棱线：按带宽走亮棱线、落地压暗 -->
      <path d="M60,76 V90 M44,76 V90" data-edge="hi" stroke-width="2"/>
      <path d="M44,90 H60" data-edge="lo" stroke-width="2"/>
      <path d="M138,76 V90 M122,76 V90" data-edge="hi" stroke-width="2"/>
      <path d="M122,90 H138" data-edge="lo" stroke-width="2"/>

      <!-- 顶部提手：受光的上表面，下缘落影 -->
      <rect x="42.653" y="0.653" width="19.694" height="6.694" rx="1.089" data-face="top"/>
      <path d="M44.4,7.347 H60.6" data-edge="lo" stroke-width="1.2"/>
      <rect x="120.653" y="0.653" width="19.694" height="6.694" rx="1.089" data-face="top"/>
      <path d="M122.4,7.347 H138.6" data-edge="lo" stroke-width="1.2"/>

      <!-- 左端进风口：喇叭口朝左、侧面背离光源，压成 side；口沿与法兰缝各一条棱线。
           先画喇叭口，三段箱体后压，接缝才落在箱体左侧那条亮棱线上 -->
      <path d="M25,71.816 C18.371,72.763 13.988,75.491 11.851,80 H1 V11 H11.851 C13.988,15.509 18.371,18.237 25,19.184 Z" data-face="side"/>
      <path d="M25,19.184 C18.371,18.237 13.988,15.509 11.851,11 H1" data-edge="hi"/>
      <path d="M25,71.816 C18.371,72.763 13.988,75.491 11.851,80 H1" data-edge="lo"/>
      <path d="M1,11 V80" data-edge="hi"/>
      <path d="M11.5,11 V80" data-edge="lo" stroke-width="1.2"/>

      <!-- 三段风筒箱体：顶面窄带 + 正面整块 -->
      <path d="M25,15 H81 V18.2 H25 Z" data-face="top"/>
      <path d="M25,18.2 H81 V76 H25 Z" data-face="front"/>
      <path d="M25,15 H81" data-edge="hi"/>
      <path d="M25,15 V76" data-edge="hi"/>
      <path d="M81,15 V76" data-edge="lo"/>
      <path d="M25,76 H81" data-edge="lo"/>

      <path d="M104,15 H160 V18.2 H104 Z" data-face="top"/>
      <path d="M104,18.2 H160 V76 H104 Z" data-face="front"/>
      <path d="M104,15 H160" data-edge="hi"/>
      <path d="M104,15 V76" data-edge="hi"/>
      <path d="M160,15 V76" data-edge="lo"/>
      <path d="M104,76 H160" data-edge="lo"/>

      <path d="M167,15 H228 V18.2 H167 Z" data-face="top"/>
      <path d="M167,18.2 H228 V76 H167 Z" data-face="front"/>
      <path d="M167,15 H228" data-edge="hi"/>
      <path d="M167,15 V76" data-edge="hi"/>
      <path d="M228,15 V76" data-edge="lo"/>
      <path d="M167,76 H228" data-edge="lo"/>

      <!-- 右端薄法兰 -->
      <path d="M246.7,17 H255.7 V73 H246.7 Z" data-face="front"/>
      <path d="M246.7,17 H255.7" data-edge="hi"/>
      <path d="M246.7,17 V73" data-edge="hi"/>
      <path d="M255.7,17 V73" data-edge="lo"/>
      <path d="M246.7,73 H255.7" data-edge="lo"/>

      <!-- 提手的两只立脚：原稿 2 宽，压在箱体顶面上走亮棱线 -->
      <path d="M46,7.5 V15.5 M56,7.5 V15.5 M125,7.5 V15.5 M136,7.5 V15.5" data-edge="hi" stroke-width="2"/>

      <!-- 筒间连通管：原稿 2 宽，按带宽走亮棱线 -->
      <path d="M80,18.5 H103 M160,18.5 H168 M228,18.5 H246.4 M80,71.5 H103 M160,71.5 H168 M228,71.5 H246.4 M92.5,18.5 V71" data-edge="hi" stroke-width="2"/>
    </g>
  </svg>`,
  },
  vent_air_door: {
    icon25d: `<svg viewBox="0 0 65 122" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- 4 宽只用来对齐包围盒补偿（tightenIconSvg 按最大描边外扩）：阴影 token 不描边，看不见 -->
      <ellipse cx="32.5" cy="119.8" rx="22" ry="1" data-shadow="1" stroke-width="4"/>

      <!-- 门扇：正对观察者的平板，横向受光；不用 cap（径向渐变会把 61 宽的门扇画成金属球）。
           轮廓沿原稿 3 宽，左上受光、右下压暗 -->
      <circle cx="32.5" cy="71" r="30.5" data-face="front"/>
      <path d="M32.5,40.5 A30.5,30.5 0 0 0 32.5,101.5" data-edge="hi" stroke-width="3"/>
      <path d="M32.5,40.5 A30.5,30.5 0 0 1 32.5,101.5" data-edge="lo" stroke-width="3"/>

      <!-- 锁杆：原稿 4 宽的实心带，按带宽走亮棱线；两端藏进门楣与底托 -->
      <path d="M32.5,25.5 V110.5" data-edge="hi" stroke-width="4"/>

      <!-- 顶梁、铰链座、门楣、底托：四块叠起来的凸起板，逐块上缘受光下缘落影 -->
      <path d="M22,1 H43 A1,1 0 0 1 44,2 V6 A1,1 0 0 1 43,7 H22 A1,1 0 0 1 21,6 V2 A1,1 0 0 1 22,1 Z" data-face="front"/>
      <path d="M22,1 H43" data-edge="hi"/>
      <path d="M22,7 H43" data-edge="lo"/>

      <path d="M28,7 H37 V18 H28 Z" data-face="front"/>
      <path d="M28,7 H37" data-edge="hi"/>
      <path d="M28,18 H37" data-edge="lo"/>
      <path d="M28,7 V18" data-edge="hi"/>
      <path d="M37,7 V18" data-edge="lo"/>

      <!-- 铰链座上的两枚销子：实色小件，压在座面上，不参与面光照 -->
      <path d="M29.85,9.911 H31.45 V15.111 H29.85 Z M33.55,9.911 H35.15 V15.111 H33.55 Z" fill="currentColor" stroke="none"/>

      <path d="M25,18 H40 A1,1 0 0 1 41,19 V23 A1,1 0 0 1 40,24 H25 A1,1 0 0 1 24,23 V19 A1,1 0 0 1 25,18 Z" data-face="front"/>
      <path d="M25,18 H40" data-edge="hi"/>
      <path d="M25,24 H40" data-edge="lo"/>

      <path d="M28,113 H37 A1,1 0 0 1 38,114 V120 A1,1 0 0 1 37,121 H28 A1,1 0 0 1 27,120 V114 A1,1 0 0 1 28,113 Z" data-face="front"/>
      <path d="M28,113 H37" data-edge="hi"/>
      <path d="M28,121 H37" data-edge="lo"/>
    </g>
  </svg>`,
  },
  vent_main_fan_motor: {
    icon25d: `<svg viewBox="0 0 73 81" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- 3.135 只用来对齐包围盒补偿（原稿轮毂是 3.135 宽描边的实心点）：阴影 token 不描边，看不见 -->
      <ellipse cx="36.5" cy="79" rx="25" ry="1" data-shadow="1" stroke-width="3.13516797"/>

      <!-- 机座：先画，机壳的落腿压住它的顶边 -->
      <path d="M18.25,74.775 H54.75 V80 H18.25 Z" data-face="front"/>
      <path d="M18.25,74.775 H54.75" data-edge="hi"/>
      <path d="M18.25,80 H54.75" data-edge="lo"/>
      <path d="M18.25,74.775 V80" data-edge="hi"/>
      <path d="M54.75,74.775 V80" data-edge="lo"/>

      <!-- 机壳：正面整块（含两只落腿），轮廓左上受光、右下压暗。
           进风筒是机壳上真挖的洞（hole 叠加只会变亮），所以暗腔先画、壳面用 evenodd 挖掉 -->
      <ellipse cx="36.504" cy="36.577" rx="25.234" ry="25.286" data-face="hole"/>
      <path d="M36.5,1 C46.303,1 55.178,4.982 61.602,11.42 C68.026,17.858 72,26.752 72,36.577 C72,47.683 66.922,57.601 58.965,64.126 V74.767 H47.929 V70.27 C44.342,71.492 40.498,72.154 36.5,72.154 C32.502,72.154 28.658,71.492 25.071,70.27 V74.767 H14.036 V64.126 C6.078,57.601 1,47.683 1,36.577 C1,26.752 4.974,17.858 11.398,11.42 C17.822,4.982 26.697,1 36.5,1 Z M11.27,36.577 A25.234,25.286 0 1 1 61.738,36.577 A25.234,25.286 0 1 1 11.27,36.577 Z" fill-rule="evenodd" data-face="front"/>
      <path d="M36.5,1 C26.697,1 17.822,4.982 11.398,11.42 C4.974,17.858 1,26.752 1,36.577 C1,47.683 6.078,57.601 14.036,64.126" data-edge="hi"/>
      <path d="M36.5,1 C46.303,1 55.178,4.982 61.602,11.42 C68.026,17.858 72,26.752 72,36.577 C72,47.683 66.922,57.601 58.965,64.126" data-edge="lo"/>
      <path d="M14.036,64.126 V74.767 H25.071 V70.27 M47.929,70.27 V74.767 H58.965 V64.126" data-edge="lo"/>
      <path d="M14.036,74.767 H25.071 M47.929,74.767 H58.965" data-edge="lo"/>

      <!-- 洞沿压暗圈：把壳面与暗腔的交界收干净 -->
      <ellipse cx="36.504" cy="36.577" rx="25.234" ry="25.286" data-edge="lo" stroke-width="1.2"/>

      <!-- 叶轮盘：暗面托住叶片，盘的轮廓就是原稿那道 1.2 宽内圈 -->
      <ellipse cx="36.5" cy="36.577" rx="14.226" ry="14.257" data-face="side"/>
      <ellipse cx="36.5" cy="36.577" rx="14.226" ry="14.257" data-edge="lo" stroke-width="1.2"/>

      <!-- 11 片叶片：几何与变换全部沿用原稿，只把实色换成受光面 -->
      <polygon data-face="front" points="34.2999587 10.8571429 38.6217586 10.8571429 39.430245 22.6180691 33.5628906 22.6180691"/>
      <g transform="translate(51.315748, 36.276606) scale(-1, 1) translate(-51.315748, -36.276606) translate(40.388751, 12.576942)">
        <polygon data-face="front" transform="translate(16.029975, 6.559592) scale(-1, 1) rotate(-330.000000) translate(-16.029975, -6.559592) " points="13.8214926 0.67987977 18.1455707 0.683825575 18.9651984 12.4393036 13.0947512 12.4339467"/>
        <polygon data-face="front" transform="translate(8.893470, 14.056260) scale(-1, 1) rotate(60.000000) translate(-8.893470, -14.056260) " points="6.68267243 8.18273398 11.0113067 8.18667979 11.8317868 19.929785 5.95515396 19.9244281"/>
        <polygon data-face="front" transform="translate(5.868090, 24.000660) scale(-1, 1) rotate(90.000000) translate(-5.868090, -24.000660) " points="3.66684969 18.1325701 7.99776209 18.1325701 8.80795316 29.8687509 2.92822755 29.8687509"/>
        <polygon data-face="front" transform="translate(9.029226, 33.818747) scale(-1, 1) rotate(120.000000) translate(-9.029226, -33.818747) " points="6.83985825 27.9491997 11.1684925 27.9452539 11.9675423 39.6868829 6.0909095 39.6922398"/>
        <polygon data-face="front" transform="translate(16.372176, 40.839764) scale(-1, 1) rotate(150.000000) translate(-16.372176, -40.839764) " points="14.1851243 34.9640308 18.5092024 34.960085 19.3073998 46.7140867 13.4369526 46.7194436"/>
      </g>
      <polygon data-face="front" transform="translate(36.496568, 56.166177) scale(1, -1) translate(-36.496568, -56.166177) " points="34.2999587 50.2857143 38.6217586 50.2857143 39.430245 62.0466405 33.5628906 62.0466405"/>
      <polygon data-face="front" transform="translate(26.458546, 19.136534) scale(-1, 1) rotate(-330.000000) translate(-26.458546, -19.136534) " points="24.250064 13.2568218 28.5741421 13.2607676 29.3937698 25.0162456 23.5233226 25.0108887"/>
      <polygon data-face="front" transform="translate(19.322042, 26.633202) scale(-1, 1) rotate(60.000000) translate(-19.322042, -26.633202) " points="17.1112439 20.759676 21.4398782 20.7636218 22.2603582 32.506727 16.3837254 32.5013701"/>
      <polygon data-face="front" transform="translate(16.296662, 36.577602) scale(-1, 1) rotate(90.000000) translate(-16.296662, -36.577602) " points="14.0954211 30.7095121 18.4263335 30.7095121 19.2365246 42.4456928 13.356799 42.4456928"/>
      <polygon data-face="front" transform="translate(19.457797, 46.395689) scale(-1, 1) rotate(120.000000) translate(-19.457797, -46.395689) " points="17.2684297 40.5261417 21.597064 40.5221959 22.3961137 52.2638249 16.5194809 52.2691818"/>
      <polygon data-face="front" transform="translate(26.800748, 53.416706) scale(-1, 1) rotate(150.000000) translate(-26.800748, -53.416706) " points="24.6136958 47.5409728 28.9377738 47.537027 29.7359713 59.2910287 23.8655241 59.2963856"/>

      <!-- 轮毂轴帽：比原稿描边点略大一圈（原稿半径 3.647 + 3.135 描边的一半），配同参压暗圈 -->
      <ellipse cx="36.5" cy="36.577" rx="5.214" ry="5.223" data-face="cap"/>
      <ellipse cx="36.5" cy="36.577" rx="5.214" ry="5.223" data-edge="lo" stroke-width="1.2"/>
    </g>
  </svg>`,
  },
  /**
   * 主通风风道（937×367 的大件）。
   *
   * 原稿是「两组水平风筒 + 中央三通 + 两端风机蜗壳与烟囱」的工程图：全部是 2 宽描边的
   * 空心轮廓，没有任何面。这里按同一套几何把「封闭区域」换成面、「细节轮廓」留成棱线：
   * 风筒/蜗壳/方圆过渡/烟囱各段取 front，长箱体再切一条 top 窄带做出俯视微倾；
   * 进风口格栅、烟囱砖缝、吊架等成组内框只走 lo 缝，不再各自成面（成面会互相盖成补丁）。
   *
   * 坐标沿用原稿内层坐标系（外层两段 translate 合成 +1,+1），因此 viewBox 与包围盒与
   * 素材完全一致；外层那个 translate(1,1) 就是这条合成值。
   */
  vent_main_airway: {
    icon25d: `<svg viewBox="0 0 937 367" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(1,1)">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="468" cy="363" rx="450" ry="2" data-shadow="1"/>

      <!-- 左端进风口：圆角端盖 + 法兰领 + 短管 -->
      <path d="M8,181 L104,181 L104,253 L8,253 C3.581722,253 5.41083001e-16,249.418278 0,245 L0,189 C-5.41083001e-16,184.581722 3.581722,181 8,181 Z" data-face="front"/>
      <path d="M8,181 H104" data-edge="hi"/>
      <path d="M8,181 C3.581722,181 5.41083001e-16,184.581722 0,189" data-edge="hi"/>
      <path d="M8,253 H104" data-edge="lo"/>
      <path d="M0,245 C5.41083001e-16,249.418278 3.581722,253 8,253" data-edge="lo"/>

      <polygon points="110 181 194 181 194 253 110 253" data-face="top"/>
      <polygon points="110 187 194 187 194 253 110 253" data-face="front"/>
      <path d="M110,181 H194" data-edge="hi"/>
      <path d="M110,187 H194" data-edge="lo"/>
      <path d="M110,253 H194" data-edge="lo"/>
      <path d="M194,181 V253" data-edge="lo"/>

      <path d="M107,172 C108.656854,172 110,173.343146 110,175 L110,259 C110,260.656854 108.656854,262 107,262 C105.343146,262 104,260.656854 104,259 L104,175 C104,173.343146 105.343146,172 107,172 Z" data-face="front"/>
      <path d="M104,175 V259" data-edge="hi"/>
      <path d="M110,175 V259" data-edge="lo"/>

      <!-- 右下：风筒出口的方圆过渡 -->
      <polygon points="772 289 790 281 790 353 772 345" data-face="front"/>
      <path d="M772,289 L790,281" data-edge="hi"/>
      <path d="M772,345 L790,353" data-edge="lo"/>
      <path d="M772,289 V345" data-edge="hi"/>
      <path d="M790,281 V353" data-edge="lo"/>

      <!-- ===== 上排风筒：过渡段 → 蜗壳进风口 → 蜗壳，上方烟囱 ===== -->
      <g transform="translate(296,0)">
        <polygon points="476 89 494 81 494 153 476 145" data-face="front"/>
        <path d="M476,89 L494,81" data-edge="hi"/>
        <path d="M476,145 L494,153" data-edge="lo"/>
        <path d="M476,89 V145" data-edge="hi"/>
        <path d="M494,81 V153" data-edge="lo"/>

        <polygon points="107 81 130 89 130 145 107 153" data-face="front"/>
        <path d="M107,81 L130,89" data-edge="hi"/>
        <path d="M107,153 L130,145" data-edge="lo"/>
        <path d="M107,81 V153" data-edge="hi"/>
        <path d="M130,89 V145" data-edge="lo"/>

        <!-- 风机蜗壳：平直的上/左边受光，外侧那道大圆弧落到暗部 -->
        <path d="M610,73 L538,73 L538,81 L530,81 L530,153 L546,153 C581.346224,153 610,124.346224 610,89 L610,73 Z" data-face="front"/>
        <path d="M610,73 H538 V81 H530 V153 H546" data-edge="hi"/>
        <path d="M546,153 C581.346224,153 610,124.346224 610,89 V73" data-edge="lo"/>

        <!-- 转弯段箱体 -->
        <polygon points="0 78 90 78 90 156 0 156" data-face="top"/>
        <polygon points="0 84 90 84 90 156 0 156" data-face="front"/>
        <path d="M0,78 H90" data-edge="hi"/>
        <path d="M0,84 H90" data-edge="lo"/>
        <path d="M0,156 H90" data-edge="lo"/>

        <polygon points="96 81 107 81 107 153 96 153" data-face="front"/>
        <path d="M96,81 V153" data-edge="hi"/>
        <path d="M107,81 V153" data-edge="lo"/>

        <path d="M93,72 C94.6568542,72 96,73.3431458 96,75 L96,159 C96,160.656854 94.6568542,162 93,162 C91.3431458,162 90,160.656854 90,159 L90,75 C90,73.3431458 91.3431458,72 93,72 Z" data-face="front"/>
        <path d="M90,75 V159" data-edge="hi"/>
        <path d="M96,75 V159" data-edge="lo"/>

        <path d="M497,74 C498.656854,74 500,75.3431458 500,77 L500,157 C500,158.656854 498.656854,160 497,160 C495.343146,160 494,158.656854 494,157 L494,77 C494,75.3431458 495.343146,74 497,74 Z" data-face="front"/>
        <path d="M494,77 V157" data-edge="hi"/>
        <path d="M500,77 V157" data-edge="lo"/>

        <polygon points="524 74 530 74 530 160 524 160" data-face="front"/>
        <path d="M524,74 V160" data-edge="hi"/>
        <path d="M530,74 V160" data-edge="lo"/>

        <!-- 进风口格栅：一块面加两道暗缝，别把三层内框各画成一块面 -->
        <polygon points="500 81 524 81 524 153 500 153" data-face="front"/>
        <polygon points="500 93 524 93 524 141 500 141" data-edge="lo"/>
        <polygon points="500 107 524 107 524 127 500 127" data-edge="lo"/>

        <!-- 烟囱：砖缝与内框只走暗缝，实心横带保留原色（那是加粗的功能线） -->
        <polygon points="519 6 630 6.02537594 630 27 519 26.9746241" data-face="front"/>
        <polygon fill="currentColor" stroke="none" points="519 21 630 21.0072503 630 27 519 26.9927497"/>
        <polygon points="548 6 601 6.02537594 601 27 548 26.9746241" data-edge="lo"/>
        <polygon points="565 6 584 6.02537594 584 27 565 26.9746241" data-edge="lo"/>
        <polygon points="534 6 615 6.02537594 615 27 534 26.9746241" data-edge="lo"/>
        <path d="M512.996375,0.00016840715 L636.003625,0.00708186138 C637.658505,0.00717487161 639,1.34874575 639,3.00362513 C639,4.65838427 637.658553,5.9998316 636.003794,5.9998316 C636.003737,5.9998316 636.003681,5.9998316 636.003625,5.99983159 L512.996375,5.99291814 C511.341495,5.99282513 510,4.65125425 510,2.99637487 C510,1.34161573 511.341447,0.000168402418 512.996206,0.000168402418 C512.996263,0.000168402418 512.996319,0.000168403995 512.996375,0.00016840715 Z" fill="currentColor" stroke="none"/>

        <!-- 主风筒 -->
        <polygon points="130 95 476 95 476 145 130 145" data-face="front"/>
        <polygon points="130 89 476 89 476 95 130 95" data-face="top"/>
        <path d="M130,89 H476" data-edge="hi"/>
        <path d="M130,95 H476" data-edge="lo"/>
        <path d="M130,145 H476" data-edge="lo"/>

        <!-- 烟囱下口：两段横带 + 缩口锥 -->
        <polygon points="540 59 609 59 609 67 540 67" data-face="front"/>
        <path d="M540,67 H609" data-edge="lo"/>
        <polygon points="534 67 614 67 614 73 534 73" data-face="front"/>
        <path d="M534,73 H614" data-edge="lo"/>
        <polygon stroke-linejoin="round" points="519 27 630 27 612 59 537 59" data-face="front"/>
        <path d="M519,27 L537,59" data-edge="hi"/>
        <path d="M630,27 L612,59" data-edge="lo"/>
      </g>

      <!-- 左下：方圆过渡 -->
      <polygon points="403 281 426 289 426 345 403 353" data-face="front"/>
      <path d="M403,281 L426,289" data-edge="hi"/>
      <path d="M403,353 L426,345" data-edge="lo"/>
      <path d="M403,281 V353" data-edge="hi"/>
      <path d="M426,289 V345" data-edge="lo"/>

      <!-- 中央三通箱体 -->
      <polygon points="194 176 280 176 280 258 194 258" data-face="top"/>
      <polygon points="194 182 280 182 280 258 194 258" data-face="front"/>
      <path d="M194,176 H280" data-edge="hi"/>
      <path d="M194,182 H280" data-edge="lo"/>
      <path d="M194,258 H280" data-edge="lo"/>

      <!-- 下排转弯段（与原稿一样整体下移 258） -->
      <g transform="translate(189,258)">
        <polygon points="0 0 96 0 96 6 0 6" data-face="front"/>
        <path d="M0,0 H96" data-edge="hi"/>

        <path d="M5,6 L91,6 L91,16 L101,16 L101,102 L69,102 C33.653776,102 5,73.346224 5,38 L5,6 Z" data-face="front"/>
        <path d="M5,6 H91 V16 H101 V102" data-edge="hi"/>
        <path d="M5,6 V38" data-edge="hi"/>
        <path d="M69,102 C33.653776,102 5,73.346224 5,38" data-edge="lo"/>
        <path d="M91,6 V16" data-edge="lo"/>

        <polygon points="101 11 107 11 107 107 101 107" data-face="front"/>
        <path d="M101,11 V107" data-edge="hi"/>
        <path d="M107,11 V107" data-edge="lo"/>
      </g>

      <!-- 上排转弯段：原稿是下排那条轮廓上下镜像（镜像轴 y=176），这里直接写镜像后的坐标，
           免得再套一层 scale(1,-1) 把棱线的受光/落影也翻过去 -->
      <polygon points="189 170 285 170 285 176 189 176" data-face="front"/>
      <path d="M189,170 H285" data-edge="hi"/>
      <path d="M189,176 H285" data-edge="lo"/>
      <path d="M194,170 L280,170 L280,160 L290,160 L290,74 L258,74 C222.653776,74 194,102.653776 194,138 L194,170 Z" data-face="front"/>
      <path d="M258,74 C222.653776,74 194,102.653776 194,138 V160" data-edge="hi"/>
      <path d="M194,160 H280 M280,160 H290" data-edge="hi"/>
      <path d="M280,170 H194" data-edge="lo"/>
      <path d="M280,160 V170 M290,74 V160" data-edge="lo"/>
      <polygon points="290 69 296 69 296 165 290 165" data-face="front"/>
      <path d="M290,69 V165" data-edge="hi"/>
      <path d="M296,69 V165" data-edge="lo"/>

      <!-- 下排蜗壳 -->
      <path d="M906,273 L834,273 L834,281 L826,281 L826,353 L842,353 C877.346224,353 906,324.346224 906,289 L906,273 Z" data-face="front"/>
      <path d="M906,273 H834 V281 H826 V353 H842" data-edge="hi"/>
      <path d="M842,353 C877.346224,353 906,324.346224 906,289 V273" data-edge="lo"/>

      <polygon points="296 278 386 278 386 356 296 356" data-face="top"/>
      <polygon points="296 284 386 284 386 356 296 356" data-face="front"/>
      <path d="M296,278 H386" data-edge="hi"/>
      <path d="M296,284 H386" data-edge="lo"/>
      <path d="M296,356 H386" data-edge="lo"/>

      <polygon points="392 281 403 281 403 353 392 353" data-face="front"/>
      <path d="M392,281 V353" data-edge="hi"/>
      <path d="M403,281 V353" data-edge="lo"/>

      <path d="M389,272 C390.656854,272 392,273.343146 392,275 L392,359 C392,360.656854 390.656854,362 389,362 C387.343146,362 386,360.656854 386,359 L386,275 C386,273.343146 387.343146,272 389,272 Z" data-face="front"/>
      <path d="M386,275 V359" data-edge="hi"/>
      <path d="M392,275 V359" data-edge="lo"/>

      <path d="M793,274 C794.656854,274 796,275.343146 796,277 L796,357 C796,358.656854 794.656854,360 793,360 C791.343146,360 790,358.656854 790,357 L790,277 C790,275.343146 791.343146,274 793,274 Z" data-face="front"/>
      <path d="M790,277 V357" data-edge="hi"/>
      <path d="M796,277 V357" data-edge="lo"/>

      <polygon points="820 274 826 274 826 360 820 360" data-face="front"/>
      <path d="M820,274 V360" data-edge="hi"/>
      <path d="M826,274 V360" data-edge="lo"/>

      <polygon points="796 281 820 281 820 353 796 353" data-face="front"/>
      <polygon points="796 293 820 293 820 341 796 341" data-edge="lo"/>
      <polygon points="796 307 820 307 820 327 796 327" data-edge="lo"/>

      <!-- 下排烟囱（与上排同一套，整体下移 200） -->
      <polygon points="815 206 926 206.025376 926 227 815 226.974624" data-face="front"/>
      <polygon fill="currentColor" stroke="none" points="815 221 926 221.00725 926 227 815 226.99275"/>
      <polygon points="844 206 897 206.025376 897 227 844 226.974624" data-edge="lo"/>
      <polygon points="861 206 880 206.025376 880 227 861 226.974624" data-edge="lo"/>
      <polygon points="830 206 911 206.025376 911 227 830 226.974624" data-edge="lo"/>
      <path d="M808.996375,200.000168 L932.003625,200.007082 C933.658505,200.007175 935,201.348746 935,203.003625 C935,204.658384 933.658553,205.999832 932.003794,205.999832 C932.003737,205.999832 932.003681,205.999832 932.003625,205.999832 L808.996375,205.992918 C807.341495,205.992825 806,204.651254 806,202.996375 C806,201.341616 807.341447,200.000168 808.996206,200.000168 C808.996263,200.000168 808.996319,200.000168 808.996375,200.000168 Z" fill="currentColor" stroke="none"/>

      <polygon points="426 295 772 295 772 345 426 345" data-face="front"/>
      <polygon points="426 289 772 289 772 295 426 295" data-face="top"/>
      <path d="M426,289 H772" data-edge="hi"/>
      <path d="M426,295 H772" data-edge="lo"/>
      <path d="M426,345 H772" data-edge="lo"/>

      <!-- 风筒吊架：外框成面，两道内框留暗缝 -->
      <g transform="translate(491,345)">
        <polygon points="0 0 70 0 70 10 0 10" data-face="front"/>
        <polygon points="32 0 70 0 70 10 32 10" data-edge="lo"/>
        <polygon points="32 5 70 5 70 10 32 10" data-edge="lo"/>
      </g>
      <g transform="translate(491,145)">
        <polygon points="0 0 70 0 70 10 0 10" data-face="front"/>
        <polygon points="32 0 70 0 70 10 32 10" data-edge="lo"/>
        <polygon points="32 5 70 5 70 10 32 10" data-edge="lo"/>
      </g>
      <g transform="translate(637,345)">
        <polygon points="0 0 60 0 60 10 0 10" data-face="front"/>
        <polygon points="26 0 60 0 60 10 26 10" data-edge="lo"/>
        <polygon points="26 5 60 5 60 10 26 10" data-edge="lo"/>
      </g>
      <g transform="translate(637,145)">
        <polygon points="0 0 60 0 60 10 0 10" data-face="front"/>
        <polygon points="26 0 60 0 60 10 26 10" data-edge="lo"/>
        <polygon points="26 5 60 5 60 10 26 10" data-edge="lo"/>
      </g>

      <polygon points="836 259 905 259 905 267 836 267" data-face="front"/>
      <path d="M836,267 H905" data-edge="lo"/>
      <polygon points="830 267 910 267 910 273 830 273" data-face="front"/>
      <path d="M830,273 H910" data-edge="lo"/>
      <polygon stroke-linejoin="round" points="815 227 926 227 908 259 833 259" data-face="front"/>
      <path d="M815,227 L833,259" data-edge="hi"/>
      <path d="M926,227 L908,259" data-edge="lo"/>
    </g>
    </g>
  </svg>`,
  },
}

const ventilationAssetComponents = buildAssetComponents(
  'ventilation',
  ventilationIcons,
  ventilationMeta,
).map((def) => {
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

/**
 * 主通风系统（外部素材导入）：主通风风道 / 主扇电机 / 主启动器 / 控制分站 /
 * 局部通风 / 风门。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const ventilationComponents = ventilationAssetComponents
