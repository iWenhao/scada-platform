import type { ComponentDefinition, ComponentGroup, StatusRule } from '@/types/scada'

/** 导入图元的元信息，由素材清单生成（见 scripts/subunit-manifest.json） */
export interface AssetIconMeta {
  name: string
  width: number
  height: number
}

/**
 * 设备图元与手写状态灯共用的状态契约：单一 `state` 变量表达 0 停机 / 1 运行 / 2 报警。
 * 灯的变色语义必须与设备图元一致——同一画板上停停走走各说各话比没有语义更糟。
 *
 * 为什么用通用的 `state` 而不是逐台发明变量（speed / load / level…）：这批图元来自
 * 外部素材库，出厂不带语义，逐台指定会凭空造出上百个数据源里并不存在的变量。统一
 * 契约下，接入任意数据源都只需把该源的开关量或状态字接到 `state`；确需细分（如料位、
 * 温度）时在数据绑定面板改绑即可，不必改组件定义。
 *
 * severity 一律显式声明：`alarm` 标 critical，其余标 normal。按 src/types/scada.ts 的
 * 约定，若不显式声明会按颜色兜底推断，停机态的灰/红会被误判成报警而刷满报警面板。
 */
export const STATE_RULES: StatusRule[] = [
  {
    id: 'alarm',
    name: '报警',
    color: '#ff4d4f',
    severity: 'critical',
    condition: { type: 'compare', variable: 'state', operator: '=', value: 2 },
    priority: 1,
  },
  {
    id: 'running',
    name: '运行',
    color: '#00d4aa',
    severity: 'normal',
    condition: { type: 'compare', variable: 'state', operator: '=', value: 1 },
    priority: 2,
  },
  {
    id: 'stopped',
    name: '停机',
    color: '#8c8c8c',
    severity: 'normal',
    condition: { type: 'compare', variable: 'state', operator: '=', value: 0 },
    priority: 3,
  },
]

/**
 * 把一批「图标 + 元信息」组装为组件定义。
 *
 * 图元为单色线条稿（`stroke="currentColor"`，无 `data-face` 标注），因此
 * core/canvas/faceLighting.ts 的 styleIcon() 会原样放行——2D 与 2.5D 下外观一致，
 * 与已迁移的面基图元共存。尺寸取素材自带的默认值，viewBox 由 core/canvas/iconBounds.ts
 * 按内容包围盒自动收紧，无需在图元里手写。
 *
 * @param group 归属分组（须已登记在 ComponentGroup 中）
 * @param icons type → SVG 源码
 * @param meta  type → 名称与默认尺寸
 */
export function buildAssetComponents(
  group: ComponentGroup,
  icons: Record<string, string>,
  meta: Record<string, AssetIconMeta>,
): ComponentDefinition[] {
  return Object.entries(meta).map(([type, m]) => ({
    type,
    name: m.name,
    group,
    icon: icons[type] ?? '',
    defaultWidth: m.width,
    defaultHeight: m.height,
    defaultConfig: { state: 0 },
    statusRules: STATE_RULES,
    dataBindings: [{ property: 'state', variable: 'state' }],
    properties: [
      { key: 'name', label: '名称', type: 'string', default: m.name, group: '基本' },
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
  }))
}
