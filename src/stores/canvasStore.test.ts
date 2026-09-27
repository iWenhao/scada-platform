import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/stores/canvasStore'
import type { ComponentInstance } from '@/types/scada'

function makeElement(id: string): ComponentInstance {
  return {
    id,
    type: 'motor',
    deviceId: 'motor_1',
    x: 10,
    y: 20,
    width: 80,
    height: 70,
    rotation: 0,
    name: id,
    layerId: 'device',
    properties: { speed: 0 },
    statusRules: [],
    dataBindings: [{ property: 'speed', variable: 'speed' }],
  }
}

describe('canvasStore', () => {
  let store: ReturnType<typeof useCanvasStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCanvasStore()
  })

  it('添加元素后应能选中和更新', () => {
    store.addElement(makeElement('el_1'))
    store.selectElement('el_1')

    expect(store.selectedId).toBe('el_1')
    expect(store.selectedElement?.name).toBe('el_1')

    store.updateElement('el_1', { x: 100, rotation: 45 })
    expect(store.elements[0].x).toBe(100)
    expect(store.elements[0].rotation).toBe(45)
  })

  it('删除元素应清除对应选中状态', () => {
    store.addElement(makeElement('el_1'))
    store.addElement(makeElement('el_2'))
    store.selectElement('el_1')

    store.removeElement('el_1')
    expect(store.selectedId).toBeNull()
    expect(store.elements).toHaveLength(1)

    store.selectElement('el_2')
    store.removeElements(['el_2'])
    expect(store.selectedId).toBeNull()
    expect(store.elements).toHaveLength(0)
  })

  it('toJSON/loadFromJSON 应该完整往返保留绑定数据', () => {
    store.addElement(makeElement('el_1'))
    store.addElement(makeElement('el_2'))

    const json = store.toJSON()
    store.clearCanvas()
    expect(store.elements).toHaveLength(0)

    expect(store.loadFromJSON(json)).toBe(true)
    expect(store.elements).toHaveLength(2)
    expect(store.elements[0].deviceId).toBe('motor_1')
    expect(store.elements[0].dataBindings[0].variable).toBe('speed')
  })

  it('损坏的 JSON 应该加载失败且不清空当前内容', () => {
    store.addElement(makeElement('el_1'))

    expect(store.loadFromJSON('{broken')).toBe(false)
    expect(store.elements).toHaveLength(1)
  })
})
