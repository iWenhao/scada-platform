// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getIconBounds, getIconAspect, tightenIconSvg } from './iconBounds'

const SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="currentColor" stroke-width="2.6">
    <line x1="6" y1="80" x2="94" y2="80" />
    <rect x="38" y="46" width="24" height="26" />
  </g>
</svg>`

describe('iconBounds 测量失败时的降级', () => {
  // 单测环境没有真实 SVG 渲染能力（getBBox 不可用），测量必须安全降级，
  // 让渲染层回退到方形适配——不能抛错，也不能返回半截数据把图标画歪。
  it('无法测量时返回 null', () => {
    expect(getIconBounds(SVG)).toBeNull()
    expect(getIconAspect(SVG)).toBeNull()
  })

  it('无法测量时 tightenIconSvg 原样返回', () => {
    expect(tightenIconSvg(SVG)).toBe(SVG)
  })

  it('空字符串不抛错', () => {
    expect(getIconBounds('')).toBeNull()
    expect(tightenIconSvg('')).toBe('')
  })
})
