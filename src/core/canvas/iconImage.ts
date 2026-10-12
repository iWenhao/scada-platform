import type { ViewMode } from '@/types/scada'
import { styleIcon } from './faceLighting'

const cache = new Map<string, HTMLImageElement>()

/**
 * 把组件的 SVG 图标渲染为 Konva 可用的图片对象（按类型 + 颜色 + 渲染风格缓存）
 *
 * 处理顺序不能颠倒：先按风格展开光照（面基图元 → 渐变或平涂 + defs），再替换
 * `currentColor`。因为渐变的 stop 用的就是 `currentColor`，替换后整张图的明暗会随
 * 状态色整体变化——换状态色不需要重调光照。
 *
 * 缓存键必须带风格：同一个 type + color 在 2D / 2.5D 下的 SVG 并不相同。
 * 浏览器异步解码，加载完成前返回 undefined，加载完成后通过 onLoad 通知调用方重绘。
 */
export function getIconImage(
  type: string,
  svg: string,
  color: string,
  mode: ViewMode,
  onLoad?: () => void,
): HTMLImageElement | undefined {
  if (!svg) return undefined

  const key = `${type}|${color}|${mode}`
  const cached = cache.get(key)
  if (cached) {
    return cached.complete && cached.naturalWidth > 0 ? cached : undefined
  }

  const styled = styleIcon(svg, mode)
  const img = new Image()
  img.onload = () => onLoad?.()
  img.onerror = () => cache.delete(key)
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    styled.split('currentColor').join(color),
  )}`
  cache.set(key, img)
  return undefined
}
