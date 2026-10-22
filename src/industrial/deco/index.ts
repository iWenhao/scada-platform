import type { AssetIconMeta } from '../assetComponents'
import { buildAssetComponents } from '../assetComponents'
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

/** 注册进「管道组件」的管件，由 pipeline/index.ts 汇入 */
export const pipeFittingComponents = buildAssetComponents('pipeline', fittingIcons, metaWhere(isFitting))

export const decoComponents = buildAssetComponents('deco', decoIcons, metaWhere((type) => !isFitting(type)))
