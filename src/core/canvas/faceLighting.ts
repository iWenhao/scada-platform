import type { ViewMode } from '@/types/scada'

/**
 * 2.5D 插画级图元的光照后处理器（规范见 docs/2.5D_ILLUSTRATION_GUIDE.md §4）。
 *
 * 作者只标「面朝向」（`data-face` / `data-shadow` / `data-pipe`），明暗与资源样式由这里
 * 统一展开。好处是全局光感只有一处定义（FACE_STYLE），不会出现各图元光源方向不一致。
 *
 * 颜色只有 `currentColor` 一条通道——渐变两端只用 `stop-opacity` 区分明暗，所以状态
 * 变色时不需要重调光照（在 iconImage 的单色替换之前执行一次即可）。
 *
 * 两种风格共用同一套几何，差别只在「面」怎么上色：
 * - `25d`：面按 FACE_STYLE 展开为连续渐变，并在片段内部注入 `<defs>`；
 * - `2d` ：面统一平涂，边界交给描边表达，不注入 defs。
 *
 * 未迁移的线条稿图标不含任何 `data-*` 标注，两种模式下都原样返回——迁移可以分批进行，
 * 未迁移的设备观感与改造前完全一致。
 */

/**
 * 面朝向 → 渐变 token；`a` / `b` 是渐变两端的 stop-opacity。
 * 改这张表 = 改全局光感，不要在单个图元里覆盖。光来自左上方。
 */
const FACE_STYLE = {
  top: { kind: 'linear', a: 0.9, b: 0.62, x1: 0, y1: 0, x2: 0, y2: 1 },
  front: { kind: 'linear', a: 0.72, b: 0.4, x1: 0, y1: 0, x2: 1, y2: 0 },
  side: { kind: 'linear', a: 0.4, b: 0.18, x1: 0, y1: 0, x2: 1, y2: 0 },
  cap: { kind: 'radial', a: 1, b: 0.5 },
} as const

type FaceKey = keyof typeof FACE_STYLE

/** 平面风格的面：不分朝向统一平涂，靠描边区分边界 */
const FLAT_FACE = 'fill="currentColor" fill-opacity="0.18" stroke-opacity="0.85"'

/** 资源标注：两种风格一致，不随光照开关变化（投影是「落地」而非「受光」） */
const GROUND = 'fill="currentColor" fill-opacity="0.05" stroke-opacity="0.22"'
const SHADOW = 'fill="#000000" fill-opacity="0.42" stroke="none"'
const PIPE_BASE =
  'stroke="currentColor" stroke-opacity="0.85" stroke-width="4.6" stroke-linecap="round"'
const PIPE_HI =
  'stroke="currentColor" stroke-opacity="1" stroke-width="1.3" stroke-linecap="round"'

const FACE_ATTR = /\sdata-face="(top|front|side|cap)"/g
/** 是否有需要展开的标注；线条稿没有，直接短路返回（避免无谓的字符串扫描与 defs 注入） */
const HAS_ANNOTATION = /data-(?:face|shadow|pipe)="/

function buildDefs(): string {
  const defs = (Object.keys(FACE_STYLE) as FaceKey[])
    .map((key) => {
      const s = FACE_STYLE[key]
      const stops =
        `<stop offset="0" stop-color="currentColor" stop-opacity="${s.a.toFixed(2)}"/>` +
        `<stop offset="1" stop-color="currentColor" stop-opacity="${s.b.toFixed(2)}"/>`
      return s.kind === 'radial'
        ? `<radialGradient id="lt-${key}" cx="0.34" cy="0.28" r="0.8">${stops}</radialGradient>`
        : `<linearGradient id="lt-${key}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}">` +
            `${stops}</linearGradient>`
    })
    .join('')
  return `<defs>${defs}</defs>`
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

/** 展开与光照无关的资源标注：地面 / 接触阴影 / 管道本体与高光 */
function expandResources(svg: string): string {
  return svg
    .replace(/\sdata-face="ground"/g, ' ' + GROUND)
    .replace(/\sdata-shadow="1"/g, ' ' + SHADOW)
    .replace(/\sdata-pipe="base"/g, ' ' + PIPE_BASE)
    .replace(/\sdata-pipe="hi"/g, ' ' + PIPE_HI)
}

/** 立体风格：面展开为连续渐变并注入 defs */
export function bakeLighting(svg: string): string {
  if (!HAS_ANNOTATION.test(svg)) return svg
  const body = expandResources(svg).replace(
    FACE_ATTR,
    (_m, key: FaceKey) => ` fill="url(#lt-${key})" stroke-opacity="0.45"`,
  )
  return injectAfterOpenTag(body, buildDefs())
}

/** 平面风格：面统一平涂 */
export function flattenFaces(svg: string): string {
  if (!HAS_ANNOTATION.test(svg)) return svg
  return expandResources(svg).replace(FACE_ATTR, ' ' + FLAT_FACE)
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
