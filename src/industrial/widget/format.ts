import { lunarMonthDayText, lunarYearGanZhi, toLunar } from '@/utils/lunar'

/**
 * 日期 / 时间挂件的显示格式。
 *
 * 设计取舍：格式做成**一个预设枚举**，而不是「显示年/月/日/时/分/秒/星期/
 * 农历」的开关堆——8 个开关会组合出 256 种状态，其中大量无意义（全关=空
 * 白），且开关之间会互相打架。预设枚举把可选状态收敛到 10 个真实需求上。
 *
 * 预设 id 会写进工程数据（元素 properties），所以是稳定字符串，不要重排
 * 或改名；加新格式只能在末尾追加。
 */

export type ClockFormatId =
  | 'ymd'
  | 'ymd-cn'
  | 'ymd-hms'
  | 'ymd-hms-week'
  | 'ymd-cn-hms'
  | 'md-hm'
  | 'hms'
  | 'hm'
  | 'hms-12'
  | 'hm-12'
  | 'md-lunar'
  | 'lunar'

/** 日期组件的默认格式 */
export const DEFAULT_DATE_FORMAT: ClockFormatId = 'ymd'
/** 时间组件的默认格式 */
export const DEFAULT_CLOCK_FORMAT: ClockFormatId = 'hms'

const FORMAT_IDS: readonly string[] = [
  'ymd',
  'ymd-cn',
  'ymd-hms',
  'ymd-hms-week',
  'ymd-cn-hms',
  'md-hm',
  'hms',
  'hm',
  'hms-12',
  'hm-12',
  'md-lunar',
  'lunar',
]

export function isClockFormatId(v: unknown): v is ClockFormatId {
  return typeof v === 'string' && FORMAT_IDS.includes(v)
}

/**
 * 属性面板下拉选项。label 直接给输出样例——比「年-月-日」这类格式名更容易
 * 选对，且样例是静态文本，不随当前时间变化。
 */
export const CLOCK_FORMAT_OPTIONS: Array<{ label: string; value: ClockFormatId }> = [
  { label: '2026-10-13', value: 'ymd' },
  { label: '2026年10月13日', value: 'ymd-cn' },
  { label: '2026-10-13 07:15:10', value: 'ymd-hms' },
  { label: '2026-10-13 07:15:10 星期二', value: 'ymd-hms-week' },
  { label: '2026年10月13日 07:15:10', value: 'ymd-cn-hms' },
  { label: '10-13 07:15', value: 'md-hm' },
  { label: '07:15:10', value: 'hms' },
  { label: '07:15', value: 'hm' },
  { label: '上午 07:15:10', value: 'hms-12' },
  { label: '上午 07:15', value: 'hm-12' },
  { label: '10-13 九月初四', value: 'md-lunar' },
  { label: '九月初四', value: 'lunar' },
]

const pad = (n: number) => String(n).padStart(2, '0')

const WEEKDAY_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 按预设格式化本地时间。id 非法时退回 fallback（默认 24 小时制时钟）。
 *
 * 农历超出 1900–2100 时回退到公历月日，不留空也不显示占位符。
 */
export function formatDateTime(d: Date, id: unknown, fallback: unknown = DEFAULT_CLOCK_FORMAT): string {
  const f: ClockFormatId = isClockFormatId(id)
    ? id
    : isClockFormatId(fallback)
      ? fallback
      : DEFAULT_CLOCK_FORMAT

  const year = String(d.getFullYear())
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hour24 = d.getHours()
  const minute = pad(d.getMinutes())
  const second = pad(d.getSeconds())
  const hour12 = pad(hour24 % 12 === 0 ? 12 : hour24 % 12)
  const period = hour24 < 12 ? '上午' : '下午'
  const weekdayFull = WEEKDAY_FULL[d.getDay()]
  const lunar = lunarMonthDayText(d)

  switch (f) {
    case 'ymd':
      return `${year}-${month}-${day}`
    case 'ymd-cn':
      return `${year}年${d.getMonth() + 1}月${d.getDate()}日`
    case 'ymd-hms':
      return `${year}-${month}-${day} ${pad(hour24)}:${minute}:${second}`
    case 'ymd-hms-week':
      return `${year}-${month}-${day} ${pad(hour24)}:${minute}:${second} ${weekdayFull}`
    case 'ymd-cn-hms':
      return `${year}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(hour24)}:${minute}:${second}`
    case 'md-hm':
      return `${month}-${day} ${pad(hour24)}:${minute}`
    case 'hms':
      return `${pad(hour24)}:${minute}:${second}`
    case 'hm':
      return `${pad(hour24)}:${minute}`
    case 'hms-12':
      return `${period} ${hour12}:${minute}:${second}`
    case 'hm-12':
      return `${period} ${hour12}:${minute}`
    case 'md-lunar':
      return lunar ? `${month}-${day} ${lunar}` : `${month}-${day}`
    case 'lunar':
      return lunar || `${month}-${day}`
    default:
      return ''
  }
}

/**
 * 自定义模板的占位符（写进工程数据的是模板字符串本身，token 只增不改）：
 *   YYYY 年 · MM 月 · DD 日 · HH 时(24h) · hh 时(12h，配 A) · mm 分 · ss 秒
 *   A 上午/下午 · EEEE 星期二 · EEE 周二
 *   L 农历月日（九月初四） · LL 干支年+农历月日（丙午年九月初四）
 * 其余字符原样输出，如「YYYY年MM月DD日 HH:mm:ss EEEE 农历LL」。
 * 农历越界（1900 前 / 2100 后）回退为公历对应字段。
 */
const TOKEN_RE = /YYYY|MM|DD|HH|hh|mm|ss|EEEE|EEE|LL|L|A/g

function renderToken(d: Date, tok: string): string {
  switch (tok) {
    case 'YYYY':
      return String(d.getFullYear())
    case 'MM':
      return pad(d.getMonth() + 1)
    case 'DD':
      return pad(d.getDate())
    case 'HH':
      return pad(d.getHours())
    case 'hh':
      return pad(d.getHours() % 12 === 0 ? 12 : d.getHours() % 12)
    case 'mm':
      return pad(d.getMinutes())
    case 'ss':
      return pad(d.getSeconds())
    case 'A':
      return d.getHours() < 12 ? '上午' : '下午'
    case 'EEEE':
      return WEEKDAY_FULL[d.getDay()]
    case 'EEE':
      return WEEKDAY_SHORT[d.getDay()]
    case 'L': {
      const lunar = lunarMonthDayText(d)
      return lunar || `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    case 'LL': {
      const lunar = toLunar(d)
      if (!lunar) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      return `${lunarYearGanZhi(lunar.year)}年${lunarMonthDayText(d)}`
    }
    default:
      return tok
  }
}

/** 按自定义模板格式化；模板为空时返回空串，由调用方回落到预设格式 */
export function formatCustom(d: Date, template: string): string {
  const t = template.trim()
  if (!t) return ''
  return t.replace(TOKEN_RE, tok => renderToken(d, tok))
}

const SEC = 1000
const MIN = 60 * SEC
/** 日级格式距次日 0 点可能很久，休眠唤醒后要尽快补一次刷新 */
const DAY_MAX_DELAY = 30 * SEC
const MIN_DELAY = 50

function clampDelay(delay: number): number {
  return Math.max(delay, MIN_DELAY)
}

/**
 * 距下一次需要重算的毫秒数：按格式的最小显示单位决定，避免「只显示到日」
 * 却每秒重算。自定义模板非空时按模板里出现的占位符判断最小单位。
 * 返回值下限 50ms，防止传入 Timeout 时被当成 0 立即触发。
 */
export function nextTickDelay(id: unknown, now: Date, customTemplate = ''): number {
  const t = customTemplate.trim()
  if (t) {
    if (t.includes('ss')) return clampDelay(SEC - now.getMilliseconds())
    if (/(HH|hh|mm)/.test(t)) {
      return clampDelay(MIN - (now.getSeconds() * SEC + now.getMilliseconds()))
    }
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return clampDelay(Math.min(tomorrow.getTime() - now.getTime(), DAY_MAX_DELAY))
  }

  const f: ClockFormatId = isClockFormatId(id) ? id : DEFAULT_CLOCK_FORMAT
  let delay: number
  switch (f) {
    case 'hms':
    case 'hms-12':
    case 'ymd-hms':
    case 'ymd-hms-week':
    case 'ymd-cn-hms':
      delay = SEC - now.getMilliseconds()
      break
    case 'hm':
    case 'hm-12':
    case 'md-hm':
      delay = MIN - (now.getSeconds() * SEC + now.getMilliseconds())
      break
    default: {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      delay = Math.min(tomorrow.getTime() - now.getTime(), DAY_MAX_DELAY)
      break
    }
  }
  return clampDelay(delay)
}
