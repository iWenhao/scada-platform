import { LUNAR_FIRST_YEAR, LUNAR_INFO, LUNAR_NEW_YEAR } from './lunarTable'

/**
 * 公历日期 → 农历日期（1900–2100）。
 *
 * 数据表由 Node 内置 ICU 的中文日历离线导出（见 lunarTable.ts），运行时
 * **不依赖 Intl**：ICU 的农历输出文案随版本漂移，且 small-icu 环境会静默
 * 回退成公历而不报错——把数据固化下来才能跨浏览器、跨 Node 版本一致。
 *
 * 换算按「本地日历日」进行：取 date 的本地年月日再按 UTC 求天数差，避免
 * 夏令时与跨时区把同一天算成两个偏移。代价是 UTC-12 这类极端时区下农历
 * 可能差一天，现场环境都在东八区，可接受。
 */

const BASE_UTC = Date.UTC(1900, 0, 31)
const MS_PER_DAY = 86400000

const MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']

const DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
]

export interface LunarDate {
  /** 农历年（与公历年不严格对齐：公历 1 月可能仍属上一农历年） */
  year: number
  /** 1–12 */
  month: number
  /** 1–30 */
  day: number
  /** 是否闰月 */
  isLeap: boolean
}

/** 第 index 个农历年第 month 月的天数；isLeap 时取闰月天数 */
function monthDays(index: number, month: number, isLeap: boolean): number {
  const info = LUNAR_INFO[index]
  if (isLeap) return info & 0x10000 ? 30 : 29
  return info & (0x10000 >> month) ? 30 : 29
}

/** 第 index 个农历年的总天数：平年 353–355，闰年 383–385 */
function yearDays(index: number): number {
  const leap = LUNAR_INFO[index] & 0xf
  let total = 0
  for (let m = 1; m <= 12; m++) total += monthDays(index, m, false)
  if (leap) total += monthDays(index, leap, true)
  return total
}

/**
 * 换算为农历日期。超出 1900–2100 返回 null，调用方决定是否降级显示。
 */
export function toLunar(date: Date): LunarDate | null {
  const localMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = Math.round((localMidnight - BASE_UTC) / MS_PER_DAY)
  if (offset < 0) return null

  let index = LUNAR_NEW_YEAR.length - 1
  while (index > 0 && offset < LUNAR_NEW_YEAR[index]) index--

  let rest = offset - LUNAR_NEW_YEAR[index]
  if (rest >= yearDays(index)) return null

  const leap = LUNAR_INFO[index] & 0xf
  let month = 1
  let isLeap = false
  while (month <= 12) {
    const days = monthDays(index, month, false)
    if (rest < days) break
    rest -= days
    if (month === leap) {
      const leapDays = monthDays(index, month, true)
      if (rest < leapDays) {
        isLeap = true
        break
      }
      rest -= leapDays
    }
    month++
  }

  // 理论上不会走到：rest 已被 yearDays 约束在该年之内
  if (month > 12) {
    month = 12
    isLeap = false
    rest = monthDays(index, 12, false) - 1
  }

  return { year: LUNAR_FIRST_YEAR + index, month, day: rest + 1, isLeap }
}

/**
 * 农历月日的中文写法，如「九月初四」「闰六月初三」。
 * 越界（早于 1900 或晚于 2100）返回空串，由调用方回退到公历。
 */
export function lunarMonthDayText(date: Date): string {
  const lunar = toLunar(date)
  if (!lunar) return ''
  const month = MONTH_NAMES[lunar.month - 1]
  const day = DAY_NAMES[lunar.day - 1]
  return `${lunar.isLeap ? '闰' : ''}${month}月${day ?? ''}`
}
