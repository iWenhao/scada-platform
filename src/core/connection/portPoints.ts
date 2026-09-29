import type { ComponentInstance } from '@/types/scada'
import type { ConnectionType, PortPosition } from '@/types/connection'
import { pathCalculator } from './PathCalculator'

/**
 * 端口坐标与连线路径计算（纯函数）：画布与连接 store 共用。
 */

/** 获取元素指定端口的画布绝对坐标 */
export function getElementPortPoint(element: ComponentInstance, port: PortPosition) {
  switch (port) {
    case 'top': return { x: element.x + element.width / 2, y: element.y }
    case 'bottom': return { x: element.x + element.width / 2, y: element.y + element.height }
    case 'left': return { x: element.x, y: element.y + element.height / 2 }
    case 'right': return { x: element.x + element.width, y: element.y + element.height / 2 }
  }
}

/** 根据连线类型计算两端端口间的路径点 */
export function computeConnectionPoints(
  source: ComponentInstance, sourcePort: PortPosition,
  target: ComponentInstance, targetPort: PortPosition,
  type: ConnectionType
): number[] {
  const s = getElementPortPoint(source, sourcePort)
  const t = getElementPortPoint(target, targetPort)
  const sourceInfo = { position: sourcePort, x: s.x, y: s.y }
  const targetInfo = { position: targetPort, x: t.x, y: t.y }

  if (type === 'straight') return pathCalculator.calculateStraightPath(sourceInfo, targetInfo)
  if (type === 'curve') return pathCalculator.calculateCurvePath(sourceInfo, targetInfo)
  return pathCalculator.calculatePolylinePath(sourceInfo, targetInfo)
}
