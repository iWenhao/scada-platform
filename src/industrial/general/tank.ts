import type { ComponentDefinition } from '@/types/scada'

/**
 * 储罐：立式圆柱罐体 + 椭圆顶盖 + 罐顶接管，面基（插画级）图元。
 *
 * 放在通用设备而不是任何行业组：罐体是跨行业物件——水处理的废气容器、热力的除氧罐/
 * 煤粉塔、化工的反应釜都在用同一类几何。归到某一个行业组会让其余行业的用户在面板上
 * 翻不到它（面板按组分区，只有搜索跨组）。
 *
 * 原先它在「基础组件」组里（自初始提交起），是该组唯一的工艺设备；通用设备组已有
 * 泵1/泵2/电磁阀/风机 这类按「物」归类的条目，储罐与此一致。
 */
export const TankDefinition: ComponentDefinition = {
  type: 'tank',
  name: '储罐',
  group: 'general',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="84" rx="27" ry="6" data-shadow="1"/>
      <path d="M24 24 A26 12 0 0 1 76 24 L76 72 A26 12 0 0 1 24 72 Z" data-face="body"/>
      <path d="M24 52 A26 12 0 0 0 76 52" data-edge="lo"/>
      <path d="M24 72 A26 12 0 0 0 76 72" data-edge="lo"/>
      <ellipse cx="50" cy="24" rx="26" ry="12" data-face="cap"/>
      <ellipse cx="50" cy="24" rx="26" ry="12" data-edge="hi"/>
      <path d="M47 13 L47 10 A3 1.5 0 0 1 53 10 L53 13 Z" data-face="front"/>
      <ellipse cx="50" cy="10" rx="3" ry="1.5" data-face="cap"/>
    </g>
  </svg>`,
  defaultWidth: 80,
  defaultHeight: 100,
  defaultConfig: {
    level: 0,
    temp: 25,
  },
  statusRules: [
    {
      id: 'high',
      name: '高液位',
      color: '#ffa502',
      severity: 'warning',
      condition: { type: 'compare', variable: 'level', operator: '>', value: 80 },
      priority: 1,
    },
    {
      id: 'normal',
      name: '正常',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'level', min: 20, max: 80 },
      priority: 2,
    },
    {
      id: 'low',
      name: '低液位',
      color: '#ff4757',
      severity: 'critical',
      condition: { type: 'compare', variable: 'level', operator: '<', value: 20 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'level', variable: 'level' },
  ],
  properties: [
    {
      key: 'name',
      label: '名称',
      type: 'string',
      default: '储罐',
      group: '基本',
    },
    {
      key: 'level',
      label: '液位',
      type: 'range',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      group: '运行参数',
    },
  ],
}
