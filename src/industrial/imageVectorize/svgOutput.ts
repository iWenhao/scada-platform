/**
 * 图片转 SVG 的产物装配与着色。
 *
 * 两种产物共用一条「标准图元」口径：
 * - 原图内嵌：`<image href="data:image/webp;base64,…">`，保真但不随状态变色；
 * - 单色描摹：把描摹结果里的每层颜色换算成 `currentColor` + `fill-opacity`，
 *   既能随状态变色，又保留明暗层次（纯单色剪影会让设备细节全糊成一块）。
 *
 * 输出 viewBox 统一缩放到最长边 100，与内置图元的 100×100 坐标系对齐——
 * 这样对话框自动带出的元素宽高不会变成几百像素。
 */

export interface EmbeddedImageInput {
  width: number
  height: number
  mime: string
  base64: string
}

export interface TracedSvgOptions {
  /** 白色是背景（照片白底）→ 丢弃近白层；否则白色是图形本体 → 保留为浅色层 */
  whiteIsBackground: boolean
}

const VIEWBOX_MAX = 100
const NEAR_WHITE = 0.9

function round(n: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(n * factor) / factor
}

function displaySize(width: number, height: number): { width: number; height: number; scale: number } {
  const scale = VIEWBOX_MAX / Math.max(width, height)
  return { width: round(width * scale), height: round(height * scale), scale }
}

export function buildEmbeddedSvg(input: EmbeddedImageInput): string {
  const size = displaySize(input.width, input.height)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.width} ${size.height}">` +
    `<image href="data:${input.mime};base64,${input.base64}" width="${size.width}" height="${size.height}"/>` +
    '</svg>'
  )
}

function attr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return match ? match[1] : null
}

function parseColor(value: string): [number, number, number] | null {
  const rgb = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const raw = hex[1]
    if (raw.length === 3) {
      return [parseInt(raw[0] + raw[0], 16), parseInt(raw[1] + raw[1], 16), parseInt(raw[2] + raw[2], 16)]
    }
    return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)]
  }
  return null
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/**
 * 明暗 → 不透明度：越接近白色越淡，深色实体接近不透明。
 *
 * 下限不能太低：画布是深色底，0.1 级别的淡层会直接消失在背景里，整张图只剩一个剪影。
 * 保留 0.32 的下限能让中间调在深底上仍然可辨，同时有状态换色时层次还在。
 */
function opacityForLuminance(lum: number, whiteIsBackground: boolean): number {
  if (lum >= NEAR_WHITE) return whiteIsBackground ? 0 : 0.45
  const t = Math.min(1, Math.max(0, (0.95 - lum) / 0.95))
  return Math.max(0.32, round(0.32 + t * 0.66))
}

/**
 * 把 ImageTracer 的产物改写成平台可用的单色层叠 SVG。
 *
 * 只处理 `<path>`：ImageTracer 输出的 fill/stroke/opacity 都是它自己的调色板口径，
 * 原样保留会同时出现描边加重、透明度叠加两重失真。这里只留 `d`，颜色由 `currentColor`
 * 统一接管。近白层是否丢弃取决于调用方给出的 `whiteIsBackground`——照片白底要去，
 * 白底上的浅色设备图不能去。
 */
export function colorizeTracedSvg(svg: string, options: TracedSvgOptions): string {
  const root = svg.match(/<svg\b([^>]*)>/i)
  if (!root) return ''
  const width = Number(attr(root[1], 'width'))
  const height = Number(attr(root[1], 'height'))
  if (!(width > 0) || !(height > 0)) return ''

  const paths: string[] = []
  const pathRe = /<path\b([^>]*?)\/>/g
  let match: RegExpExecArray | null
  while ((match = pathRe.exec(svg)) !== null) {
    const attrs = match[1]
    const d = attr(attrs, 'd')
    const fill = attr(attrs, 'fill')
    if (!d || !fill || fill === 'none') continue
    const color = parseColor(fill)
    if (!color) continue
    const lum = luminance(color[0], color[1], color[2])
    const opacity = opacityForLuminance(lum, options.whiteIsBackground)
    if (opacity <= 0) continue
    paths.push(`<path fill="currentColor" fill-opacity="${opacity}" d="${d}"/>`)
  }
  if (!paths.length) return ''

  const size = displaySize(width, height)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.width} ${size.height}">` +
    `<g transform="scale(${round(size.scale, 6)})">${paths.join('')}</g>` +
    '</svg>'
  )
}

export function svgByteLength(svg: string): number {
  return new TextEncoder().encode(svg).length
}
