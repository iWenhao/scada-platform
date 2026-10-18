// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  LOGO_ART,
  buildBannerModel,
  displayWidth,
  renderAnsi,
  renderPlain,
  supportsColor,
} from './consoleBanner.mjs'

const DETAILS = [
  'Stack:    Vue 3 · TypeScript · Vite',
  'Graphics: Konva.js · vue-konva · Three.js',
]
const INFO = {
  title: 'SCADA Platform',
  subtitle: '工业组态可视化平台',
  version: '9.9.9',
  details: DETAILS,
}
/** ESC 字符运行时构造：源码里不写真实控制字符，也不写转义字面量 */
const ESC = String.fromCharCode(27)

/** 取左侧 LOGO 分区的文本：按显示宽度截取，分区之间的填充空格不算进来 */
function logoZone(row: { spans: { text: string }[] }): string {
  let text = ''
  for (const span of row.spans) {
    if (displayWidth(text) >= LOGO_ART[0].length) break
    text += span.text
  }
  return text.slice(0, LOGO_ART[0].length)
}

describe('consoleBanner 核心（前端/后端共用）', () => {
  it('LOGO 源数据每行等宽，背景用空格而非句点', () => {
    expect(LOGO_ART.length).toBeGreaterThan(0)
    const width = LOGO_ART[0].length
    for (const line of LOGO_ART) {
      expect([...line].length).toBe(width)
      expect(line).toMatch(/^[ab ]+$/)
    }
    // 句点在控制台是可见圆点，会把 LOGO 打成散点，背景必须为空格
    expect(LOGO_ART.join('')).not.toContain('.')
  })

  it('LOGO 在模型里译成块字符，不残留字母标记，且每行等宽', () => {
    const rows = buildBannerModel(INFO).rows.slice(0, LOGO_ART.length)
    expect(rows).toHaveLength(LOGO_ART.length)
    for (const row of rows) {
      const zone = logoZone(row)
      expect([...zone].length).toBe(LOGO_ART[0].length)
      // 只允许描边 █、填充 ▒ 与背景空格：字母标记必须在成模型时译掉
      expect(zone).toMatch(/^[█▒ ]*$/)
    }
    const zone = logoZone(rows[1])
    expect(zone).toContain('█')
    expect(zone).toContain('▒')
  })

  it('纯文本包含名称/副标题/版本、信息栏与提示符', () => {
    const plain = renderPlain(buildBannerModel(INFO))
    expect(plain).toContain('SCADA Platform')
    expect(plain).toContain('工业组态可视化平台')
    expect(plain).toContain('v9.9.9')
    expect(plain).toContain('Stack:')
    expect(plain).toContain('visitor@SCADA Platform')
    expect(plain).toContain('Star ⭐')
    // 装饰性彩条已移除：无数据支撑的渐变条属于误导性装饰，不该留在信息栏里
    expect(plain).not.toContain('Signal:')
  })

  it('底部引导语中英各一行（拼一行会超 130 显示列、终端折行）', () => {
    const lines = renderPlain(buildBannerModel(INFO)).split('\n')
    const english = lines.find((l) => l.startsWith('If '))
    const chinese = lines.find((l) => l.startsWith('如果 '))
    expect(english).toBeDefined()
    expect(chinese).toBeDefined()
    // 中文行不能太长：CJK 按 2 列算，整行控制在 100 列内
    expect(displayWidth(chinese!)).toBeLessThan(100)
  })

  it('提示符用户名可覆盖（后端用来区分进程）', () => {
    const plain = renderPlain(buildBannerModel({ ...INFO, prompt: 'node' }))
    expect(plain).toContain('node@SCADA Platform')
    expect(plain).not.toContain('visitor@')
  })

  it('信息栏按显示列对齐（与名称区同行的行也不会被推歪）', () => {
    const info = { ...INFO, details: ['Stack:    a', 'Graphics: b', 'UI:       c'] }
    const lines = renderPlain(buildBannerModel(info)).split('\n')
    const columns = ['Stack:', 'Graphics:', 'UI:'].map((label) => {
      const row = lines.find((l) => l.includes(label))
      expect(row, `缺少信息行：${label}`).toBeDefined()
      // 前缀里可能有中文副标题，必须按显示宽度算列数而不是字符串长度
      return displayWidth(row!.slice(0, row!.indexOf(label)))
    })
    expect(new Set(columns).size).toBe(1)
  })

  it('ANSI 渲染只在着色段加转义序列，去掉转义后与纯文本逐字一致', () => {
    const model = buildBannerModel(INFO)
    const plain = renderPlain(model)
    const ansi = renderAnsi(model)
    expect(plain).not.toContain(ESC)
    expect(ansi).toContain(ESC)
    // 颜色码形如 ESC[38;2;R;G;Bm，中间是分号分隔的多个数字
    expect(ansi.replace(new RegExp(`${ESC}\\[[\\d;]*m`, 'g'), '')).toBe(plain)
  })

  it('品牌色两端同源：logoEdge #00d4aa、title #5ef57a', () => {
    const ansi = renderAnsi(buildBannerModel(INFO))
    expect(ansi).toContain(`${ESC}[38;2;0;212;170m`)
    expect(ansi).toContain(`${ESC}[38;2;94;245;122m`)
  })

  it('supportsColor 尊重 NO_COLOR（无色环境降级，避免乱码）', () => {
    const before = process.env.NO_COLOR
    process.env.NO_COLOR = '1'
    expect(supportsColor()).toBe(false)
    if (before === undefined) delete process.env.NO_COLOR
    else process.env.NO_COLOR = before
    // FORCE_COLOR 优先于 TTY 判定，便于重定向到文件时保留颜色
    expect(typeof supportsColor()).toBe('boolean')
  })
})