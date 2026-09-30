import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useLayerStore } from '@/stores/layerStore'
import { useHistory } from '@/core/canvas/useHistory'
import type { ComponentInstance } from '@/types/scada'

type StageRef = { value: { getNode: () => any } | null }

/**
 * 组件/模板拖入画布：解析 dataTransfer，生成元素实例。
 */
export function useCanvasDrop(stageRef: StageRef) {
  const canvasStore = useCanvasStore()
  const deviceStore = useDeviceStore()
  const layerStore = useLayerStore()
  const { saveState } = useHistory()

  function onDrop(e: DragEvent) {
    e.preventDefault()
    const dataStr = e.dataTransfer!.getData('component')
    if (!dataStr) return

    const data = JSON.parse(dataStr)
    const stage = stageRef.value?.getNode()
    if (!stage) return

    stage.setPointersPositions(e)
    const pointerPosition = stage.getRelativePointerPosition()
    if (!pointerPosition) {
      console.warn('无法获取指针位置')
      return
    }

    if (data.kind === 'template' && data.template) {
      const tpl = data.template
      const fromTemplate: ComponentInstance = {
        id: `el_${Date.now()}`,
        type: tpl.baseType,
        templateId: tpl.id,
        deviceId: deviceStore.suggestDeviceId(tpl.baseType),
        x: pointerPosition.x - tpl.width / 2,
        y: pointerPosition.y - tpl.height / 2,
        width: tpl.width,
        height: tpl.height,
        rotation: 0,
        name: tpl.name,
        layerId: layerStore.activeLayerId,
        properties: JSON.parse(JSON.stringify(tpl.properties || {})),
        statusRules: JSON.parse(JSON.stringify(tpl.statusRules || [])),
        dataBindings: JSON.parse(JSON.stringify(tpl.dataBindings || [])),
        locked: tpl.locked,
      }
      canvasStore.addElement(fromTemplate)
      saveState()
      return
    }

    const newElement: ComponentInstance = {
      id: `el_${Date.now()}`,
      type: data.type,
      deviceId: deviceStore.suggestDeviceId(data.type),
      x: pointerPosition.x - data.defaultWidth / 2,
      y: pointerPosition.y - data.defaultHeight / 2,
      width: data.defaultWidth,
      height: data.defaultHeight,
      rotation: 0,
      name: data.name,
      layerId: layerStore.activeLayerId,
      properties: { ...data.defaultConfig },
      statusRules: [...data.statusRules],
      dataBindings: [...data.dataBindings],
    }
    canvasStore.addElement(newElement)
    saveState()
  }

  return { onDrop }
}
