/**
 * 数据质量模型。
 *
 * 现场最危险的不是"没有数据"，而是"坏数据被当成真数据用"——
 * 通信断了画面还显示着十分钟前的液位，操作员照着它下判断。
 * 这里给每个点位一个质量位，供报警判定、历史入库与画面显示共同使用。
 */

/** 点位质量：good 可用 / uncertain 可用但存疑 / stale 陈旧（超时未刷新）/ bad 从未上报或脏值 */
export type Quality = 'good' | 'uncertain' | 'stale' | 'bad'

/** 单个点位的采集元信息 */
export interface VariableMeta {
  /** 最近一次成功上报的时间戳 */
  t: number
  /** 上报时刻判定的质量 */
  q: Quality
}

/** 陈旧判定默认阈值（毫秒）：超过该时长未刷新即认为数据不可信 */
export const DEFAULT_STALE_MS = 10_000

/** 通信中断判定默认阈值（毫秒）：整体数据停更超过该时长认为链路中断 */
export const DEFAULT_COMM_TIMEOUT_MS = 30_000

/**
 * 质量是否可用于报警判定与历史入库。
 * stale（超时未刷新）与 bad（脏值/从未上报）都不可信，一律排除。
 */
export function isUsable(q: Quality): boolean {
  return q === 'good' || q === 'uncertain'
}

/** 质量位的中文文案与展示配色（el-tag type） */
export const QUALITY_TEXT: Record<Quality, string> = {
  good: '正常',
  uncertain: '存疑',
  stale: '陈旧',
  bad: '无数据',
}

export const QUALITY_TAG_TYPE: Record<Quality, 'success' | 'warning' | 'info' | 'danger'> = {
  good: 'success',
  uncertain: 'warning',
  stale: 'warning',
  bad: 'info',
}

/**
 * 上报时刻距今的相对时长（秒级精度）。
 * 实时点位列表用：操作员一眼看出数据多久没来，而不是对照钟表心算。
 */
export function formatAge(t: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - t) / 1000))
  if (seconds < 1) return '刚刚'
  if (seconds < 60) return `${seconds}s 前`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m 前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h 前`
  return `${Math.floor(hours / 24)}d 前`
}

/**
 * 由"最后上报时刻 + 当前时刻 + 连接状态"推导质量。
 * 连接已断开时即便数据没超时也按陈旧处理：链路断了，画面上的值是过去的快照。
 */
export function qualityFromAge(
  lastAt: number | undefined,
  now: number,
  staleMs: number,
  connected: boolean,
): Quality {
  if (lastAt === undefined) return 'bad'
  if (!connected) return 'stale'
  if (now - lastAt > staleMs) return 'stale'
  return 'good'
}

/** 数值是否可作为有效采样（NaN/Infinity 是典型的脏值，不能入库也不能参与判定） */
export function isValidNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/** 单个变量的清洗结果 */
export interface SanitizedVariable {
  name: string
  value: number | string | boolean
  /** 是否可写入实时数据（false = 脏值，保留画面上的旧值并标记 bad） */
  usable: boolean
  /** 是否可作为数值采样入历史 */
  numeric: boolean
}

/**
 * 清洗一次上报的变量集：把 NaN/Infinity 等脏值单独标记出来。
 * 抽成纯函数是为了能直接单测——脏值来自数据源，靠集成路径很难稳定构造。
 */
export function sanitizeVariables(variables: Record<string, any>): SanitizedVariable[] {
  return Object.entries(variables).map(([name, value]) => {
    const numeric = isValidNumber(value)
    return {
      name,
      value,
      usable: typeof value === 'number' ? numeric : true,
      numeric,
    }
  })
}
