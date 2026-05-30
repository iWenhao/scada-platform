/** 连线类型 */
export type ConnectionType = 'straight' | 'polyline' | 'curve'

/** 端口位置 */
export type PortPosition = 'top' | 'bottom' | 'left' | 'right'

/** 连线定义 */
export interface Connection {
  id: string
  type: ConnectionType
  sourceId: string
  sourcePort: PortPosition
  targetId: string
  targetPort: PortPosition
  points: number[]
  style: ConnectionStyle
  label?: string
}

/** 连线样式 */
export interface ConnectionStyle {
  stroke: string
  strokeWidth: number
  dash?: number[]
  animated?: boolean
  flowSpeed?: number
  flowDirection?: 'forward' | 'reverse'
}

/** 默认连线样式 */
export const defaultConnectionStyle: ConnectionStyle = {
  stroke: '#666666',
  strokeWidth: 2,
  animated: false,
  flowSpeed: 1,
  flowDirection: 'forward',
}

/** 端口信息 */
export interface PortInfo {
  id: string
  position: PortPosition
  x: number
  y: number
}
