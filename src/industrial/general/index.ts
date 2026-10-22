import type { ComponentDefinition } from '@/types/scada'
import { buildAssetComponents } from '../assetComponents'
import { generalIcons, generalMeta } from './icons.generated'
import { StatusLampDefinition } from './statusLamp'
import { TankDefinition } from './tank'

/**
 * 通用设备：13 项外部素材导入 + 手写「状态灯」与「储罐」（手写件排在导入件之后）。
 *
 * 判据是「跨行业都摆得上」，与它是不是手写无关：状态灯与储罐手写、泵与阀是导入素材，
 * 同一批里混着两种来源。所以新增跨行业的「物」时放这里，不要因为它是手写的就塞进
 * 基础组件（储罐原来就在那里，2026-10-22 挪过来）。
 *
 * 素材来源与 type ↔ 源文件的对应关系见 scripts/subunit-manifest.json；
 * 图标文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 */
export const generalComponents: ComponentDefinition[] = [
  ...buildAssetComponents('general', generalIcons, generalMeta),
  StatusLampDefinition,
  TankDefinition,
]
