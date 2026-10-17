import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorageAdapter, setStorage, getStorage } from '@/storage'
import { loadHiddenTypes, saveHiddenTypes } from './hiddenLibrary'

describe('hiddenLibrary', () => {
  beforeEach(() => {
    setStorage(new MemoryStorageAdapter())
  })

  it('无记录时返回空数组', async () => {
    expect(await loadHiddenTypes()).toEqual([])
  })

  it('写入后可读回', async () => {
    await saveHiddenTypes(['pump', 'valve'])
    expect(await loadHiddenTypes()).toEqual(['pump', 'valve'])
  })

  it('保存时去重', async () => {
    await saveHiddenTypes(['pump', 'pump', 'valve'])
    expect(await loadHiddenTypes()).toEqual(['pump', 'valve'])
  })

  it('坏数据应被过滤：非字符串项丢弃并去重', async () => {
    await getStorage().set('scada_hidden_components', JSON.stringify(['ok', '', 1, null, {}, 'ok']))
    expect(await loadHiddenTypes()).toEqual(['ok'])
  })

  it('顶层不是数组（对象/null）时返回空数组', async () => {
    await getStorage().set('scada_hidden_components', '{"pump":true}')
    expect(await loadHiddenTypes()).toEqual([])
    await getStorage().set('scada_hidden_components', 'null')
    expect(await loadHiddenTypes()).toEqual([])
  })

  it('JSON 损坏时返回空数组，不抛出', async () => {
    await getStorage().set('scada_hidden_components', '[broken')
    expect(await loadHiddenTypes()).toEqual([])
  })
})
