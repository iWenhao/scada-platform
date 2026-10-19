// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildCustomStatusRules,
  CUSTOM_SVG_MAX_BYTES,
  defaultCustomStates,
  normalizeCustomIconSvg,
  parseCustomStates,
  parseSvgSize,
  validateSvgUpload,
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

describe('validateSvgUpload', () => {
  const ok = { name: 'fan.svg', type: 'image/svg+xml', size: 2048 }

  it('合法 SVG 通过', () => {
    expect(validateSvgUpload(ok)).toBeNull()
  })

  it('位图被拒（没有 currentColor，无法随状态变色）', () => {
    expect(validateSvgUpload({ name: 'fan.png', type: 'image/png', size: 2048 })).toContain('只支持 SVG')
    expect(validateSvgUpload({ name: 'fan.jpg', type: 'image/jpeg', size: 2048 })).toContain('只支持 SVG')
  })

  it('MIME 缺失/是 text-xml 时按扩展名放行（设计工具的常见导出）', () => {
    expect(validateSvgUpload({ name: 'fan.svg', type: '', size: 2048 })).toBeNull()
    expect(validateSvgUpload({ name: 'fan.svg', type: 'text/xml', size: 2048 })).toBeNull()
  })

  it('改扩展名的位图能过类型关，但由内容闸门拦住（两段式）', () => {
    // 扩展名说 svg、MIME 说 png：按扩展名放行，交给 normalizeCustomIconSvg 的内容校验
    expect(validateSvgUpload({ name: 'fake.svg', type: 'image/png', size: 2048 })).toBeNull()
    const { svg, warnings } = normalizeCustomIconSvg('\x89PNG\x00\x1af\x98binary garbage', 'p')
    expect(svg).toBe('')
    expect(warnings[0]).toContain('<svg>')
  })

  it('空文件与超体积被拒', () => {
    expect(validateSvgUpload({ name: 'fan.svg', type: 'image/svg+xml', size: 0 })).toContain('空')
    const big = { name: 'fan.svg', type: 'image/svg+xml', size: CUSTOM_SVG_MAX_BYTES + 1 }
    expect(validateSvgUpload(big)).toContain('100KB')
    // 边界值本身放行
    expect(validateSvgUpload({ name: 'fan.svg', type: 'image/svg+xml', size: CUSTOM_SVG_MAX_BYTES })).toBeNull()
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

describe('normalizeCustomIconSvg 片段模式（旋转部件）', () => {
  it('片段能过校验并加 id 前缀', () => {
    const { svg, warnings } = normalizeCustomIconSvg(
      '<circle cx="50" cy="50" r="14" stroke="currentColor" fill="none" />',
      'custom_1-rotor',
      { fragment: true },
    )
    expect(svg).toContain('<circle')
    expect(warnings).toEqual([])
  })

  it('片段里的 id 与引用同样被前缀化', () => {
    const { svg } = normalizeCustomIconSvg(
      '<g id="blade"><path d="M0 0 L10 10"/></g><use href="#blade"/>',
      'p-rotor',
      { fragment: true },
    )
    expect(svg).toContain('id="p-rotor-blade"')
    expect(svg).toContain('href="#p-rotor-blade"')
  })

  it('带了 <svg> 外壳反而被拒（消费侧 wrapFragment 会包壳，不需要外层）', () => {
    const { svg, warnings } = normalizeCustomIconSvg(
      '<svg viewBox="0 0 10 10"><circle r="4"/></svg>',
      'p',
      { fragment: true },
    )
    expect(svg).toBe('')
    expect(warnings[0]).toContain('不要带')
  })

  it('空片段返回空并给出原因（调用方必须拦，不能静默丢弃）', () => {
    expect(normalizeCustomIconSvg('   ', 'p', { fragment: true }).svg).toBe('')
    expect(normalizeCustomIconSvg('', 'p', { fragment: true }).warnings[0]).toContain('为空')
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
