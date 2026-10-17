import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorageAdapter, setStorage } from '@/storage'
import { registerComponents } from '@/industrial/registry'
import { useHiddenComponents } from './useHiddenComponents'
import type { ComponentDefinition } from '@/types/scada'

function def(type: string, name: string, group: 'basic' | 'coal' = 'basic'): ComponentDefinition {
  return {
    type,
    name,
    group,
    icon: '',
    defaultWidth: 100,
    defaultHeight: 80,
    defaultConfig: {},
    statusRules: [],
    dataBindings: [],
    properties: [],
  }
}

describe('useHiddenComponents', () => {
  beforeEach(async () => {
    setStorage(new MemoryStorageAdapter())
    registerComponents([def('pump', '水泵'), def('valve', '阀门', 'coal')])
    const api = useHiddenComponents()
    await api.showAll()
  })

  it('隐藏后 isHidden 生效，并进入恢复列表', async () => {
    const api = useHiddenComponents()
    await api.hide('pump')
    expect(api.isHidden('pump')).toBe(true)
    expect(api.isHidden('valve')).toBe(false)
    expect(api.hiddenCount.value).toBe(1)
    expect(api.hiddenComponents.value.map(c => c.type)).toEqual(['pump'])
  })

  it('重复隐藏同一个 type 只算一条', async () => {
    const api = useHiddenComponents()
    await api.hide('pump')
    await api.hide('pump')
    expect(api.hiddenCount.value).toBe(1)
  })

  it('恢复后重新可见', async () => {
    const api = useHiddenComponents()
    await api.hide('pump')
    await api.show('pump')
    expect(api.isHidden('pump')).toBe(false)
    expect(api.hiddenCount.value).toBe(0)
  })

  it('showAll 清空全部隐藏项', async () => {
    const api = useHiddenComponents()
    await api.hide('pump')
    await api.hide('valve')
    await api.showAll()
    expect(api.hiddenCount.value).toBe(0)
  })

  it('隐藏清单跨刷新保留（经存储恢复）', async () => {
    const api = useHiddenComponents()
    await api.hide('valve')
    await api.refresh()
    expect(api.isHidden('valve')).toBe(true)
  })

  it('注册表里已不存在的历史 type 不计入角标', async () => {
    const api = useHiddenComponents()
    await api.hide('removed_long_ago')
    expect(api.isHidden('removed_long_ago')).toBe(true)
    expect(api.hiddenCount.value).toBe(0)
    expect(api.hiddenComponents.value).toEqual([])
  })

  it('是模块级单例：任一处隐藏，另一处立即可见', async () => {
    const a = useHiddenComponents()
    const b = useHiddenComponents()
    await a.hide('pump')
    expect(b.isHidden('pump')).toBe(true)
    expect(b.hiddenComponents.value.map(c => c.name)).toEqual(['水泵'])
  })
})
