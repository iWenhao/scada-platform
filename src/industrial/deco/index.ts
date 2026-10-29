import type { AssetIconMeta } from '../assetComponents'
import { buildAssetComponents, withIllustrations } from '../assetComponents'
import { decoIcons, decoMeta } from './icons.generated'

/**
 * 装饰组件（外部素材导入）：按钮 / 背景一 / 背景2 / 标题一 / 标题二 / 导航 / 箭头，
 * 另含本组图标文件里的四个管件——它们注册在「管道组件」，见下方 pipeFittingComponents。
 *
 * 贴图类素材同样走 buildAssetComponents 的 state 契约（接不接数据源都可，不接就按默认色
 * 显示），但贴图图标保留了素材写死的颜色，所以变色对它们无效、也不该有效；四个管件例外，
 * 见下方 toStatusColor。导航源文件是 PNG，由导入脚本包成 base64 data-URI 的 SVG <image>；
 * 横管 / 竖管未纳入（源配置错指、与管道组件重复），见 scripts/subunit-manifest.json 里 deco 的 _note。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */

/**
 * 管件：直通 / 弯通 / 三通 / 四通。图标物理上留在本组的 icons.generated.ts（素材包里
 * 它们就放在 desc/ 装饰目录，重新生成时还会出现在这里），但注册分组按语义归 pipeline，
 * 和「管道」摆在一起——判据同储罐搬家：按「是什么」归类，不按「从哪个文件夹导入」。
 *
 * 名单写在一处、由 assetComponents.test.ts 钉住：素材重新生成后若改名，过滤会静默漏掉
 * 那一项（既不报错也不显示），所以用「两边相加等于 decoMeta 全量」这条断言兜住。
 */
export const PIPE_FITTING_TYPES = ['deco_straight', 'deco_elbow', 'deco_tee', 'deco_cross']

function metaWhere(match: (type: string) => boolean): Record<string, AssetIconMeta> {
  return Object.fromEntries(Object.entries(decoMeta).filter(([type]) => match(type)))
}

const isFitting = (type: string) => PIPE_FITTING_TYPES.includes(type)

/**
 * 管件图标接上状态色通道。素材把颜色写死成 `fill="#407DB9"`，而画布上色靠的是把图标里的
 * `currentColor` 整串替换成规则色（`core/canvas/iconImage.ts`），写死的色不在那条通道上——
 * 接了 `state = 2`（报警）也照样是素材蓝，报警在画面上静默失效。
 *
 * 只改这四项：背景 / 标题 / 导航那类贴图本来就不该跟着状态变色，保留原色才对。不改生成文件
 * （`icons.generated.ts` 由导入脚本产出，重新导出素材会冲掉手工编辑）；素材哪天换了色值，
 * 由 assetComponents.test.ts 的「四项都含 currentColor」报红。
 */
function toStatusColor(svg: string): string {
  return svg.replace(/fill="#407DB9"/g, 'fill="currentColor"')
}

const fittingIcons: Record<string, string> = {
  ...decoIcons,
  ...Object.fromEntries(PIPE_FITTING_TYPES.map((type) => [type, toStatusColor(decoIcons[type] ?? '')])),
}

/**
 * 管件的面基稿（2.5D）。原稿是几块 `rx=1` 圆角矩形拼出的「管段 + 法兰」，面基只换着色：
 * 横段铺 `barrel`（亮带压天顶、向下压暗），竖段铺 `body`（亮带偏左）——两种朝向分用两个
 * token，和 `pipeFlow.ts` 里原生管身用的是同一组数字（`CYLINDER_STOPS`）。
 *
 * 三个容易踩的点：
 * - **弯头/三通/四通的两段管身在原稿里是重叠的**（同一块 6×6 角落各铺一次）。面是半透明
 *   的，叠在一起只会变亮，角上会浮出一块亮补丁；所以竖向段改成只画到接缝的路径，
 *   与横段 butt 对接，既不叠色也不留缝。
 * - **法兰不能用 `barrel`**：2 宽的法兰铺竖直渐变会向底部淡到几乎看不见，法兰形状就丢了；
 *   用 `top` 又亮得像两根独立的灯管。`front`（横向渐变、不淡出）才是法兰盘缘的读法。
 * - **接触阴影必须压在原稿内容界内**：阴影压到界外会把内容包围盒撑大，切换风格时整件
 *   缩小（§4.5 第 5 条）。原稿圆头描边决定的最大线宽是 1，棱线显式写回 1 才对得上。
 */
const fittingIllustrations: Record<string, { icon25d: string }> = {
  deco_straight: {
    icon25d: `<svg viewBox="0 0 22 10" xmlns="http://www.w3.org/2000/svg">
      <g stroke-width="1">
        <ellipse cx="10.5" cy="8.4" rx="5" ry="0.5" data-shadow="1" />
        <rect x="3" y="1.5" width="15" height="6" rx="1" data-face="barrel" />
        <rect x="0" y="0" width="2" height="9" rx="1" data-face="front" />
        <rect x="19" y="0" width="2" height="9" rx="1" data-face="front" />
        <path d="M4,1.5 H17" data-edge="hi" stroke-width="1" />
        <path d="M4,7.5 H17" data-edge="lo" stroke-width="1" />
      </g>
    </svg>`,
  },
  deco_elbow: {
    icon25d: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <g stroke-width="1">
        <ellipse cx="9" cy="18.9" rx="5.5" ry="0.5" data-shadow="1" />
        <path d="M2.5,3 H6.5 A1,1 0 0 1 7.5,4 V12 H1.5 V4 A1,1 0 0 1 2.5,3 Z" data-face="body" />
        <rect x="1.5" y="12" width="15" height="6" rx="1" data-face="barrel" />
        <rect x="17.5" y="10.5" width="2" height="9" rx="1" data-face="front" />
        <rect x="0" y="0" width="9" height="2" rx="1" data-face="front" />
        <path d="M1.5,4 V12" data-edge="hi" stroke-width="1" />
        <path d="M7.5,4 V12" data-edge="lo" stroke-width="1" />
        <path d="M7.5,12 H15.5" data-edge="hi" stroke-width="1" />
        <path d="M2.5,18 H15.5" data-edge="lo" stroke-width="1" />
      </g>
    </svg>`,
  },
  deco_tee: {
    icon25d: `<svg viewBox="0 0 31 20" xmlns="http://www.w3.org/2000/svg">
      <g stroke-width="1">
        <ellipse cx="15" cy="18.9" rx="8" ry="0.5" data-shadow="1" />
        <path d="M13,3 H17 A1,1 0 0 1 18,4 V12 H12 V4 A1,1 0 0 1 13,3 Z" data-face="body" />
        <rect x="3" y="12" width="24" height="6" rx="1" data-face="barrel" />
        <rect x="0" y="10.5" width="2" height="9" rx="1" data-face="front" />
        <rect x="28" y="10.5" width="2" height="9" rx="1" data-face="front" />
        <rect x="10.5" y="0" width="9" height="2" rx="1" data-face="front" />
        <path d="M4,12 H12" data-edge="hi" stroke-width="1" />
        <path d="M18,12 H26" data-edge="hi" stroke-width="1" />
        <path d="M12,4 V12" data-edge="hi" stroke-width="1" />
        <path d="M18,4 V12" data-edge="lo" stroke-width="1" />
        <path d="M4,18 H26" data-edge="lo" stroke-width="1" />
      </g>
    </svg>`,
  },
  deco_cross: {
    icon25d: `<svg viewBox="0 0 31 30" xmlns="http://www.w3.org/2000/svg">
      <g stroke-width="1">
        <ellipse cx="15" cy="29.2" rx="3.5" ry="0.5" data-shadow="1" />
        <path d="M13,3 H17 A1,1 0 0 1 18,4 V12 H12 V4 A1,1 0 0 1 13,3 Z" data-face="body" />
        <path d="M12,18 H18 V26 A1,1 0 0 1 17,27 H13 A1,1 0 0 1 12,26 Z" data-face="body" />
        <rect x="3" y="12" width="24" height="6" rx="1" data-face="barrel" />
        <rect x="0" y="10.5" width="2" height="9" rx="1" data-face="front" />
        <rect x="28" y="10.5" width="2" height="9" rx="1" data-face="front" />
        <rect x="10.5" y="0" width="9" height="2" rx="1" data-face="front" />
        <rect x="10.5" y="28" width="9" height="2" rx="1" data-face="front" />
        <path d="M4,12 H12" data-edge="hi" stroke-width="1" />
        <path d="M18,12 H26" data-edge="hi" stroke-width="1" />
        <path d="M12,4 V12" data-edge="hi" stroke-width="1" />
        <path d="M18,4 V12" data-edge="lo" stroke-width="1" />
        <path d="M12,18 V26" data-edge="hi" stroke-width="1" />
        <path d="M18,18 V26" data-edge="lo" stroke-width="1" />
        <path d="M4,18 H12" data-edge="lo" stroke-width="1" />
        <path d="M18,18 H26" data-edge="lo" stroke-width="1" />
      </g>
    </svg>`,
  },
}

/** 注册进「管道组件」的管件，由 pipeline/index.ts 汇入 */
export const pipeFittingComponents = withIllustrations(
  buildAssetComponents('pipeline', fittingIcons, metaWhere(isFitting)),
  fittingIllustrations,
)

export const decoComponents = buildAssetComponents('deco', decoIcons, metaWhere((type) => !isFitting(type)))
