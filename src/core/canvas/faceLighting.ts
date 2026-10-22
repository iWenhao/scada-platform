import type { ViewMode } from '@/types/scada'

/**
 * 2.5D 插画级图元的光照后处理器（规范见 docs/2.5D_ILLUSTRATION_GUIDE.md §4）。
 *
 * 作者只标「面朝向」（`data-face` / `data-edge` / `data-shadow` / `data-pipe`），明暗与
 * 资源样式由这里统一展开。好处是全局光感只有一处定义（FACE_STYLE），不会出现各图元
 * 光源方向不一致。
 *
 * 颜色只有 `currentColor` 一条通道——渐变各段只用 `stop-opacity` 区分明暗，所以状态
 * 变色时不需要重调光照（在 iconImage 的单色替换之前执行一次即可）。接缝与蚀刻线用
 * 半透明黑（`#000000`）压暗，它只是「减光」，不引入第二种颜色。
 *
 * 两种风格共用同一套几何，差别只在「面」怎么上色：
 * - `25d`：面展开为连续渐变、**去掉面自身描边**（描边留着就是线框图），并在片段内部
 *   注入 `<defs>`；接缝分亮/暗两种单独绘制。
 * - `2d` ：面统一平涂，边界交给描边表达，不注入 defs。
 *
 * 未迁移的线条稿图标不含任何 `data-*` 标注，两种模式下都原样返回——迁移可以分批进行，
 * 未迁移的设备观感与改造前完全一致。
 */

/**
 * 面朝向 → 渐变 token；`stops` 是 [位置, stop-opacity] 序列。改这张表 = 改全局光感。
 * 光来自左上方：top 最亮，front 中等，side 最暗；body 是圆柱侧面，带一条偏左的亮带。
 */
const FACE_STYLE = {
  top: {
    kind: 'linear', x1: 0, y1: 0, x2: 0, y2: 1,
    stops: [[0, 0.97], [0.55, 0.86], [1, 0.74]],
  },
  front: {
    kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 0,
    stops: [[0, 0.82], [0.6, 0.56], [1, 0.42]],
  },
  side: {
    kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 0,
    stops: [[0, 0.42], [0.5, 0.27], [1, 0.18]],
  },
  cap: {
    kind: 'radial',
    stops: [[0, 1], [0.55, 0.8], [1, 0.44]],
  },
  body: {
    kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 0,
    stops: [[0, 0.34], [0.28, 0.98], [0.6, 0.62], [1, 0.16]],
  },
  // 横卧圆柱侧面（卧罐、换热器壳体）：亮带在天顶、向下压暗；不能用 body——它的渐变
  // 沿横向走，套在卧式壳体上会变成「沿长度明暗」
  barrel: {
    kind: 'linear', x1: 0, y1: 0, x2: 0, y2: 1,
    stops: [[0, 0.9], [0.16, 0.96], [0.55, 0.62], [0.82, 0.34], [1, 0.14]],
  },
  // 暗孔（进风口、管口）：不参与受光，压到接近背景的暗度
  hole: {
    kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 0,
    stops: [[0, 0.26], [1, 0.1]],
  },
  // 底座台面：水平但处在设备阴影里，比 top 暗一档，避免底座比机器还抢眼
  deck: {
    kind: 'linear', x1: 0, y1: 0, x2: 0, y2: 1,
    stops: [[0, 0.62], [0.6, 0.5], [1, 0.38]],
  },
} as const

type FaceKey = keyof typeof FACE_STYLE

/** 平面风格的面：不分朝向统一平涂，靠描边区分边界（2D 本来就是线稿观感） */
const FLAT_FACE = 'fill="currentColor" fill-opacity="0.18" stroke-opacity="0.85"'

/**
 * 边缘标注：立体风格的体积感靠「面不加描边 + 只画关键棱线与接缝」。
 * hi = 受光的棱线（亮线），lo = 接缝/凹槽（半透明黑压暗）。
 */
const EDGE_HI = 'fill="none" stroke="currentColor" stroke-opacity="1" stroke-width="1.2"'
const EDGE_LO = 'fill="none" stroke="#000000" stroke-opacity="0.3" stroke-width="1.4"'
/** 平面风格：两种棱线都还原成同一粗细的线条稿 */
const FLAT_EDGE = 'fill="none" stroke-opacity="0.8"'

/** 资源标注：两种风格一致，不随光照开关变化（投影是「落地」而非「受光」） */
const GROUND = 'fill="currentColor" fill-opacity="0.05" stroke-opacity="0.22"'
const SHADOW_SOFT = 'fill="url(#lt-shadow)" stroke="none"'
const SHADOW_FLAT = 'fill="#000000" fill-opacity="0.32" stroke="none"'
const PIPE_BASE =
  'fill="none" stroke="currentColor" stroke-opacity="0.85" stroke-width="4.6" stroke-linecap="round"'
const PIPE_HI =
  'fill="none" stroke="currentColor" stroke-opacity="1" stroke-width="1.3" stroke-linecap="round"'

const HAS_ANNOTATION = /data-(?:face|edge|shadow|pipe)="[^"]*"/
/**
 * 带标注的标签整体（一条标签可能同时有 `data-face` 与 `data-edge`，必须整条取出来
 * 一起展开——按属性逐个替换会把同名属性写两遍）。
 */
const ANNOTATED_TAG = /<[a-zA-Z][^>]*\sdata-(?:face|edge|shadow|pipe)="[^"]*"[^>]*>/g
/** 标签内的单个标注：捕获「属性名 / 属性值」用于分派 token */
const ANNOTATION = /\sdata-(face|edge|shadow|pipe)="([^"]*)"/g

function buildDefs(): string {
  const faces = (Object.keys(FACE_STYLE) as FaceKey[])
    .map((key) => {
      const s = FACE_STYLE[key]
      const stops = s.stops
        .map(([o, a]) => `<stop offset="${o}" stop-color="currentColor" stop-opacity="${a}"/>`)
        .join('')
      if (s.kind === 'radial') {
        // 高光偏左上：与 top/front/side 的受光方向一致
        return `<radialGradient id="lt-${key}" cx="0.36" cy="0.3" r="0.72" fx="0.3" fy="0.22">${stops}</radialGradient>`
      }
      return `<linearGradient id="lt-${key}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}">${stops}</linearGradient>`
    })
    .join('')
  // 软投影：硬边椭圆看起来像贴纸，渐变过渡才像落地
  const shadow =
    '<radialGradient id="lt-shadow" cx="0.5" cy="0.5" r="0.6">' +
    '<stop offset="0" stop-color="#000000" stop-opacity="0.62"/>' +
    '<stop offset="0.55" stop-color="#000000" stop-opacity="0.32"/>' +
    '<stop offset="1" stop-color="#000000" stop-opacity="0"/>' +
    '</radialGradient>'
  return `<defs>${faces}${shadow}</defs>`
}

/**
 * 注入到 `<svg>` 开标签之后。
 * 片段会被 `new Image()` 独立光栅化，引用片段外部的 defs 会失效，所以必须写在里面。
 */
function injectAfterOpenTag(svg: string, injected: string): string {
  const open = svg.match(/<svg\b[^>]*>/i)
  if (!open) return injected + svg
  return svg.replace(open[0], open[0] + injected)
}

/** token 串拆成属性对，便于逐条与标签已有属性比对 */
function parseToken(token: string): [string, string][] {
  return [...token.matchAll(/([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]] as [string, string])
}

/** 标注 → 目标属性；null 表示该标注在当前风格下不产出样式（只把标注摘掉） */
function tokenFor(kind: string, value: string, mode: ViewMode): string | null {
  switch (kind) {
    case 'face':
      if (value === 'ground') return GROUND
      if (!(value in FACE_STYLE)) return null
      return mode === '25d' ? `fill="url(#lt-${value})" stroke="none"` : FLAT_FACE
    case 'edge':
      return mode === '25d' ? (value === 'hi' ? EDGE_HI : EDGE_LO) : FLAT_EDGE
    case 'shadow':
      return mode === '25d' ? SHADOW_SOFT : SHADOW_FLAT
    case 'pipe':
      return value === 'hi' ? PIPE_HI : PIPE_BASE
    default:
      return null
  }
}

/**
 * 展开一条标签上的全部标注。
 *
 * **标签上显式写过的属性一律保留**（例如阀门手轮的 `stroke-width="2.4"` 就比默认棱线粗），
 * token 只补没写的那几项。同名属性写两遍是非法 XML——图标走 `data:` URI 交给 `<img>`
 * 光栅化时整个文档解析失败、图形直接空白，上一版 5 台 2.5D 设备不显示就是这个原因。
 */
function expandTag(tag: string, mode: ViewMode): string {
  let out = tag
  for (const [annotation, kind, value] of tag.matchAll(ANNOTATION)) {
    out = out.replace(annotation, '')
    const token = tokenFor(kind, value, mode)
    if (!token) continue
    for (const [name, val] of parseToken(token)) {
      if (out.includes(` ${name}="`)) continue
      // 自闭合标签的结尾是 `/>`，只截掉 `>` 会把斜杠留在属性前面——那是非法 XML
      const tail = out.endsWith('/>') ? '/>' : '>'
      out = out.slice(0, out.length - tail.length) + ` ${name}="${val}"` + tail
    }
  }
  return out
}

/** 按风格展开标注；一条标签可能同时带 `data-face` 与 `data-edge`，所以整条取出处理 */
function expandAnnotations(svg: string, mode: ViewMode): string {
  return svg.replace(ANNOTATED_TAG, (tag) => expandTag(tag, mode))
}

/** 立体风格：面展开为连续渐变（去描边）并注入 defs */
export function bakeLighting(svg: string): string {
  if (!HAS_ANNOTATION.test(svg)) return svg
  return injectAfterOpenTag(expandAnnotations(svg, '25d'), buildDefs())
}

/** 平面风格：面统一平涂、棱线还原成线条稿 */
export function flattenFaces(svg: string): string {
  if (!HAS_ANNOTATION.test(svg)) return svg
  return expandAnnotations(svg, '2d')
}

const styleCache = new Map<string, string>()

/** 按风格产出最终 SVG（`风格|源码` 缓存：字符串扫描比重复展开便宜） */
export function styleIcon(svg: string, mode: ViewMode): string {
  if (!svg || !HAS_ANNOTATION.test(svg)) return svg
  const key = `${mode}|${svg}`
  const hit = styleCache.get(key)
  if (hit !== undefined) return hit
  const styled = mode === '25d' ? bakeLighting(svg) : flattenFaces(svg)
  styleCache.set(key, styled)
  return styled
}
