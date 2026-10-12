import { ref } from 'vue'
import type { useDeviceStore } from '@/stores/deviceStore'
import type { useLayerStore } from '@/stores/layerStore'
import { getIconImage } from './iconImage'
import { DEFAULT_ELEMENT_COLOR, evaluateElementColor } from './elementStatus'
import { loadUserImage, fitRect } from './userImage'
import { getComponentDefinition } from '@/industrial/registry'
import { isNameShown, isValueShown } from './elementChrome'
import { computeElementLayout, type ElementLayout } from './elementLayout'
import { tightenIconSvg, getIconAspect } from './iconBounds'
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

  // 获取元素状态颜色（求值逻辑与 3D 场景共用，见 elementStatus.ts）
  function getElementColor(element: ComponentInstance): string {
    return evaluateElementColor(
      element.statusRules,
      deviceStore.getDeviceData(element.deviceId || element.id),
    )
  }

  /**
   * 设备线条颜色：有状态规则时用状态色（与 getElementColor 一致），
   * 没有规则时用默认青绿（和画布网格/边框保持协调）。
   *
   * 画布是纯图形形态，这条颜色就是元素唯一的「状态表达通道」。
   */
  function getIconStrokeColor(element: ComponentInstance): string {
    if (!element.statusRules?.length) return DEFAULT_ELEMENT_COLOR
    return getElementColor(element)
  }

  /**
   * 绑定点位的数据是否可信。
   * 陈旧（超时未刷新/链路中断）与脏值都按不可信处理：画面宁可显示 `--`，
   * 也不能把过期数值摆上去让操作员照着下判断。
   */
  function isBoundDataUsable(element: ComponentInstance): boolean {
    const binding = element.dataBindings?.[0]
    if (!binding) return false
    return deviceStore.isDataUsable(element.deviceId || element.id, binding.variable)
  }

  /**
   * 管道是否处于流动状态（决定虚线是否推进）。
   * 未绑定数据源时默认流动，便于组态阶段预览流向动画；
   * 数据不可信（陈旧/脏值）时不冒充流动：虚线停住，与数值显示 `--` 的口径一致。
   */
  function isPipeFlowing(element: ComponentInstance): boolean {
    const binding = element.dataBindings?.[0]
    if (!binding) return true
    if (!deviceStore.isDataUsable(element.deviceId || element.id, binding.variable)) {
      return false
    }
    const data = deviceStore.getDeviceData(element.deviceId || element.id)
    const value = Number(data[binding.variable])
    // 绑定了但设备还没有该变量：按流动处理，与未绑定口径一致
    return Number.isNaN(value) ? true : value > 0
  }

  // 元素上展示的实时数值（取第一个数据绑定变量）
  function getElementValueText(element: ComponentInstance): string {
    const binding = element.dataBindings?.[0]
    if (!binding) return ''

    if (!isBoundDataUsable(element)) return `${binding.variable}: --`

    const data = deviceStore.getDeviceData(element.deviceId || element.id)
    const value = data[binding.variable]
    if (value === undefined) return ''

    const formatted = typeof value === 'number' ? Math.round(value * 10) / 10 : value
    return `${binding.variable}: ${formatted}`
  }

  // 数值显示图元：只读展示绑定变量的格式化值（居中大字，与普通元素的顶部小字区分）
  function isDisplayElement(element: ComponentInstance): boolean {
    return element.type === 'display'
  }

  function getDisplayValueText(element: ComponentInstance): string {
    const binding = element.dataBindings?.[0]
    if (!binding) return '--'

    // 数据陈旧时同样显示 --：过期的"当前值"比没有值更危险
    if (!isBoundDataUsable(element)) return '--'

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

  /**
   * 元素内部分区（顶部数值区 / 中部图形区 / 底部名称区）。
   * 具体规则见 elementLayout.ts——信息区高度按比例自适应，空间不足时按
   * 「先撤数值、再撤名称」降级，保证设备图形永远有位置。
   */
  function getElementLayout(element: ComponentInstance): ElementLayout {
    const isDisplay = isDisplayElement(element)
    return computeElementLayout({
      width: element.width,
      height: element.height,
      isDisplay,
      wantName: isNameShown(element),
      wantValue: isValueShown(element) && (isDisplay || !!getElementValueText(element)),
    })
  }

  /** 名称区高度（管道绘制仍需知道底部留白，语义与布局一致） */
  function getLabelHeight(element: ComponentInstance): number {
    return getElementLayout(element).nameHeight
  }

  // 图标加载完成后递增以触发画布重绘
  const iconVersion = ref(0)

  /**
   * 设备图形：按内容包围盒的长宽比适配到图形区。
   *
   * 关键在 tightenIconSvg——把 viewBox 收紧到图形实际占用的范围并给出等比
   * width/height，于是 SVG 内容正好铺满整张位图，这里再做 contain 就不会留下
   * 方框死区（改造前采煤机 176×96 的元素里只有 56×23px 的可见图形）。
   * 测量不可用（非浏览器环境）时回退方形缩放，行为与改造前一致。
   */
  function getIconImageConfig(element: ComponentInstance) {
    // 图片组件由用户图整块渲染，不再叠默认图标
    if (element.type === 'image' && element.properties?.imageUrl) return null
    // 管道用原生管身图形绘制（见 pipeFlow.ts）：图标方案画不出任意长度的管段
    if (element.type === 'pipe') return null
    // 数值显示图元由实时数值大字承担，不叠内建图标（原先两者重叠成重影）
    if (isDisplayElement(element)) return null
    const def = getComponentDefinition(element.type)
    if (!def?.icon) return null

    const strokeColor = getIconStrokeColor(element)
    const img = getIconImage(element.type, tightenIconSvg(def.icon), strokeColor, () => {
      iconVersion.value++
    })
    if (!img) return null

    const layout = getElementLayout(element)
    const aspect = getIconAspect(def.icon)

    let iconW: number
    let iconH: number
    if (aspect && aspect > 0) {
      // contain：按内容长宽比铺满图形区，取较小缩放比
      if (layout.contentWidth / layout.contentHeight > aspect) {
        iconH = layout.contentHeight
        iconW = iconH * aspect
      } else {
        iconW = layout.contentWidth
        iconH = iconW / aspect
      }
    } else {
      const side = Math.min(layout.contentWidth, layout.contentHeight)
      iconW = side
      iconH = side
    }

    return {
      image: img,
      x: layout.contentX + (layout.contentWidth - iconW) / 2,
      y: layout.contentY + (layout.contentHeight - iconH) / 2,
      width: iconW,
      height: iconH,
      listening: false,
    }
  }

  /** 图片组件：用户配置的 URL/data:URL 整块渲染 */
  function getUserImageConfig(element: ComponentInstance) {
    if (element.type !== 'image') return null
    const url = String(element.properties?.imageUrl || '')
    if (!url) return null
    const img = loadUserImage(url, () => {
      iconVersion.value++
    })
    if (!img) return null
    const layout = getElementLayout(element)
    const box = {
      width: Math.max(element.width, 1),
      height: Math.max(element.height - layout.nameHeight, 1),
    }
    const fit = (element.properties?.fit as 'contain' | 'cover' | 'fill') || 'contain'
    const rect = fitRect(img, box, fit)
    return {
      image: img,
      ...rect,
      opacity: Number(element.properties?.opacity ?? 1),
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
    getIconStrokeColor,
    isPipeFlowing,
    getElementValueText,
    isDisplayElement,
    getDisplayValueText,
    getElementLayout,
    getLabelHeight,
    getIconImageConfig,
    getUserImageConfig,
    isLayerLocked,
    isLayerVisible,
    getElementPorts,
  }
}
