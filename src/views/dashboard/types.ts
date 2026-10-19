/** 首页项目卡片行 */
export interface ProjectRow {
  name: string
  lastModified: string
  publishedAt: number | null
  pageCount: number
  timestamp: number
  /** 是否有缩略图：列表摘要给出，卡片据此决定是否值得懒加载 */
  hasThumbnail?: boolean
  /** 画布缩略图 data URL，无则用占位示意图（进视口后按需加载填充） */
  thumbnail?: string | null
}
