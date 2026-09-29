import { describe, it, expect } from 'vitest'
import {
  qualityFromAge,
  isUsable,
  isValidNumber,
  sanitizeVariables,
  DEFAULT_STALE_MS,
} from './quality'

describe('qualityFromAge', () => {
  const now = 100_000

  it('刚上报且连接正常为 good', () => {
    expect(qualityFromAge(now, now, DEFAULT_STALE_MS, true)).toBe('good')
  })

  it('超时未刷新为 stale', () => {
    expect(qualityFromAge(now - DEFAULT_STALE_MS - 1, now, DEFAULT_STALE_MS, true)).toBe('stale')
  })

  it('恰好等于阈值仍算可用（避免边界抖动）', () => {
    expect(qualityFromAge(now - DEFAULT_STALE_MS, now, DEFAULT_STALE_MS, true)).toBe('good')
  })

  it('连接断开时即便数据很新也按陈旧处理', () => {
    expect(qualityFromAge(now, now, DEFAULT_STALE_MS, false)).toBe('stale')
  })

  it('从未上报为 bad', () => {
    expect(qualityFromAge(undefined, now, DEFAULT_STALE_MS, true)).toBe('bad')
  })
})

describe('isUsable', () => {
  it('good/uncertain 可用，stale/bad 不可用', () => {
    expect(isUsable('good')).toBe(true)
    expect(isUsable('uncertain')).toBe(true)
    expect(isUsable('stale')).toBe(false)
    expect(isUsable('bad')).toBe(false)
  })
})

describe('isValidNumber', () => {
  it('有限数值有效，NaN/Infinity/字符串无效', () => {
    expect(isValidNumber(1)).toBe(true)
    expect(isValidNumber(0)).toBe(true)
    expect(isValidNumber(Number.NaN)).toBe(false)
    expect(isValidNumber(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isValidNumber('1')).toBe(false)
  })
})

describe('sanitizeVariables', () => {
  it('正常数值标记可用且可入历史', () => {
    const result = sanitizeVariables({ speed: 1500, status: 'run' })
    expect(result).toEqual([
      { name: 'speed', value: 1500, usable: true, numeric: true },
      { name: 'status', value: 'run', usable: true, numeric: false },
    ])
  })

  it('NaN/Infinity 标记不可用，其余不受影响', () => {
    const result = sanitizeVariables({ bad: Number.NaN, inf: Number.NEGATIVE_INFINITY, ok: 3 })
    expect(result.find(r => r.name === 'bad')).toMatchObject({ usable: false, numeric: false })
    expect(result.find(r => r.name === 'inf')).toMatchObject({ usable: false, numeric: false })
    expect(result.find(r => r.name === 'ok')).toMatchObject({ usable: true, numeric: true })
  })
})
