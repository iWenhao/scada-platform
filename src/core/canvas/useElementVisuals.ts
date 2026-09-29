import { ref } from 'vue'
import type { useDeviceStore } from '@/stores/deviceStore'
import type { useLayerStore } from '@/stores/layerStore'
import { statusEngine } from '@/status/StatusEngine'
import { getIconImage } from './iconImage'
import { getComponentDefinition } from '@/industrial/registry'
import type { ComponentInstance } from '@/types/scada'
import type { PortPosition } from '@/types/connection'

type DeviceStore = ReturnType<typeof useDeviceStore>
type LayerStore = ReturnType<typeof useLayerStore>

/**
 * 元素视觉呈现：状态着色、实时数值、图标、端口与图层可见性/锁定。
 */
export function useElementVisuals(options: {
  deviceStore: DeviceStore
  layerStore: LayerStore
}) {
  const { deviceStore, layerStore } = options

  // 获取元素状态颜色
  function getElementColor(element: ComponentInstance): string {
    const data = deviceStore.getDeviceData(element.deviceId || element.id)
    const status = statusEngine.evaluate(element.statusRules, data)
    return status?.color || '#2a2a2a'
  }

  // 元素上展示的实时数值（取第一个数据绑定变量）
  function getElementValueText(element: ComponentInstance): string {
    const binding = element.dataBindings?.[0]
    if (!binding) return ''

    const data = deviceStore.getDeviceData(element.deviceId || element.id)
    const value = data[binding.variable]
    if (value === undefined) return ''

    const formatted = typeof value === 'number' ? Math.round(value * 10) / 10 : value
    return `${binding.variable}: ${formatted}`
  }

  // 数值显示图元：只读展示绑定变量的格式化值（居中大字，与普通元素的底部小字区分）
  function isDisplayElement(element: ComponentInstance): boolean {
    return element.type === 'display'
  }

  function getDisplayValueText(element: ComponentInstance): string {
    const binding = element.dataBindings?.[0]
    if (!binding) return '--'

    const data = deviceStore.getDeviceData(element.deviceId || element.id)
    const value = data[binding.variable]
    if (value === undefined) return '--'

    const num = Number(value)
    if (Number.isNaN(num)) return String(value)

    // 工程量换算：显示值 = 原始值 × 倍率 + 偏移。
    // 典型场景：原始值 1100(mm) × 0.001 → 显示 1.1，单位跟"千米"；
    // 倍率缺省按 1 处理（旧画面没有该字段时行为不变）
    const factor = Number(element.properties?.factor)
    const offset = Number(element.properties?.offset)
    const scaled = num * (Number.isFinite(factor) ? factor : 1) + (Number.isFinite(offset) ? offset : 0)

    const decimals = Math.min(Math.max(Number(element.properties?.decimals ?? 1) || 0, 0), 3)
    const text = scaled.toFixed(decimals)
    const unit = element.properties?.unit
    return unit ? `${text} ${unit}` : text
  }

  // 底部标签条高度（有实时数值时更高；数值显示图元的值在中央，标签条只放名称）
  function getLabelHeight(element: ComponentInstance): number {
    if (isDisplayElement(element)) return 16
    return getElementValueText(element) ? 26 : 16
  }

  // 图标加载完成后递增以触发画布重绘
  const iconVersion = ref(0)

  // 组件图形（SVG 图标按比例适配到元素内部）
  function getIconImageConfig(element: ComponentInstance) {
    const def = getComponentDefinition(element.type)
    if (!def?.icon) return null

    const img = getIconImage(element.type, def.icon, '#e8f0ef', () => {
      iconVersion.value++
    })
    if (!img) return null

    const labelH = getLabelHeight(element)
    const boxW = Math.max(element.width - 12, 4)
    const boxH = Math.max(element.height - labelH - 10, 4)
    const scale = Math.min(boxW / 100, boxH / 100)
    const iconW = 100 * scale
    const iconH = 100 * scale

    return {
      image: img,
      x: (element.width - iconW) / 2,
      y: 4 + (boxH - iconH) / 2,
      width: iconW,
      height: iconH,
      listening: false,
    }
  }

  // 检查图层是否锁定
  function isLayerLocked(layerId: string): boolean {
    const layer = layerStore.getLayer(layerId)
    return layer?.locked ?? false
  }

  // 检查图层是否可见
  function isLayerVisible(layerId: string): boolean {
    const layer = layerStore.getLayer(layerId)
    return layer?.visible ?? true
  }

  // 获取元素端口
  function getElementPorts(element: ComponentInstance) {
    return [
      { id: 'top', position: 'top' as PortPosition, x: element.width / 2, y: 0 },
      { id: 'bottom', position: 'bottom' as PortPosition, x: element.width / 2, y: element.height },
      { id: 'left', position: 'left' as PortPosition, x: 0, y: element.height / 2 },
      { id: 'right', position: 'right' as PortPosition, x: element.width, y: element.height / 2 },
    ]
  }

  return {
    getElementColor,
    getElementValueText,
    isDisplayElement,
    getDisplayValueText,
    getLabelHeight,
    getIconImageConfig,
    isLayerLocked,
    isLayerVisible,
    getElementPorts,
  }
}
