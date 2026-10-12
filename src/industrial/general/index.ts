import { buildAssetComponents } from '../assetComponents'
import { generalIcons, generalMeta } from './icons.generated'

/**
 * 通用设备（外部素材导入）。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const generalComponents = buildAssetComponents('general', generalIcons, generalMeta)
