/**
 * 画布缩略图：保存/发布时从 Konva Stage 导出小图，供首页项目卡片展示。
 * 用独立存储键存放，避免把 base64 塞进工程 JSON 撑大文件。
 */
export function captureCanvasThumbnail(pixelRatio = 0.35): string | null {
  const konva = (window as unknown as { Konva?: { stages?: Array<{ toDataURL: (o: unknown) => string }> } })
    .Konva
  const stage = konva?.stages?.[0]
  if (!stage) return null
  try {
    return stage.toDataURL({
      pixelRatio,
      mimeType: 'image/jpeg',
      quality: 0.72,
      x: 0,
      y: 0,
      // 只截画布内容，不含视口空白
      width: undefined,
      height: undefined,
    })
  } catch {
    try {
      return stage.toDataURL({ pixelRatio, mimeType: 'image/png' })
    } catch {
      return null
    }
  }
}

/** 缩略图存储键 */
export function thumbKey(projectName: string): string {
  return `scada_thumb_${projectName}`
}
