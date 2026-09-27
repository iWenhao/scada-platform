const cache = new Map<string, HTMLImageElement>()

/**
 * 把组件的 SVG 图标渲染为 Konva 可用的图片对象（按类型+颜色缓存）
 *
 * SVG 中的 currentColor 会被替换为指定颜色；浏览器异步解码，
 * 加载完成前返回 undefined，加载完成后通过 onLoad 通知调用方重绘。
 */
export function getIconImage(
  type: string,
  svg: string,
  color: string,
  onLoad?: () => void,
): HTMLImageElement | undefined {
  if (!svg) return undefined

  const key = `${type}|${color}`
  const cached = cache.get(key)
  if (cached) {
    return cached.complete && cached.naturalWidth > 0 ? cached : undefined
  }

  const img = new Image()
  img.onload = () => onLoad?.()
  img.onerror = () => cache.delete(key)
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svg.split('currentColor').join(color),
  )}`
  cache.set(key, img)
  return undefined
}
