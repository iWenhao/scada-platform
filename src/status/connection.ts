/**
 * 连接状态 → 展示视图（文案 / Element Plus Tag 类型 / 指示灯样式类）的统一映射。
 * 首页、预览头部、数据源对话框、点位表等处共用，避免各写一份 switch。
 */

export interface ConnectionStatusView {
  text: string
  tagType: 'success' | 'danger' | 'info'
  cls: 'ok' | 'bad' | 'warn'
}

export function connectionStatusView(status: string): ConnectionStatusView {
  if (status === 'connected') return { text: '已连接', tagType: 'success', cls: 'ok' }
  if (status === 'error') return { text: '连接错误', tagType: 'danger', cls: 'bad' }
  // connecting / disconnected 等其余状态一律按「未连接」展示
  return { text: '未连接', tagType: 'info', cls: 'warn' }
}
