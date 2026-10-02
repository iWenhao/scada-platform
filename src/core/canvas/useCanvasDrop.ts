import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useLayerStore } from '@/stores/layerStore'
import { useHistory } from '@/core/canvas/useHistory'
import { createElementId } from '@/utils/id'
import type { ComponentInstance } from '@/types/scada'

type StageRef = { value: { getNode: () => any } | null }

/** 拖入画布时放大到可读尺寸（原定义偏小，挤在一起看不清） */
function fitDropSize(w: number, h: number) {
  return {
    width: Math.round(Math.max(w * 1.6, 110)),
    height: Math.round(Math.max(h * 1.6, 80)),
  }
}

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
      const size = fitDropSize(tpl.width, tpl.height)
      const fromTemplate: ComponentInstance = {
        id: createElementId(),
        type: tpl.baseType,
        templateId: tpl.id,
        deviceId: deviceStore.suggestDeviceId(tpl.baseType),
        x: pointerPosition.x - size.width / 2,
        y: pointerPosition.y - size.height / 2,
        width: size.width,
        height: size.height,
        rotation: 0,
        name: tpl.name,
        layerId: layerStore.activeLayerId,
        // 新组件默认只显示图形主体，名称/实时数值由属性面板按需打开
        showName: false,
        showValue: false,
        properties: JSON.parse(JSON.stringify(tpl.properties || {})),
        statusRules: JSON.parse(JSON.stringify(tpl.statusRules || [])),
        dataBindings: JSON.parse(JSON.stringify(tpl.dataBindings || [])),
        locked: tpl.locked,
      }
      canvasStore.addElement(fromTemplate)
      saveState()
      return
    }

    const size = fitDropSize(data.defaultWidth || 100, data.defaultHeight || 80)
    const newElement: ComponentInstance = {
      id: createElementId(),
      type: data.type,
      deviceId: deviceStore.suggestDeviceId(data.type),
      x: pointerPosition.x - size.width / 2,
      y: pointerPosition.y - size.height / 2,
      width: size.width,
      height: size.height,
      rotation: 0,
      name: data.name,
      layerId: layerStore.activeLayerId,
      // 新组件默认只显示图形主体，名称/实时数值由属性面板按需打开
      showName: false,
      showValue: false,
      properties: { ...data.defaultConfig },
      statusRules: [...data.statusRules],
      dataBindings: [...data.dataBindings],
    }
    canvasStore.addElement(newElement)
    saveState()
  }

  return { onDrop }
}
