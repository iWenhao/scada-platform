import { buildAssetComponents } from '../assetComponents'
import { thermalIcons, thermalMeta } from './icons.generated'

/**
 * 热力系统（外部素材导入）：布袋除尘器 / 除氧罐 / 斗式提升机 / 分气缸 / 锅炉 /
 * 脱硫塔 / 烟囱 / 刮板机 / 一键点火 等 22 台。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const thermalComponents = buildAssetComponents('thermal', thermalIcons, thermalMeta)
