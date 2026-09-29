import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useHistory } from '@/core/canvas/useHistory'
import { useProjectStore } from '@/stores/projectStore'
import type { ComponentInstance } from '@/types/scada'

function makeElement(id: string, x = 0): ComponentInstance {
  return {
    id,
    type: 'valve',
    x,
    y: 0,
    width: 60,
    height: 90,
    rotation: 0,
    name: id,
    layerId: 'background',
    properties: {},
    statusRules: [],
    dataBindings: [],
  }
}

describe('useHistory', () => {
  let canvasStore: ReturnType<typeof useCanvasStore>
  let connectionStore: ReturnType<typeof useConnectionStore>
  let history: ReturnType<typeof useHistory>

  beforeEach(() => {
    setActivePinia(createPinia())
    canvasStore = useCanvasStore()
    connectionStore = useConnectionStore()
    history = useHistory()
    history.clearHistory()
  })

  it('应该按快照撤销和重做元素变更', () => {
    history.saveState() // 空状态

    canvasStore.addElement(makeElement('el_1'))
    history.saveState()

    canvasStore.addElement(makeElement('el_2'))
    history.saveState()
    expect(canvasStore.elements).toHaveLength(2)

    history.undo()
    expect(canvasStore.elements).toHaveLength(1)

    history.undo()
    expect(canvasStore.elements).toHaveLength(0)

    history.redo()
    expect(canvasStore.elements).toHaveLength(1)

    history.redo()
    expect(canvasStore.elements).toHaveLength(2)
  })

  it('内容未变化时重复保存不应产生冗余快照', () => {
    history.saveState()
    canvasStore.addElement(makeElement('el_1'))
    history.saveState()

    // 相同内容再保存一次应被跳过
    history.saveState()

    history.undo()
    expect(canvasStore.elements).toHaveLength(0)
    expect(history.canUndo.value).toBe(false)
  })

  it('撤销后保存新状态应该丢弃重做分支', () => {
    history.saveState()
    canvasStore.addElement(makeElement('el_1'))
    history.saveState()

    history.undo()
    expect(history.canRedo.value).toBe(true)

    canvasStore.addElement(makeElement('el_3'))
    history.saveState()
    expect(history.canRedo.value).toBe(false)
    expect(canvasStore.elements.map(el => el.id)).toEqual(['el_3'])
  })

  it('撤销应该恢复被删除的连线', () => {
    history.saveState()
    canvasStore.addElement(makeElement('el_1'))
    canvasStore.addElement(makeElement('el_2'))

    connectionStore.startConnection('el_1', 'right', { x: 60, y: 45 })
    const conn = connectionStore.finishConnection('el_2', 'left', [60, 45, 100, 45])
    expect(conn).not.toBeNull()
    history.saveState()
    expect(connectionStore.connections).toHaveLength(1)

    connectionStore.deleteConnection(conn!.id)
    history.saveState()
    expect(connectionStore.connections).toHaveLength(0)

    history.undo()
    expect(connectionStore.connections).toHaveLength(1)
    expect(connectionStore.connections[0].sourceId).toBe('el_1')
  })

  it('首次保存建立基线不应标记未保存，之后的内容变化才标记', () => {
    const projectStore = useProjectStore()

    history.saveState() // 相当于编辑器挂载时记录初始状态
    expect(projectStore.hasUnsavedChanges).toBe(false)

    canvasStore.addElement(makeElement('el_1'))
    history.saveState()
    expect(projectStore.hasUnsavedChanges).toBe(true)
  })

  it('清空历史后应重新建立基线', () => {
    const projectStore = useProjectStore()

    history.saveState() // 基线
    canvasStore.addElement(makeElement('el_1'))
    history.saveState()
    expect(projectStore.hasUnsavedChanges).toBe(true)

    history.clearHistory()
    projectStore.hasUnsavedChanges = false

    // 清空后的第一次保存重新成为基线，不应把初始状态当成用户改动
    history.saveState()
    expect(projectStore.hasUnsavedChanges).toBe(false)
  })

  it('撤销与重做都应让工程回到未保存状态', () => {
    const projectStore = useProjectStore()

    history.saveState()
    canvasStore.addElement(makeElement('el_1'))
    history.saveState()
    expect(projectStore.hasUnsavedChanges).toBe(true)

    history.undo()
    expect(projectStore.hasUnsavedChanges).toBe(true)

    projectStore.hasUnsavedChanges = false
    history.redo()
    expect(projectStore.hasUnsavedChanges).toBe(true)
  })
})
