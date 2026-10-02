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

  it('loadFromJSON 应该完整加载并保留绑定数据', () => {
    const json = JSON.stringify({ elements: [makeElement('el_1'), makeElement('el_2')] })
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

  it('moveElementForward/moveElementBackward 应调整元素叠放次序', () => {
    // 数组顺序即渲染 z 序：末位画在最上层
    store.addElement(makeElement('el_1'))
    store.addElement(makeElement('el_2'))
    store.addElement(makeElement('el_3'))

    store.moveElementForward('el_2')
    expect(store.elements.map(el => el.id)).toEqual(['el_1', 'el_3', 'el_2'])

    store.moveElementBackward('el_2')
    expect(store.elements.map(el => el.id)).toEqual(['el_1', 'el_2', 'el_3'])

    // 边界：已在顶层/底层时幂等不变
    store.moveElementForward('el_3')
    expect(store.elements.map(el => el.id)).toEqual(['el_1', 'el_2', 'el_3'])
    store.moveElementBackward('el_1')
    expect(store.elements.map(el => el.id)).toEqual(['el_1', 'el_2', 'el_3'])
  })

  it('多选: selectMany/toggleElement/clearSelection 应正常工作', () => {
    store.addElement(makeElement('el_1'))
    store.addElement(makeElement('el_2'))
    store.addElement(makeElement('el_3'))

    store.selectMany(['el_1', 'el_2'])
    expect(store.selectedIds).toEqual(['el_1', 'el_2'])
    expect(store.selectedElements.map(el => el.id)).toEqual(['el_1', 'el_2'])
    expect(store.selectedId).toBe('el_1')

    // Shift+点击切换
    store.toggleElement('el_3')
    expect(store.selectedIds).toEqual(['el_1', 'el_2', 'el_3'])
    store.toggleElement('el_1')
    expect(store.selectedIds).toEqual(['el_2', 'el_3'])

    store.clearSelection()
    expect(store.selectedIds).toEqual([])
  })

  it('批量删除应同步清理选中列表', () => {
    store.addElement(makeElement('el_1'))
    store.addElement(makeElement('el_2'))
    store.addElement(makeElement('el_3'))
    store.selectMany(['el_1', 'el_2'])

    store.removeElements(['el_1', 'el_2'])
    expect(store.elements.map(el => el.id)).toEqual(['el_3'])
    expect(store.selectedIds).toEqual([])
  })

  it('删除单选元素应清空选中状态', () => {
    store.addElement(makeElement('el_1'))
    store.selectElement('el_1')
    store.removeElement('el_1')

    expect(store.selectedIds).toEqual([])
    expect(store.selectedId).toBeNull()
  })
})
