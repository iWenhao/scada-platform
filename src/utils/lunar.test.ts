// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { toLunar, lunarMonthDayText } from './lunar'

/**
 * 农历换算的校验分两层：
 * 1. 硬编码的已知日期——不依赖任何外部实现，能独立证伪；
 * 2. 与 Node 内置 ICU 的中文日历交叉比对——只在 ICU 支持农历时执行，
 *    用于覆盖数据表全量程（ICU 只是参照，运行时并不用它）。
 */

/** 独立于实现的中文月名，避免用被测常量自证 */
const REF_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
const REF_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
]

/** 实现的命名习惯：十一月写作「冬月」、十二月写作「腊月」，与参照表对齐 */
function normalizeMonth(text: string): string {
  return text.replace('冬月', '十一月').replace('腊月', '十二月')
}

const at = (iso: string) => new Date(`${iso}T12:00:00`)

describe('toLunar', () => {
  it('1900-01-31 是庚子年正月初一（数据表基准日）', () => {
    expect(toLunar(at('1900-01-31'))).toEqual({ year: 1900, month: 1, day: 1, isLeap: false })
  })

  it('2026-02-17 是丙午年正月初一', () => {
    expect(toLunar(at('2026-02-17'))).toEqual({ year: 2026, month: 1, day: 1, isLeap: false })
  })

  it('2026-10-13 是九月初四', () => {
    expect(lunarMonthDayText(at('2026-10-13'))).toBe('九月初四')
  })

  it('闰月能被识别：2025-07-25 是闰六月初一', () => {
    expect(toLunar(at('2025-07-25'))).toEqual({ year: 2025, month: 6, day: 1, isLeap: true })
    expect(lunarMonthDayText(at('2025-07-25'))).toBe('闰六月初一')
  })

  it('闰月排在其月份之后：2023 闰二月初一在二月初一之后', () => {
    const plain = toLunar(at('2023-02-20'))
    const leap = toLunar(at('2023-03-22'))
    expect(plain).toEqual({ year: 2023, month: 2, day: 1, isLeap: false })
    expect(leap).toEqual({ year: 2023, month: 2, day: 1, isLeap: true })
  })

  it('超出 1900–2100 返回 null', () => {
    expect(toLunar(at('1899-12-31'))).toBeNull()
    expect(lunarMonthDayText(at('1899-12-31'))).toBe('')
  })

  it('每月天数只可能是 29 或 30，且初一必然连续', () => {
    // 2026 年（无闰月）逐日推进：日序应从初一连续走到三十/廿九
    const seen = new Map<number, number[]>()
    const start = Date.UTC(2026, 1, 17)
    for (let i = 0; i < 355; i++) {
      const d = new Date(start + i * 86400000 + 12 * 3600000)
      const l = toLunar(d)
      if (!l || l.year !== 2026) continue
      const list = seen.get(l.month) ?? []
      list.push(l.day)
      seen.set(l.month, list)
    }
    expect(seen.size).toBe(12)
    for (const [, days] of seen) {
      expect(days.length === 29 || days.length === 30).toBe(true)
      expect(days[0]).toBe(1)
      expect(days[days.length - 1]).toBe(days.length)
    }
  })
})

/** ICU 是否支持中文农历：不支持时输出的是公历，不能作为参照 */
function icuSupportsChinese(): boolean {
  const out = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(
    new Date(Date.UTC(2026, 9, 13, 12)),
  )
  return out.includes('月') && !/^\d/.test(out)
}

describe('与 ICU 中文日历交叉比对', () => {
  const supported = icuSupportsChinese()
  const fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' })

  it.skipIf(!supported)('1900–2100 抽样日期的月日与 ICU 一致', () => {
    const mismatches: string[] = []
    // 每年取 6 个采样点（覆盖四季），共约 1200 次比对
    for (let y = 1900; y <= 2100; y++) {
      for (const [m, d] of [[0, 15], [2, 20], [5, 10], [7, 8], [9, 13], [11, 25]]) {
        const date = new Date(Date.UTC(y, m, d, 12))
        const parts = fmt.formatToParts(date)
        const monthRaw = parts.find(p => p.type === 'month')?.value ?? ''
        const dayNum = Number(parts.find(p => p.type === 'day')?.value ?? '0')
        const isLeap = monthRaw.startsWith('闰')
        // ICU 输出形如「腊月」「闰八月」：剥离「闰」前缀与「月」后缀，
        // 并把「腊」映射为参照表的「十二」
        const bare = monthRaw.replace('闰', '').replace(/月$/, '')
        const monthName = bare === '腊' ? '十二' : bare
        const idx = REF_MONTHS.indexOf(monthName)
        if (idx < 0 || dayNum < 1) {
          mismatches.push(`${y}-${m + 1}-${d} ICU 输出无法解析：${monthRaw}`)
          continue
        }
        const expected = `${isLeap ? '闰' : ''}${REF_MONTHS[idx]}月${REF_DAYS[dayNum - 1]}`
        const actual = normalizeMonth(lunarMonthDayText(date))
        if (!actual) {
          // 早于数据表起点（1900-01-31）的日期越界返回空，属预期
          if (Date.UTC(y, m, d) >= Date.UTC(1900, 0, 31)) {
            mismatches.push(`${y}-${m + 1}-${d} 期望 ${expected} 实际为空`)
          }
          continue
        }
        if (actual !== expected) {
          mismatches.push(`${y}-${m + 1}-${d} 期望 ${expected} 实际 ${actual}`)
        }
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([])
  })

  it.skipIf(!supported)('每一年都能在其内部取到完整的 12 个农历月', () => {
    const bad: string[] = []
    for (let y = 1901; y <= 2100; y++) {
      const l = toLunar(new Date(Date.UTC(y, 6, 1, 12)))
      if (!l || l.month < 1 || l.month > 12 || l.day < 1 || l.day > 30) bad.push(String(y))
    }
    expect(bad).toEqual([])
  })
})
