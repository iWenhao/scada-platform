// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildCustomStatusRules,
  defaultCustomStates,
  normalizeCustomIconSvg,
  parseCustomStates,
  parseSvgSize,
} from './customComponent'

describe('parseSvgSize', () => {
  it('优先取 viewBox 的后两位', () => {
    expect(parseSvgSize('<svg viewBox="0 0 120 64"></svg>')).toEqual({ width: 120, height: 64 })
  })

  it('viewBox 缺失时回退 width/height 属性', () => {
    expect(parseSvgSize('<svg width="96" height="48"></svg>')).toEqual({ width: 96, height: 48 })
  })

  it('宽高被夹到合法区间', () => {
    expect(parseSvgSize('<svg viewBox="0 0 5 900"></svg>')).toEqual({ width: 20, height: 400 })
  })

  it('读不出来返回 null（由对话框保留原值）', () => {
    expect(parseSvgSize('<svg></svg>')).toBeNull()
    expect(parseSvgSize('')).toBeNull()
  })
})

describe('normalizeCustomIconSvg', () => {
  it('给 id 加前缀并同步改掉引用', () => {
    const src =
      '<svg viewBox="0 0 10 10"><defs><linearGradient id="g1"/></defs><rect fill="url(#g1)"/><use href="#g1"/></svg>'
    const { svg } = normalizeCustomIconSvg(src, 'custom_1')
    expect(svg).toContain('id="custom_1-g1"')
    expect(svg).toContain('url(#custom_1-g1)')
    expect(svg).toContain('href="#custom_1-g1"')
    // 不能有悬空引用：旧 id 一个都不该剩下
    expect(svg).not.toMatch(/url\(#g1\)/)
  })

  it('xlink:href 转成 href', () => {
    const { svg } = normalizeCustomIconSvg(
      '<svg viewBox="0 0 10 10"><defs><g id="a"/></defs><use xlink:href="#a"/></svg>',
      'p',
    )
    expect(svg).toContain('href="#p-a"')
    expect(svg).not.toContain('xlink:href')
  })

  it('去掉脚本与事件属性', () => {
    const src = '<svg viewBox="0 0 1 1" onload="alert(1)"><script>alert(2)</script><rect/></svg>'
    const { svg } = normalizeCustomIconSvg(src, 'p')
    expect(svg).not.toContain('onload')
    expect(svg).not.toContain('<script')
  })

  it('没有 currentColor 时给出告警但不阻断', () => {
    const { warnings } = normalizeCustomIconSvg('<svg viewBox="0 0 1 1"><rect fill="#fff"/></svg>', 'p')
    expect(warnings.join()).toContain('currentColor')
  })

  it('有 currentColor 时不告警', () => {
    const { warnings } = normalizeCustomIconSvg(
      '<svg viewBox="0 0 1 1"><rect stroke="currentColor"/></svg>',
      'p',
    )
    expect(warnings).toEqual([])
  })

  it('没有 svg 标签时判为不可用', () => {
    const { svg, warnings } = normalizeCustomIconSvg('<div>hello</div>', 'p')
    expect(svg).toBe('')
    expect(warnings.join()).toContain('<svg>')
  })
})

describe('buildCustomStatusRules', () => {
  it('数组顺序即优先级（自上而下第一条命中即生效）', () => {
    const rules = buildCustomStatusRules(defaultCustomStates())
    expect(rules.map((r) => r.priority)).toEqual([1, 2, 3])
    expect(rules[0].name).toBe('故障')
    expect(rules[0].severity).toBe('critical')
  })

  it('故障档显式带 stopMotion', () => {
    const rules = buildCustomStatusRules(defaultCustomStates())
    expect(rules.find((r) => r.name === '故障')?.stopMotion).toBe(true)
    expect(rules.find((r) => r.name === '运行')?.stopMotion).toBe(false)
  })

  it('跳过没填名字或变量的行，并重排优先级', () => {
    const rules = buildCustomStatusRules([
      { name: '', variable: 'state', operator: '=', value: 1, color: '#000', severity: 'normal', stopMotion: false },
      { name: '高温', variable: 'temp', operator: '>', value: 80, color: '#f00', severity: 'critical', stopMotion: true },
    ])
    expect(rules).toHaveLength(1)
    expect(rules[0].priority).toBe(2)
  })
})

describe('parseCustomStates', () => {
  it('与 buildCustomStatusRules 往返一致', () => {
    const rows = defaultCustomStates()
    expect(parseCustomStates(buildCustomStatusRules(rows))).toEqual(rows)
  })

  it('规则为空时回退默认三档', () => {
    expect(parseCustomStates([])).toEqual(defaultCustomStates())
  })
})
