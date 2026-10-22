import type { ComponentDefinition } from '@/types/scada'

/**
 * 化工组图元：反应釜是立式罐体（`body` + `cap`），换热器是整台横卧壳体。
 *
 * 卧式壳体的侧面不能用 `body`——那个渐变沿横向走，套在横躺的筒体上会变成「沿长度明暗」。
 * 为此 `FACE_STYLE` 加了 `barrel`（亮带在天顶、向下压暗），换热器是它的首个使用者。
 */

/** 反应釜 */
export const ReactorDefinition: ComponentDefinition = {
  type: 'reactor',
  name: '反应釜',
  group: 'chemical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="52" cy="88" rx="26" ry="5" data-shadow="1"/>
      <path d="M27 32 A23 11.5 0 0 1 73 32 L73 60 Q73 78 50 84 Q27 78 27 60 Z" data-face="body"/>
      <path d="M27 44 A23 11.5 0 0 0 73 44" data-edge="lo"/>
      <path d="M27 60 Q27 78 50 84 Q73 78 73 60" data-edge="lo"/>
      <ellipse cx="50" cy="32" rx="23" ry="11.5" data-face="cap"/>
      <ellipse cx="50" cy="32" rx="23" ry="11.5" data-edge="hi"/>
      <ellipse cx="50" cy="66" rx="5.5" ry="8.5" data-face="cap"/>
      <ellipse cx="50" cy="66" rx="5.5" ry="8.5" data-edge="hi" stroke-width="1.1"/>
      <ellipse cx="50" cy="66" rx="2.6" ry="4.2" data-face="hole"/>
      <path d="M27 52 L13 45" data-pipe="base"/>
      <path d="M27 50.4 L13 43.4" data-pipe="hi"/>
      <ellipse cx="13" cy="45" rx="2" ry="5.5" transform="rotate(26.57 13 45)" data-face="cap"/>
      <path d="M73 52 L87 59" data-pipe="base"/>
      <path d="M73 50.4 L87 57.4" data-pipe="hi"/>
      <ellipse cx="87" cy="59" rx="2" ry="5.5" transform="rotate(26.57 87 59)" data-face="cap"/>
      <polygon points="50,16 62,22 50,28 38,22" data-face="top"/>
      <polygon points="38,22 50,28 50,33 38,27" data-face="front"/>
      <polygon points="50,28 62,22 62,27 50,33" data-face="side"/>
      <path d="M38 22 L50 16 L62 22" data-edge="hi"/>
      <path d="M38 27 L50 33 L62 27" data-edge="lo"/>
      <path d="M50 15 L50 20.5" data-pipe="base"/>
      <path d="M48.4 15 L48.4 20.5" data-pipe="hi"/>
      <ellipse cx="50" cy="20.5" rx="3" ry="1.5" data-face="cap"/>
      <path d="M43 6 A7 3.5 0 0 1 57 6 L57 15 A7 3.5 0 0 1 43 15 Z" data-face="body"/>
      <ellipse cx="50" cy="6" rx="7" ry="3.5" data-face="cap"/>
      <ellipse cx="50" cy="6" rx="7" ry="3.5" data-edge="hi" stroke-width="1.1"/>
    </g>
  </svg>`,
  defaultWidth: 76,
  defaultHeight: 88,
  defaultConfig: {
    temp: 25,
    pressure: 0.1,
  },
  statusRules: [
    {
      id: 'over-temp',
      name: '超温',
      color: '#ff4757',
      severity: 'critical',
      condition: { type: 'compare', variable: 'temp', operator: '>', value: 180 },
      priority: 1,
    },
    {
      id: 'reacting',
      name: '反应中',
      color: '#00d4aa',
      condition: { type: 'range', variable: 'temp', min: 60, max: 180 },
      priority: 2,
    },
    {
      id: 'standby',
      name: '待机',
      color: '#666666',
      condition: { type: 'compare', variable: 'temp', operator: '<', value: 60 },
      priority: 3,
    },
  ],
  dataBindings: [
    { property: 'temp', variable: 'temp' },
    { property: 'pressure', variable: 'pressure' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '反应釜', group: '基本' },
    { key: 'temp', label: '釜内温度(℃)', type: 'number', default: 25, min: -20, max: 300, group: '运行参数' },
  ],
}

/** 换热器 */
export const HeatExchangerDefinition: ComponentDefinition = {
  type: 'heat_exchanger',
  name: '换热器',
  group: 'chemical',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="80" rx="33" ry="5" data-shadow="1"/>
      <polygon points="29,54.5 34,57 34,78 29,75.5" data-face="front"/>
      <polygon points="34,57 38,55.5 38,76.5 34,78" data-face="side"/>
      <path d="M29 75.5 L34 78 L38 76.5" data-edge="lo"/>
      <polygon points="51,65 56,67.5 56,78 51,75.5" data-face="front"/>
      <polygon points="56,67.5 60,65.5 60,76.5 56,78" data-face="side"/>
      <path d="M51 75.5 L56 78 L60 76.5" data-edge="lo"/>
      <path d="M48 56 L48 76" data-pipe="base"/>
      <path d="M46.4 56 L46.4 76" data-pipe="hi"/>
      <ellipse cx="48" cy="56" rx="3.5" ry="1.75" data-face="cap"/>
      <ellipse cx="48" cy="76" rx="4" ry="2" data-face="cap"/>
      <path d="M22 33 L70 57 Q82 66 70 75 L22 51 Q10 42 22 33 Z" data-face="barrel"/>
      <path d="M22 33 Q10 42 22 51" data-edge="hi"/>
      <path d="M22 33 L70 57" data-edge="hi"/>
      <path d="M22 51 L70 75" data-edge="lo"/>
      <path d="M38 41 Q43.2 52.6 38 59" data-edge="lo" stroke-width="1.1"/>
      <path d="M54 51 Q59.2 62.6 54 69" data-edge="lo" stroke-width="1.1"/>
      <ellipse cx="68" cy="65" rx="2" ry="9" transform="rotate(26.57 68 65)" data-face="cap"/>
      <ellipse cx="68" cy="65" rx="2" ry="9" transform="rotate(26.57 68 65)" data-edge="hi" stroke-width="1.1"/>
      <path d="M40 42 L40 28" data-pipe="base"/>
      <path d="M38.4 42 L38.4 28" data-pipe="hi"/>
      <ellipse cx="40" cy="42" rx="3.5" ry="1.75" data-face="cap"/>
      <ellipse cx="40" cy="28" rx="4" ry="2" data-face="cap"/>
      <ellipse cx="40" cy="28" rx="4" ry="2" data-edge="hi" stroke-width="1.1"/>
      <path d="M58 51 L58 37" data-pipe="base"/>
      <path d="M56.4 51 L56.4 37" data-pipe="hi"/>
      <ellipse cx="58" cy="51" rx="3.5" ry="1.75" data-face="cap"/>
      <ellipse cx="58" cy="37" rx="4" ry="2" data-face="cap"/>
      <ellipse cx="58" cy="37" rx="4" ry="2" data-edge="hi" stroke-width="1.1"/>
      <path d="M16 39 L8 35" data-pipe="base"/>
      <path d="M16 37.4 L8 33.4" data-pipe="hi"/>
      <ellipse cx="8" cy="35" rx="2" ry="5.5" transform="rotate(26.57 8 35)" data-face="cap"/>
      <path d="M76 69 L84 73" data-pipe="base"/>
      <path d="M76 67.4 L84 71.4" data-pipe="hi"/>
      <ellipse cx="84" cy="73" rx="2" ry="5.5" transform="rotate(26.57 84 73)" data-face="cap"/>
    </g>
  </svg>`,
  defaultWidth: 82,
  defaultHeight: 60,
  defaultConfig: {
    flow: 0,
    tempOut: 25,
  },
  statusRules: [
    {
      id: 'exchanging',
      name: '换热中',
      color: '#00d4aa',
      condition: { type: 'compare', variable: 'flow', operator: '>', value: 0 },
      priority: 1,
    },
    {
      id: 'stopped',
      name: '停用',
      color: '#666666',
      condition: { type: 'compare', variable: 'flow', operator: '=', value: 0 },
      priority: 2,
    },
  ],
  dataBindings: [
    { property: 'flow', variable: 'flow' },
    { property: 'tempOut', variable: 'tempOut' },
  ],
  properties: [
    { key: 'name', label: '名称', type: 'string', default: '换热器', group: '基本' },
    { key: 'tempOut', label: '出口温度(℃)', type: 'number', default: 25, min: 0, max: 200, group: '运行参数' },
  ],
}

export const chemicalComponents: ComponentDefinition[] = [
  ReactorDefinition,
  HeatExchangerDefinition,
]
