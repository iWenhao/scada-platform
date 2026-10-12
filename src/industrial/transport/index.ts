import { buildAssetComponents } from '../assetComponents'
import { transportIcons, transportMeta } from './icons.generated'

/**
 * 主运输系统（外部素材导入）：皮带轮 / 破碎机 / 给煤机 / 油泵 / 烟雾传感器。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const transportComponents = buildAssetComponents('transport', transportIcons, transportMeta)
