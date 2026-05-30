import type { PortPosition } from '@/types/connection'

export interface Point {
  x: number
  y: number
}

export interface PortInfo extends Point {
  position: PortPosition
}

/**
 * 路径计算器
 */
export class PathCalculator {
  /**
   * 计算直线路径
   */
  calculateStraightPath(source: PortInfo, target: PortInfo): number[] {
    return [source.x, source.y, target.x, target.y]
  }

  /**
   * 计算折线路径
   */
  calculatePolylinePath(source: PortInfo, target: PortInfo): number[] {
    const points: number[] = []
    
    // 起点
    points.push(source.x, source.y)
    
    // 根据端口方向计算中间点
    const midX = (source.x + target.x) / 2
    const midY = (source.y + target.y) / 2
    
    switch (source.position) {
      case 'right':
        if (target.position === 'left') {
          points.push(midX, source.y, midX, target.y)
        } else if (target.position === 'top') {
          points.push(target.x, source.y)
        } else if (target.position === 'bottom') {
          points.push(target.x, source.y)
        } else {
          points.push(midX, source.y, midX, target.y)
        }
        break
        
      case 'left':
        if (target.position === 'right') {
          points.push(midX, source.y, midX, target.y)
        } else if (target.position === 'top') {
          points.push(target.x, source.y)
        } else if (target.position === 'bottom') {
          points.push(target.x, source.y)
        } else {
          points.push(midX, source.y, midX, target.y)
        }
        break
        
      case 'bottom':
        if (target.position === 'top') {
          points.push(source.x, midY, target.x, midY)
        } else if (target.position === 'left') {
          points.push(source.x, target.y)
        } else if (target.position === 'right') {
          points.push(source.x, target.y)
        } else {
          points.push(source.x, midY, target.x, midY)
        }
        break
        
      case 'top':
        if (target.position === 'bottom') {
          points.push(source.x, midY, target.x, midY)
        } else if (target.position === 'left') {
          points.push(source.x, target.y)
        } else if (target.position === 'right') {
          points.push(source.x, target.y)
        } else {
          points.push(source.x, midY, target.x, midY)
        }
        break
    }
    
    // 终点
    points.push(target.x, target.y)
    
    return points
  }

  /**
   * 计算曲线路径
   */
  calculateCurvePath(source: PortInfo, target: PortInfo): number[] {
    const points: number[] = []
    const controlPointOffset = 50
    
    // 起点
    points.push(source.x, source.y)
    
    // 根据端口方向计算控制点
    let cp1x = source.x
    let cp1y = source.y
    let cp2x = target.x
    let cp2y = target.y
    
    switch (source.position) {
      case 'right':
        cp1x += controlPointOffset
        break
      case 'left':
        cp1x -= controlPointOffset
        break
      case 'bottom':
        cp1y += controlPointOffset
        break
      case 'top':
        cp1y -= controlPointOffset
        break
    }
    
    switch (target.position) {
      case 'right':
        cp2x += controlPointOffset
        break
      case 'left':
        cp2x -= controlPointOffset
        break
      case 'bottom':
        cp2y += controlPointOffset
        break
      case 'top':
        cp2y -= controlPointOffset
        break
    }
    
    // 使用贝塞尔曲线近似
    const steps = 20
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const x = this.bezierPoint(source.x, cp1x, cp2x, target.x, t)
      const y = this.bezierPoint(source.y, cp1y, cp2y, target.y, t)
      points.push(x, y)
    }
    
    return points
  }

  /**
   * 贝塞尔曲线计算
   */
  private bezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const t2 = t * t
    const t3 = t2 * t
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    
    return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3
  }

  /**
   * 计算路径长度
   */
  calculatePathLength(points: number[]): number {
    let length = 0
    
    for (let i = 2; i < points.length; i += 2) {
      const dx = points[i] - points[i - 2]
      const dy = points[i + 1] - points[i - 1]
      length += Math.sqrt(dx * dx + dy * dy)
    }
    
    return length
  }

  /**
   * 获取路径上的点
   */
  getPointOnPath(points: number[], t: number): Point {
    const totalLength = this.calculatePathLength(points)
    const targetLength = totalLength * t
    
    let currentLength = 0
    
    for (let i = 2; i < points.length; i += 2) {
      const dx = points[i] - points[i - 2]
      const dy = points[i + 1] - points[i - 1]
      const segmentLength = Math.sqrt(dx * dx + dy * dy)
      
      if (currentLength + segmentLength >= targetLength) {
        const ratio = (targetLength - currentLength) / segmentLength
        return {
          x: points[i - 2] + dx * ratio,
          y: points[i - 1] + dy * ratio,
        }
      }
      
      currentLength += segmentLength
    }
    
    return {
      x: points[points.length - 2],
      y: points[points.length - 1],
    }
  }
}

// 单例导出
export const pathCalculator = new PathCalculator()
