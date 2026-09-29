import { describe, it, expect, vi } from 'vitest'
import { historyToCsv, alarmsToCsv, downloadCsv } from './csv'
import type { AlarmRecord } from '@/stores/alarmStore'

// 固定时间戳，避免时区影响断言
const T = new Date('2026-09-30T10:20:30.400+08:00').getTime()

describe('historyToCsv', () => {
  it('输出 BOM + 表头 + 时间值两列', () => {
    const csv = historyToCsv([{ t: T, v: 12.5 }])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe('time,value')
    expect(lines[1]).toBe('2026-09-30 10:20:30.400,12.5')
  })

  it('空数据只有表头', () => {
    expect(historyToCsv([]).slice(1)).toBe('time,value')
  })
})

describe('alarmsToCsv', () => {
  const base: AlarmRecord = {
    key: 'k',
    elementId: 'el_1',
    elementName: '原水箱',
    ruleId: 'r1',
    ruleName: '液位过高',
    severity: 'critical',
    color: '#ff4757',
    value: '95',
    lastValue: '96.2',
    since: T,
    acknowledged: true,
    clearedAt: T + 60_000,
  }

  it('中文表头与级别翻译', () => {
    const csv = alarmsToCsv([base])
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe('触发时间,恢复时间,点位/对象,报警名称,级别,触发值,最近值,已确认')
    expect(lines[1]).toContain('原水箱,液位过高,报警,95,96.2,是')
  })

  it('未恢复的报警恢复时间为空', () => {
    const csv = alarmsToCsv([{ ...base, clearedAt: undefined }])
    const line = csv.slice(1).split('\r\n')[1]
    expect(line.startsWith(`2026-09-30 10:20:30.400,`)).toBe(true)
    expect(line.split(',')[1]).toBe('')
  })

  it('含逗号的字段被引号包裹并转义', () => {
    const csv = alarmsToCsv([{ ...base, ruleName: '超限,越界' }])
    expect(csv).toContain('"超限,越界"')
  })
})

describe('downloadCsv', () => {
  it('创建带 BOM 的 Blob 并触发下载', () => {
    const click = vi.fn()
    const revoke = vi.fn()
    const create = vi.fn(() => ({ click }))
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
    const spy = vi.spyOn(document, 'createElement')
    // jsdom 的 a.click() 不存在，模拟
    spy.mockImplementation(((tag: string) => {
      if (tag === 'a') return { click, set href(_: string) {}, set download(_: string) {} } as any
      return document.createElementNS?.('', tag) ?? document.createElement(tag)
    }) as any)

    downloadCsv('test.csv', 'a,b')

    expect(create).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalled()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})
