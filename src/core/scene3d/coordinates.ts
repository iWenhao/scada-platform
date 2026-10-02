/**
 * 画布坐标 → 3D 世界坐标的映射。
 *
 * 约定：世界 XZ 平面铺在"地面"上，与 2D 画布一一对应——
 * 世界 X 同画布 X，画布 Y（向下）对应世界 Z（向后）。
 * 相机默认从斜上方看向场景中心时，方位与 2D 画布一致，操作员无需重新建立方位感。
 * 比例为 1 世界单位 = 1 画布像素，元素尺寸无需换算。
 */
import type { ComponentInstance } from '@/types/scada'
import type { CanvasConfig } from '@/types/canvas'

/** 元素在 3D 场景中的摆放信息（世界坐标） */
export interface ElementWorldPlacement {
  /** 元素中心的世界坐标 X */
  x: number
  /** 元素中心的世界坐标 Z */
  z: number
  /** 元素底面占地：画布 width → 世界 X 方向，画布 height → 世界 Z 方向 */
  width: number
  depth: number
  /** 绕竖直轴的旋转（弧度）。Konva 顺时针为正，three 的 Y 轴逆时针为正，取负对齐 */
  rotationY: number
}

/** 画布元素的地面投影（只取位置相关字段，避免依赖完整实例） */
export type ElementPlacementSource = Pick<
  ComponentInstance,
  'x' | 'y' | 'width' | 'height' | 'rotation'
>

export function elementToWorld(element: ElementPlacementSource): ElementWorldPlacement {
  return {
    x: element.x + element.width / 2,
    z: element.y + element.height / 2,
    width: element.width,
    depth: element.height,
    rotationY: (-(element.rotation || 0) * Math.PI) / 180,
  }
}

/** 场景地面范围（用于地面网格尺寸与相机取景） */
export interface SceneBounds {
  minX: number
  minZ: number
  maxX: number
  maxZ: number
  /** 范围宽度（X 方向） */
  width: number
  /** 范围深度（Z 方向） */
  depth: number
  centerX: number
  centerZ: number
}

/**
 * 计算场景范围：以画布配置为基准，再外扩覆盖超出画布边界的元素。
 * 空画面时退化为画布尺寸本身，保证地面网格始终可见。
 */
export function computeSceneBounds(
  elements: ElementPlacementSource[],
  canvasConfig: CanvasConfig,
): SceneBounds {
  const base = {
    minX: 0,
    minZ: 0,
    maxX: Math.max(canvasConfig.width, 1),
    maxZ: Math.max(canvasConfig.height, 1),
  }
  let { minX, minZ, maxX, maxZ } = base
  for (const el of elements) {
    minX = Math.min(minX, el.x)
    minZ = Math.min(minZ, el.y)
    maxX = Math.max(maxX, el.x + el.width)
    maxZ = Math.max(maxZ, el.y + el.height)
  }
  return {
    minX,
    minZ,
    maxX,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  }
}

/**
 * 相机取景参数：按场景范围反推一个能看全画面的斜上方机位。
 * 返回相机位置与注视点，resetCamera / 首次取景共用。
 */
export function computeDefaultCamera(bounds: SceneBounds): {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
} {
  const span = Math.max(bounds.width, bounds.depth)
  // 距离系数实测取 0.85：能看全画面且元素不至于缩成一角
  const distance = span * 0.85 + 150
  return {
    position: {
      x: bounds.centerX + distance * 0.45,
      y: distance * 0.62,
      z: bounds.centerZ + distance * 0.7,
    },
    target: { x: bounds.centerX, y: 0, z: bounds.centerZ },
  }
}
