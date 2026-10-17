import type { ComponentDefinition } from '@/types/scada'
import { STATE_RULES } from '../assetComponents'

/**
 * 状态灯：浅灰圆环灯体 + 灯芯，灯芯颜色跟随状态（停机灰 / 运行青绿 / 报警红）。
 *
 * 几何复刻自 coalmine-ui 2022 年旧资产 `1通用/状态灯.svg`——该资产随旧组态编辑器
 * 的整套编号目录于 2022-05-06 被删除（提交 c7e558e2f），此处按初次提交里的原文件
 * 重绘：144 画布、外圈 r64.1 描边 6、灯芯 r47.9，圆心同为 (72.8, 72.5)。
 *
 * 两个刻意的设计决定：
 * - 外圈写死 `#999999`（灯体，不随状态变），灯芯走 `currentColor`（随状态变）。
 *   iconImage.ts 的变色是 `currentColor` 字符串替换、固定色原样保留，因此两色调能在
 *   同一张图里共存；原资产正是「浅灰灯圈 + 深灰灯芯」，停机态观感与原版一致。
 * - 状态契约复用 assetComponents 的 STATE_RULES（state 0/1/2），与 132 个导入图元
 *   同一套口径：接入任意数据源只需把开关量或状态字绑到 `state`；severity 已显式
 *   声明（停机不会因颜色兜底被误判成报警）。
 *
 * 与电气组「指示灯」（elec_indicator）不是一回事：那是立杆顶叉号的禁止牌，
 * 这是会变色的灯。
 */
export const StatusLampDefinition: ComponentDefinition = {
  type: 'status-lamp',
  name: '状态灯',
  group: 'general',
  icon: `<svg viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">
    <circle cx="72.8" cy="72.5" r="64.1" fill="none" stroke="#999999" stroke-width="6" />
    <circle cx="72.8" cy="72.5" r="47.9" fill="currentColor" />
  </svg>`,
  defaultWidth: 48,
  defaultHeight: 48,
  defaultConfig: { state: 0 },
  statusRules: STATE_RULES,
  dataBindings: [{ property: 'state', variable: 'state' }],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '状态灯', group: '基本' },
    {
      key: 'state',
      label: '状态',
      type: 'select',
      default: 0,
      options: [
        { label: '停机', value: 0 },
        { label: '运行', value: 1 },
        { label: '报警', value: 2 },
      ],
      group: '基本',
    },
  ],
}
