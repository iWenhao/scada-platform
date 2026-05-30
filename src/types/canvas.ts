/** 画布配置 */
export interface CanvasConfig {
  /** 画布宽度（像素） */
  width: number
  
  /** 画布高度（像素） */
  height: number
  
  /** 背景颜色 */
  backgroundColor: string
  
  /** 是否显示网格 */
  showGrid: boolean
  
  /** 网格大小（像素） */
  gridSize: number
  
  /** 网格颜色 */
  gridColor: string
  
  /** 是否启用缩放 */
  enableZoom: boolean
  
  /** 最小缩放比例 */
  minZoom: number
  
  /** 最大缩放比例 */
  maxZoom: number
  
  /** 是否启用平移 */
  enablePan: boolean
}

/** 默认画布配置 */
export const defaultCanvasConfig: CanvasConfig = {
  width: 1920,
  height: 1080,
  backgroundColor: '#1e1e1e',
  showGrid: true,
  gridSize: 20,
  gridColor: '#2a2a2a',
  enableZoom: true,
  minZoom: 0.1,
  maxZoom: 5,
  enablePan: true,
}
