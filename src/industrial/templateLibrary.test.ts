import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorageAdapter, setStorage } from '@/storage'
import {
  loadDeviceTemplates,
  saveDeviceTemplate,
  removeDeviceTemplate,
  templateFromElement,
} from './templateLibrary'

const sampleElement = {
  name: '给水泵',
  type: 'pump',
  width: 120,
  height: 80,
  properties: { color: '#0af' },
  statusRules: [
    {
      id: 'r1',
      name: '运行',
      color: '#0f0',
      condition: { type: 'compare' as const, variable: 'speed', operator: '>' as const, value: 0 },
      priority: 1,
    },
  ],
  dataBindings: [{ property: 'speed', variable: 'speed' }],
}

describe('templateLibrary', () => {
  beforeEach(() => {
    setStorage(new MemoryStorageAdapter())
  })

  it('templateFromElement 应深拷贝属性/规则/绑定', () => {
    const body = templateFromElement(sampleElement, '泵模板')
    expect(body.name).toBe('泵模板')
    expect(body.baseType).toBe('pump')
    expect(body.properties).toEqual(sampleElement.properties)
    expect(body.properties).not.toBe(sampleElement.properties)
    expect(body.statusRules).toHaveLength(1)
    expect(body.dataBindings[0].variable).toBe('speed')
  })

  it('保存后可加载，同 id 覆盖', async () => {
    const saved = await saveDeviceTemplate(templateFromElement(sampleElement, '泵模板'))
    expect(saved.id).toBeTruthy()

    let list = await loadDeviceTemplates()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('泵模板')

    await saveDeviceTemplate({ ...templateFromElement(sampleElement, '泵模板改'), id: saved.id })
    list = await loadDeviceTemplates()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('泵模板改')
  })

  it('删除模板后列表为空', async () => {
    const saved = await saveDeviceTemplate(templateFromElement(sampleElement, '泵模板'))
    await removeDeviceTemplate(saved.id)
    expect(await loadDeviceTemplates()).toHaveLength(0)
  })

  it('坏数据应被过滤', async () => {
    await (await import('@/storage')).getStorage().set(
      'scada_device_templates',
      JSON.stringify([{ id: 'x' }, { id: 'ok', name: '可用', baseType: 'pump', width: 1, height: 1 }]),
    )
    const list = await loadDeviceTemplates()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('ok')
  })
})
