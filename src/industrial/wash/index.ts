import { buildAssetComponents } from '../assetComponents'
import { washIcons, washMeta } from './icons.generated'

/**
 * 洗选系统（外部素材导入）：磁选机 / 分料器 / 弧形筛 / 溜槽 / 原煤仓 / 煤仓 /
 * 浓缩机 / 浅槽分选机 / 脱介筛 / 压滤机 等 17 台。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const washComponents = buildAssetComponents('wash', washIcons, washMeta)
