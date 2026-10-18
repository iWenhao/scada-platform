// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_SUBTITLE } from '@/stores/brandingStore'
import { FRONTEND_DETAILS } from '../../shared/consoleBanner.mjs'
import { buildConsoleBanner, printConsoleBanner } from './consoleBanner'

const INFO = {
  title: 'SCADA Platform',
  subtitle: '工业组态可视化平台',
  version: '9.9.9',
  details: FRONTEND_DETAILS,
}

describe('consoleBanner（浏览器渲染层）', () => {
  it('横幅文本中 %c 占位符数量与样式数量一致', () => {
    const { text, styles } = buildConsoleBanner(INFO)
    const placeholders = text.match(/%c/g)?.length ?? 0
    expect(placeholders).toBe(styles.length)
    expect(placeholders).toBeGreaterThan(0)
  })

  it('包含系统名称/副标题/版本与各板块', () => {
    const { text } = buildConsoleBanner(INFO)
    expect(text).toContain('SCADA Platform')
    expect(text).toContain('工业组态可视化平台')
    expect(text).toContain('v9.9.9')
    expect(text).toContain('Stack:')
    // 装饰性彩条已移除（无数据支撑的渐变条属于误导性装饰）
    expect(text).not.toContain('Signal:')
    expect(text).toContain('visitor@SCADA Platform')
    expect(text).toContain('Star ⭐')
  })

  it('LOGO 用品牌描边色/填充暗调', () => {
    const { styles } = buildConsoleBanner(INFO)
    expect(styles.some((s) => s.includes('#00d4aa'))).toBe(true)
    expect(styles.some((s) => s.includes('#006b62'))).toBe(true)
  })

  it('所有非空样式都带等宽字体，保证像素画不错位', () => {
    const { styles } = buildConsoleBanner(INFO)
    expect(styles.every((s) => s === '' || s.includes('font-family'))).toBe(true)
  })

  it('不传参时用站点品牌默认值作名称/副标题', () => {
    const { text } = buildConsoleBanner()
    expect(text).toContain(DEFAULT_BRAND_NAME)
    expect(text).toContain(DEFAULT_BRAND_SUBTITLE)
  })

  it('printConsoleBanner 调用一次 console.log 且文本与样式对齐', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printConsoleBanner()
    expect(spy).toHaveBeenCalledTimes(1)
    const [text, ...styles] = spy.mock.calls[0] as [string, ...string[]]
    expect(typeof text).toBe('string')
    expect(text.match(/%c/g)!.length).toBe(styles.length)
    spy.mockRestore()
  })
})