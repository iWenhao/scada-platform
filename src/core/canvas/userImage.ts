const cache = new Map<string, HTMLImageElement>()

/**
 * 加载用户配置的图片（URL 或 data:URL）为 Konva 可用的 Image。
 * 失败不缓存，便于修改地址后重试。
 */
export function loadUserImage(
  url: string,
  onLoad?: () => void,
): HTMLImageElement | undefined {
  if (!url) return undefined
  const cached = cache.get(url)
  if (cached) {
    return cached.complete && cached.naturalWidth > 0 ? cached : undefined
  }
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => onLoad?.()
  img.onerror = () => cache.delete(url)
  img.src = url
  cache.set(url, img)
  return undefined
}

/** 计算 contain / cover / fill 的绘制矩形 */
export function fitRect(
  img: HTMLImageElement,
  box: { width: number; height: number },
  fit: 'contain' | 'cover' | 'fill' = 'contain',
): { x: number; y: number; width: number; height: number } {
  const { width: bw, height: bh } = box
  if (fit === 'fill') return { x: 0, y: 0, width: bw, height: bh }
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return { x: 0, y: 0, width: bw, height: bh }

  const scale =
    fit === 'cover'
      ? Math.max(bw / iw, bh / ih)
      : Math.min(bw / iw, bh / ih)
  const width = iw * scale
  const height = ih * scale
  return {
    x: (bw - width) / 2,
    y: (bh - height) / 2,
    width,
    height,
  }
}
