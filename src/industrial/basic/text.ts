import type { ComponentDefinition } from '@/types/scada'

/**
 * 纯文本图元（`text`）。
 *
 * 用 Konva 原生 Text 渲染而不是走 HTML overlay：文字是矢量、要随画布缩放，
 * 且需要和名称/数值那两条素文本保持同一套命中与拖拽行为（overlay 是
 * pointer-events: none 的，交互全得靠 Konva 那一层）。
 *
 * 颜色走元素状态色（无状态规则时为默认青绿），与画布其余部分同一套变色口径。
 */

const TEXT_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="30" x2="78" y2="30" /><line x1="50" y1="30" x2="50" y2="66" /><line x1="36" y1="66" x2="64" y2="66" /></g></svg>`

export const TextDefinition: ComponentDefinition = {
  type: 'text',
  name: '文字',
  group: 'basic',
  icon: TEXT_ICON,
  defaultWidth: 160,
  defaultHeight: 48,
  defaultConfig: {
    text: '文本',
    fontSize: 16,
    bold: false,
    align: 'center',
    valign: 'middle',
  },
  statusRules: [],
  dataBindings: [],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '文字', group: '基本' },
    { key: 'text', label: '内容', type: 'string', default: '文本', group: '文本' },
    { key: 'fontSize', label: '字号', type: 'number', default: 16, min: 8, max: 200, group: '文本' },
    { key: 'bold', label: '加粗', type: 'boolean', default: false, group: '文本' },
    {
      key: 'align',
      label: '水平对齐',
      type: 'select',
      default: 'center',
      options: [
        { label: '左', value: 'left' },
        { label: '中', value: 'center' },
        { label: '右', value: 'right' },
      ],
      group: '文本',
    },
    {
      key: 'valign',
      label: '垂直对齐',
      type: 'select',
      default: 'middle',
      options: [
        { label: '上', value: 'top' },
        { label: '中', value: 'middle' },
      ],
      group: '文本',
    },
  ],
}

export const textComponents: ComponentDefinition[] = [TextDefinition]
