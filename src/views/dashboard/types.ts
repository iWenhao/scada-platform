/** 首页项目卡片行 */
export interface ProjectRow {
  name: string
  lastModified: string
  publishedAt: number | null
  pageCount: number
  timestamp: number
  /** 画布缩略图 data URL，无则用占位示意图 */
  thumbnail?: string | null
}
