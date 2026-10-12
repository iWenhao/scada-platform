import { describe, it, expect } from 'vitest'
import {
  formatDateTime,
  formatCustom,
  nextTickDelay,
  CLOCK_FORMAT_OPTIONS,
  DEFAULT_CLOCK_FORMAT,
  DEFAULT_DATE_FORMAT,
  isClockFormatId,
} from './format'
import { lunarYearGanZhi } from '@/utils/lunar'

/**
 * 用固定本地时间做断言，避免时区影响。
 * 2026-10-13（周二）07:15:10.250
 */
const at = (h = 7, m = 15, s = 10, ms = 250) => new Date(2026, 9, 13, h, m, s, ms)

describe('formatDateTime', () => {
  it('日期类预设输出年月日', () => {
    expect(formatDateTime(at(), 'ymd')).toBe('2026-10-13')
    expect(formatDateTime(at(), 'ymd-cn')).toBe('2026年10月13日')
  })

  it('24 小时制预设补零输出', () => {
    expect(formatDateTime(at(), 'hms')).toBe('07:15:10')
    expect(formatDateTime(at(), 'hm')).toBe('07:15')
    expect(formatDateTime(at(), 'ymd-hms')).toBe('2026-10-13 07:15:10')
    expect(formatDateTime(at(), 'md-hm')).toBe('10-13 07:15')
  })

  it('12 小时制带上午/下午标识，0 点与 12 点都写作 12', () => {
    expect(formatDateTime(at(7), 'hms-12')).toBe('上午 07:15:10')
    expect(formatDateTime(at(19, 15, 10), 'hm-12')).toBe('下午 07:15')
    expect(formatDateTime(at(0, 5, 3), 'hms-12')).toBe('上午 12:05:03')
    expect(formatDateTime(at(12, 5, 3), 'hms-12')).toBe('下午 12:05:03')
  })

  it('农历预设输出月日中文写法', () => {
    expect(formatDateTime(at(), 'lunar')).toBe('九月初四')
    expect(formatDateTime(at(), 'md-lunar')).toBe('10-13 九月初四')
  })

  it('带星期与中文年月日带时刻的预设', () => {
    expect(formatDateTime(at(), 'ymd-hms-week')).toBe('2026-10-13 07:15:10 星期二')
    expect(formatDateTime(at(), 'ymd-cn-hms')).toBe('2026年10月13日 07:15:10')
  })

  it('非法 id 回退到指定缺省', () => {
    expect(formatDateTime(at(), 'bogus', 'ymd')).toBe('2026-10-13')
    expect(formatDateTime(at(), 'bogus')).toBe('07:15:10')
    expect(formatDateTime(at(), undefined, DEFAULT_DATE_FORMAT)).toBe('2026-10-13')
  })

  it('预设选项的 value 全部合法且不重复', () => {
    const values = CLOCK_FORMAT_OPTIONS.map(o => o.value)
    expect(new Set(values).size).toBe(values.length)
    for (const v of values) expect(isClockFormatId(v)).toBe(true)
    expect(DEFAULT_CLOCK_FORMAT).toBe('hms')
    expect(DEFAULT_DATE_FORMAT).toBe('ymd')
  })
})

describe('formatCustom 自定义模板', () => {
  it('全字段组合一次成型', () => {
    expect(formatCustom(at(), 'YYYY年MM月DD日 HH:mm:ss EEEE')).toBe('2026年10月13日 07:15:10 星期二')
  })

  it('12 小时制配上午/下午标识', () => {
    expect(formatCustom(at(19), 'A hh:mm:ss')).toBe('下午 07:15:10')
    expect(formatCustom(at(0, 5), 'A hh:mm')).toBe('上午 12:05')
  })

  it('农历与干支年占位符', () => {
    expect(formatCustom(at(), '农历LL')).toBe('农历丙午年九月初四')
    expect(formatCustom(at(), 'L')).toBe('九月初四')
  })

  it('农历越界回退公历字段', () => {
    const old = new Date(1899, 11, 31, 12)
    expect(formatCustom(old, 'L')).toBe('12-31')
    expect(formatCustom(old, 'LL')).toBe('1899-12-31')
  })

  it('空模板返回空串，由调用方回落预设', () => {
    expect(formatCustom(at(), '')).toBe('')
    expect(formatCustom(at(), '   ')).toBe('')
  })

  it('未知占位符按字面输出（如 MM 拆写为 M M 不解析）', () => {
    expect(formatCustom(at(), 'M-M')).toBe('M-M')
  })
})

describe('lunarYearGanZhi 干支纪年', () => {
  it('锚点年份', () => {
    expect(lunarYearGanZhi(1984)).toBe('甲子')
    expect(lunarYearGanZhi(2026)).toBe('丙午')
  })
})

describe('nextTickDelay', () => {
  it('秒级格式对齐到下一秒', () => {
    expect(nextTickDelay('hms', at())).toBe(750)
    expect(nextTickDelay('ymd-hms', at(7, 15, 10, 1))).toBeGreaterThanOrEqual(50)
  })

  it('分级格式对齐到下一分钟', () => {
    expect(nextTickDelay('hm', at(7, 15, 10, 250))).toBe(49750)
  })

  it('日级格式不会等待超过 30 秒（休眠唤醒后尽快补刷）', () => {
    expect(nextTickDelay('ymd', at(7, 15, 10, 250))).toBe(30000)
  })

  it('非法 id 按秒级处理，返回值下限 50ms', () => {
    expect(nextTickDelay('bogus', at())).toBe(750)
    expect(nextTickDelay('hms', at(7, 15, 10, 999))).toBeGreaterThanOrEqual(50)
  })

  it('自定义模板按模板内最小单位决定节奏', () => {
    expect(nextTickDelay('ymd', at(), 'HH:mm:ss')).toBe(750)
    expect(nextTickDelay('ymd', at(), 'HH:mm')).toBe(49750)
    expect(nextTickDelay('hms', at(), 'YYYY-MM-DD')).toBe(30000)
    expect(nextTickDelay('hms', at(), 'YYYY年MM月DD日 HH:mm:ss EEEE')).toBe(750)
  })
})
