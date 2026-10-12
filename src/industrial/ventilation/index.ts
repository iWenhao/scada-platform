import { buildAssetComponents } from '../assetComponents'
import { ventilationIcons, ventilationMeta } from './icons.generated'

/**
 * 主通风系统（外部素材导入）：主通风风道 / 主扇电机 / 主启动器 / 控制分站 /
 * 局部通风 / 风门。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const ventilationComponents = buildAssetComponents(
  'ventilation',
  ventilationIcons,
  ventilationMeta,
)
