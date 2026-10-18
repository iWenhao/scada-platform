// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { bakeLighting, flattenFaces, styleIcon } from './faceLighting'

/** 面基图元：作者只标朝向，不写颜色/透明度/渐变 */
const FACE_SVG =
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
  '<g fill="none" stroke="currentColor" stroke-width="2">' +
  '<ellipse cx="50" cy="74" rx="33" ry="7" data-shadow="1"/>' +
  '<path d="M22 24 L78 24 L78 72 Z" data-face="front"/>' +
  '<ellipse cx="50" cy="24" rx="28" ry="9" data-face="cap"/>' +
  '<path d="M16 52 H42" data-pipe="base"/>' +
  '<path d="M16 50 H42" data-pipe="hi"/>' +
  '</g></svg>'

/** 未迁移的线条稿：不含任何标注 */
const LINE_SVG =
  '<svg viewBox="0 0 100 100"><g fill="none" stroke="currentColor">' +
  '<circle cx="50" cy="50" r="20"/></g></svg>'

describe('bakeLighting（立体风格）', () => {
  it('面标注展开为渐变引用，且不留 data-* 痕迹', () => {
    const out = bakeLighting(FACE_SVG)
    expect(out).toContain('fill="url(#lt-front)"')
    expect(out).toContain('fill="url(#lt-cap)"')
    expect(out).not.toContain('data-')
  })

  it('defs 写在片段内部（开标签之后、闭标签之前）——片段独立光栅化，引用外部会失效', () => {
    const out = bakeLighting(FACE_SVG)
    expect(out.indexOf('<defs>')).toBeGreaterThan(out.indexOf('<svg'))
    expect(out.indexOf('</defs>')).toBeLessThan(out.lastIndexOf('</svg>'))
  })

  it('渐变两端只用 currentColor + stop-opacity，换状态色无需重调光照', () => {
    const out = bakeLighting(FACE_SVG)
    const stops = out.match(/<stop[^>]*>/g) ?? []
    expect(stops).toHaveLength(8)
    for (const stop of stops) {
      expect(stop).toContain('stop-color="currentColor"')
      expect(stop).toMatch(/stop-opacity="[\d.]+"/)
    }
  })

  it('除接触阴影的 #000000 外没有任何固定色（否则会与状态变色打架）', () => {
    const out = bakeLighting(FACE_SVG)
    const hexes = new Set(out.match(/#[0-9a-fA-F]{3,8}/g) ?? [])
    expect([...hexes]).toEqual(['#000000'])
  })

  it('资源标注注入：接触阴影 / 管身 / 管高光', () => {
    const out = bakeLighting(FACE_SVG)
    expect(out).toContain('fill="#000000"')
    expect(out).toContain('stroke-width="4.6"')
    expect(out).toContain('stroke-width="1.3"')
  })

  it('无标注的线条稿原样返回——迁移可以分批进行，未迁移设备观感不变', () => {
    expect(bakeLighting(LINE_SVG)).toBe(LINE_SVG)
  })
})

describe('flattenFaces（平面风格）', () => {
  it('面统一平涂，不引入 defs 与渐变引用', () => {
    const out = flattenFaces(FACE_SVG)
    expect(out).not.toContain('<defs>')
    expect(out).not.toContain('url(#')
    expect(out).not.toContain('data-')
    expect(out).toContain('fill-opacity="0.18"')
  })

  it('无标注的线条稿原样返回', () => {
    expect(flattenFaces(LINE_SVG)).toBe(LINE_SVG)
  })
})

describe('styleIcon', () => {
  it('同一源码在两种风格下产出不同结果，且各自命中缓存稳定', () => {
    const solid = styleIcon(FACE_SVG, '25d')
    const flat = styleIcon(FACE_SVG, '2d')
    expect(solid).not.toBe(flat)
    expect(styleIcon(FACE_SVG, '25d')).toBe(solid)
    expect(styleIcon(FACE_SVG, '2d')).toBe(flat)
  })

  it('空源码安全返回', () => {
    expect(styleIcon('', '25d')).toBe('')
  })
})
