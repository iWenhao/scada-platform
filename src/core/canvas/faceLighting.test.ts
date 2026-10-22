// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { bakeLighting, flattenFaces, styleIcon } from './faceLighting'

/**
 * 面基图元：作者只标朝向，不写颜色/透明度/渐变。
 * 最后两条分别覆盖「作者显式写了 stroke-width」与「独立的暗色接缝」——
 * 这两条正是上一版产出非法 XML（重复属性）导致设备画成空白的现场。
 */
const FACE_SVG =
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
  '<g fill="none" stroke="currentColor" stroke-width="2">' +
  '<ellipse cx="50" cy="74" rx="33" ry="7" data-shadow="1"/>' +
  '<path d="M22 24 L78 24 L78 72 Z" data-face="front"/>' +
  '<ellipse cx="50" cy="24" rx="28" ry="9" data-face="cap"/>' +
  '<path d="M16 52 H42" data-pipe="base"/>' +
  '<path d="M16 50 H42" data-pipe="hi"/>' +
  '<path d="M20 20 H80" data-edge="hi" stroke-width="2.4"/>' +
  '<path d="M24 60 H76" data-edge="lo"/>' +
  '</g></svg>'

/** 未迁移的线条稿：不含任何标注 */
const LINE_SVG =
  '<svg viewBox="0 0 100 100"><g fill="none" stroke="currentColor">' +
  '<circle cx="50" cy="50" r="20"/></g></svg>'

/** 取第一条包含该片段（通常是 d 属性前缀）的标签原文，用于断言单条标签上的属性 */
function tagOf(out: string, needle: string): string {
  const tag = (out.match(/<[a-zA-Z][^>]*>/g) ?? []).find((t) => t.includes(needle))
  if (!tag) throw new Error(`tag not found: ${needle}`)
  return tag
}

describe('bakeLighting（立体风格）', () => {
  it('面展开为渐变引用并去掉面自身描边——描边留着就又成线框图了', () => {
    const out = bakeLighting(FACE_SVG)
    expect(tagOf(out, 'M22 24')).toContain('fill="url(#lt-front)" stroke="none"')
    expect(out).toContain('fill="url(#lt-cap)"')
    expect(out).not.toContain('data-')
  })

  it('棱线分亮/暗两种单独绘制：亮线用状态色，暗缝用半透明黑压暗', () => {
    const out = bakeLighting(FACE_SVG)
    expect(tagOf(out, 'M20 20 H80')).toContain('stroke="currentColor"')
    expect(tagOf(out, 'M24 60 H76')).toContain('stroke="#000000"')
  })

  it('作者显式写过的属性优先，token 不覆盖也不重复追加（重复属性会让 SVG 解析失败）', () => {
    const hi = tagOf(bakeLighting(FACE_SVG), 'M20 20 H80')
    expect(hi.match(/stroke-width=/g)).toHaveLength(1)
    expect(hi).toContain('stroke-width="2.4"')
  })

  it('defs 写在片段内部（开标签之后、闭标签之前）——片段独立光栅化，引用外部会失效', () => {
    const out = bakeLighting(FACE_SVG)
    expect(out.indexOf('<defs>')).toBeGreaterThan(out.indexOf('<svg'))
    expect(out.indexOf('</defs>')).toBeLessThan(out.lastIndexOf('</svg>'))
  })

  it('面渐变的每一段都只用 currentColor + stop-opacity，换状态色无需重调光照', () => {
    const grads =
      bakeLighting(FACE_SVG).match(/<linearGradient id="lt-(?!shadow)[\s\S]*?<\/linearGradient>|<radialGradient id="lt-(?!shadow)[\s\S]*?<\/radialGradient>/g) ??
      []
    expect(grads.length).toBeGreaterThan(0)
    for (const grad of grads) {
      for (const stop of grad.match(/<stop[^>]*>/g) ?? []) {
        expect(stop).toContain('stop-color="currentColor"')
        expect(stop).toMatch(/stop-opacity="[\d.]+"/)
      }
    }
  })

  it('除接触阴影的 #000000 外没有任何固定色（否则会与状态变色打架）', () => {
    const hexes = new Set(bakeLighting(FACE_SVG).match(/#[0-9a-f]{6}/g) ?? [])
    expect([...hexes]).toEqual(['#000000'])
  })

  it('资源标注注入：接触阴影走软渐变 / 管身 / 管高光', () => {
    const out = bakeLighting(FACE_SVG)
    expect(out).toContain('fill="url(#lt-shadow)"')
    expect(out).toContain('stroke-width="4.6"')
    expect(out).toContain('stroke-width="1.3"')
  })

  it('无标注的线条稿原样返回——迁移可以分批进行，未迁移设备观感不变', () => {
    expect(bakeLighting(LINE_SVG)).toBe(LINE_SVG)
  })
})

describe('flattenFaces（平面风格）', () => {
  it('面统一平涂且保留描边（2D 本就是线稿观感），不引入 defs 与渐变引用', () => {
    const out = flattenFaces(FACE_SVG)
    expect(out).not.toContain('<defs>')
    expect(out).not.toContain('url(#')
    expect(out).not.toContain('data-')
    expect(tagOf(out, 'M22 24')).toContain('fill-opacity="0.18" stroke-opacity="0.85"')
  })

  it('接触阴影在平面风格下是硬边黑块（没有 defs 可引用）', () => {
    expect(flattenFaces(FACE_SVG)).toContain('fill="#000000" fill-opacity="0.32"')
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
