/** 画布配置 */
export interface CanvasConfig {
  /** 画布宽度（像素） */
  width: number
  
  /** 画布高度（像素） */
  height: number
  
  /** 背景颜色；空串 = 未自定义，跟随主题变量 --bg-canvas */
  backgroundColor: string
  
  /** 是否显示网格 */
  showGrid: boolean
  
  /** 网格大小（像素） */
  gridSize: number
  
  /** 网格颜色；空串 = 未自定义，跟随主题变量 --grid-color */
  gridColor: string

  /** 是否启用网格吸附（拖动时对齐网格） */
  snapToGrid: boolean

  /** 是否启用缩放 */
  enableZoom: boolean
  
  /** 最小缩放比例 */
  minZoom: number
  
  /** 最大缩放比例 */
  maxZoom: number
  
  /** 是否启用平移 */
  enablePan: boolean
}

/** 默认画布配置（底色/网格色留空，跟随亮暗主题的 CSS 变量） */
export const defaultCanvasConfig: CanvasConfig = {
  width: 1920,
  height: 1080,
  backgroundColor: '',
  showGrid: true,
  gridSize: 20,
  gridColor: '',
  snapToGrid: true,
  enableZoom: true,
  minZoom: 0.1,
  maxZoom: 5,
  enablePan: true,
}

// 主题化改造前的暗色默认值：老工程把它们当普通配置持久化进了 canvasConfig，
// 语义上等价于「未自定义」，加载时迁移为空串，否则内联样式会一直盖住主题变量
const LEGACY_BACKGROUND = '#1e1e1e'
const LEGACY_GRID_COLOR = '#2a2a2a'

/**
 * 加载侧归一化（编辑器/预览所有装载数据的入口共用）：合并默认值，
 * 并把旧版写死的底色/网格色迁移为空串（跟随主题）。用户显式选过的
 * 其它颜色原样保留；幂等，可对已归一化的数据重复调用。
 */
export function normalizeCanvasConfig(raw?: Partial<CanvasConfig> | null): CanvasConfig {
  const merged: CanvasConfig = { ...defaultCanvasConfig, ...(raw || {}) }
  const unlegacy = (color: string, legacyValue: string) =>
    (color || '').trim().toLowerCase() === legacyValue ? '' : (color || '')
  merged.backgroundColor = unlegacy(merged.backgroundColor, LEGACY_BACKGROUND)
  merged.gridColor = unlegacy(merged.gridColor, LEGACY_GRID_COLOR)
  return merged
}
