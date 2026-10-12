/**
 * 组件图标的内容包围盒测量。
 *
 * 组件定义里的 SVG 一律是 `viewBox="0 0 100 100"` 的方形画布，而图形往往只占其中
 * 一部分（采煤机实际只占 x≈6–94、y≈46–80）。把方形画布等比塞进元素，横向设备
 * 就会被缩成一小条居于中央——实测采煤机拖入 176×96 后可见图形只有 56×23px。
 *
 * 因此需要先测出图形真实占用的范围，再据此收紧 viewBox，让渲染层可以按内容
 * 长宽比做 contain 适配。
 *
 * 测量走离屏 SVG 的 getBBox()，按 SVG 源码缓存；非浏览器环境（单测）拿不到
 * DOM 时返回 null，调用方回退到方形适配，行为与改造前一致。
 */

export interface IconBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 光栅化基准长边。
 * SVG 交给 <img> 后是位图，浏览器按固有尺寸光栅化再拉伸；若只留 viewBox 不收
 * 宽高，浏览器会以 300px 默认框换算，纵向设备只剩 ~100px 宽，放大后发虚。
 * 这里统一给到 512px 长边，兼顾清晰度与内存。
 */
const RASTER_LONG_SIDE = 512

const boundsCache = new Map<string, IconBounds | null>()
const tightenCache = new Map<string, string>()

/** 取 SVG 源码里最大的描边宽度：getBBox 不含描边，需要补偿，否则线条会被切掉一半 */
function maxStrokeWidth(svg: string): number {
  let max = 0
  const re = /stroke-width="([\d.]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg)) !== null) {
    const v = parseFloat(m[1])
    if (Number.isFinite(v) && v > max) max = v
  }
  return max
}

function measure(svg: string): IconBounds | null {
  if (typeof document === 'undefined' || !svg) return null

  let host: HTMLDivElement | null = null
  try {
    host = document.createElement('div')
    // visibility:hidden 而非 display:none——后者不会建立渲染树，getBBox 拿不到几何
    host.setAttribute(
      'style',
      'position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none',
    )
    host.innerHTML = svg
    const svgEl = host.firstElementChild as SVGSVGElement | null
    if (!svgEl || typeof svgEl.getBBox !== 'function') return null

    document.body.appendChild(host)
    const box = svgEl.getBBox()
    if (!box || (!box.width && !box.height)) return null

    const pad = maxStrokeWidth(svg) / 2 + 0.5
    return {
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    }
  } catch {
    return null
  } finally {
    if (host?.parentNode) host.parentNode.removeChild(host)
  }
}

/** 图形内容包围盒（viewBox 用户坐标）；无法测量时返回 null */
export function getIconBounds(svg: string): IconBounds | null {
  const cached = boundsCache.get(svg)
  if (cached !== undefined) return cached
  const result = measure(svg)
  boundsCache.set(svg, result)
  return result
}

/** 内容长宽比（宽/高）；无法测量时返回 null */
export function getIconAspect(svg: string): number | null {
  const b = getIconBounds(svg)
  if (!b || b.height <= 0) return null
  return b.width / b.height
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/** 把 viewBox 收紧到内容包围盒，并给出等比 width/height（见 RASTER_LONG_SIDE 说明） */
function buildTightSvg(svg: string): string {
  const bounds = getIconBounds(svg)
  if (!bounds) return svg

  const x = round2(bounds.x)
  const y = round2(bounds.y)
  const w = round2(bounds.width)
  const h = round2(bounds.height)
  if (!(w > 0) || !(h > 0)) return svg

  const openTagMatch = svg.match(/<svg\b[^>]*>/i)
  if (!openTagMatch) return svg

  const long = Math.max(w, h)
  const rasterW = Math.round((w / long) * RASTER_LONG_SIDE)
  const rasterH = Math.round((h / long) * RASTER_LONG_SIDE)

  // 先清掉原有 viewBox/width/height，再统一写入，避免属性重复
  const openTag = openTagMatch[0]
    .replace(/\s+viewBox="[^"]*"/i, '')
    .replace(/\s+width="[^"]*"/i, '')
    .replace(/\s+height="[^"]*"/i, '')
    .replace(/^<svg/i, `<svg viewBox="${x} ${y} ${w} ${h}" width="${rasterW}" height="${rasterH}"`)

  return svg.replace(openTagMatch[0], openTag)
}

/**
 * 收紧 viewBox 后的 SVG（供转 data URI 渲染）。
 * 内容正好铺满整张图，宽高比与内容一致——渲染层按内容长宽比 contain 即可既不
 * 留白也不变形。测量不可用时原样返回。
 */
export function tightenIconSvg(svg: string): string {
  const cached = tightenCache.get(svg)
  if (cached !== undefined) return cached
  const result = buildTightSvg(svg)
  tightenCache.set(svg, result)
  return result
}
