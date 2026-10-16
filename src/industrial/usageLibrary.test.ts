import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorageAdapter, setStorage, getStorage } from '@/storage'
import { loadUsageCounts, recordComponentUsage } from './usageLibrary'

describe('usageLibrary', () => {
  beforeEach(() => {
    setStorage(new MemoryStorageAdapter())
  })

  it('无记录时返回空对象', async () => {
    expect(await loadUsageCounts()).toEqual({})
  })

  it('同一组件重复记录会累加', async () => {
    await recordComponentUsage('pump')
    await recordComponentUsage('pump')
    await recordComponentUsage('valve')
    expect(await loadUsageCounts()).toEqual({ pump: 2, valve: 1 })
  })

  it('空 type 不写入', async () => {
    await recordComponentUsage('')
    expect(await loadUsageCounts()).toEqual({})
  })

  it('坏数据应被过滤：负数/NaN/字符串/null', async () => {
    await getStorage().set(
      'scada_component_usage',
      JSON.stringify({ ok: 3, neg: -1, nan: null, str: '5', nil: null, zero: 0 }),
    )
    expect(await loadUsageCounts()).toEqual({ ok: 3 })
  })

  it('顶层不是对象（数组/null）时返回空对象', async () => {
    await getStorage().set('scada_component_usage', '[1,2,3]')
    expect(await loadUsageCounts()).toEqual({})
    await getStorage().set('scada_component_usage', 'null')
    expect(await loadUsageCounts()).toEqual({})
  })

  it('JSON 损坏时返回空对象，不抛出', async () => {
    await getStorage().set('scada_component_usage', '{broken')
    expect(await loadUsageCounts()).toEqual({})
  })
})
