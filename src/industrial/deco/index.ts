import { buildAssetComponents } from '../assetComponents'
import { decoIcons, decoMeta } from './icons.generated'

/**
 * 装饰组件（外部素材导入）：按钮 / 背景一 / 背景2 / 标题一 / 标题二 /
 * 直通 / 弯通 / 三通 / 四通 / 导航，另含源产品列在「基础组件」下的箭头。
 *
 * 这几个是贴图类素材而非设备，所以同样走 buildAssetComponents 的 state 契约
 * （接不接数据源都可，不接就按默认色显示）。导航源文件是 PNG，由导入脚本包成
 * base64 data-URI 的 SVG <image>；横管 / 竖管未纳入（源配置错指、与管道组件重复），
 * 见 scripts/subunit-manifest.json 里 deco 的 _note。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const decoComponents = buildAssetComponents('deco', decoIcons, decoMeta)
