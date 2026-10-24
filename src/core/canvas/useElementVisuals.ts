import { ref } from 'vue'
import type { useDeviceStore } from '@/stores/deviceStore'
import { getIconImage } from './iconImage'
import { evaluateElementState, type ElementStateResult } from './elementStatus'
import { loadUserImage, fitRect } from './userImage'
import { getComponentDefinition, getElementCapabilities } from '@/industrial/registry'
import { isNameShown, isValueShown } from './elementChrome'
import { computeElementLayout, fitIconRect, type ElementLayout } from './elementLayout'
import { tightenIconSvg, getIconAspect } from './iconBounds'
import { isOverlayType } from './overlayTypes'
import type { ComponentInstance, ViewMode } from '@/types/scada'
import type { PortPosition } from '@/types/connection'

type DeviceStore = ReturnType<typeof useDeviceStore>

/**
 * 元素视觉呈现：状态着色、实时数值、图标与端口。
 */
export function useElementVisuals(options: {
  deviceStore: DeviceStore
  /**
   * 渲染风格读取器（工程级设置，编辑器切换、运行端只读跟随）。
   * 只有消费图标的调用方需要传；不传按平面处理，未迁移的线条稿图标不受影响。
   */
  viewMode?: () => ViewMode
}) {
  const { deviceStore } = options
  const readViewMode = options.viewMode ?? (() => '2d' as ViewMode)

  /**
   * 元素当前状态：先判「未绑定」，再按用户规则首匹配。
   *
   * 未绑定的口径与数值显示 `--` 完全一致（见 isBoundDataUsable）：没有任何一个绑定
   * 变量取到可信数据——包括压根没绑定、绑了但设备没有该变量、以及数据陈旧/脏值。
   * 未绑定是系统档，用户规则里配不出这一档，也盖不掉它。
   */
  function resolveElementState(element: ComponentInstance): ElementStateResult {
    const deviceId = element.deviceId || element.id
    const usable = (element.dataBindings ?? []).some(
      (b) => b.variable && deviceStore.isDataUsable(deviceId, b.variable),
    )
    return evaluateElementState(
      element.statusRules,
      usable ? deviceStore.getDeviceData(deviceId) : null,
    )
  }

  // 获取元素状态颜色（求值逻辑抽为纯函数，编辑器与预览页共用，见 elementStatus.ts）
  function getElementColor(element: ComponentInstance): string {
    return resolveElementState(element).color
  }

  /**
   * 设备线条颜色：状态色（含未绑定灰），无状态规则时为默认青绿。
   *
   * 画布是纯图形形态，这条颜色就是元素唯一的「状态表达通道」。
   */
  function getIconStrokeColor(element: ComponentInstance): string {
    return resolveElementState(element).color
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
   * 名称条要同时满足两个条件：用户打开了开关，且该组件类型支持名称条。
   *
   * 定义里关掉 `nameLabel` 的类型（如 HTML 挂件——内容已经写着「07:15:08」，
   * 再在下面补一行「时间」不增加信息）即便 `showName` 为 true 也不画：
   * 面板上已经没有这个开关，只裁 UI 的话旧数据会变成「找不到开关却仍有标签」，
   * 用户再也关不掉。
   */
  function wantsNameLabel(element: ComponentInstance): boolean {
    return isNameShown(element) && getElementCapabilities(element.type).nameLabel
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
      wantName: wantsNameLabel(element),
      wantValue: isValueShown(element) && (isDisplay || !!getElementValueText(element)),
    })
  }

  /** 名称区高度（管道绘制仍需知道底部留白，语义与布局一致） */
  function getLabelHeight(element: ComponentInstance): number {
    return getElementLayout(element).nameHeight
  }

  /**
   * 图标加载完成后递增以触发画布重绘。
   *
   * ⚠️ 这个 ref **必须被读一次才会生效**：Vue 只在渲染期间读到的 ref 上登记依赖，
   * 只写不读等于没写。因此 getIconImageConfig / getUserImageConfig 里各读一次
   * （`void iconVersion.value`），把调用方（CanvasElements / PreviewStage 的渲染）
   * 登记为依赖方，onLoad 回调再递增才会重跑、把 v-image 补上。
   *
   * 曾在这里踩过：iconVersion 一度只写不读，导致首次拖入的设备一律不显示，
   * 要等下一次无关重绘（例如再拖一个元素）才补画出来。对照同目录
   * ElementMotion.vue 的 rotors computed——同一手法，改的时候别只改一边。
   */
  const iconVersion = ref(0)

  /**
   * 设备图形：按内容包围盒的长宽比适配到图形区。
   *
   * 关键在 tightenIconSvg——把 viewBox 收紧到图形实际占用的范围并给出等比
   * width/height，于是 SVG 内容正好铺满整张位图，这里再做 contain 就不会留下
   * 方框死区（改造前采煤机 176×96 的元素里只有 56×23px 的可见图形）。
   * 测量不可用（非浏览器环境）时回退方形缩放，行为与改造前一致。
   */
  /**
   * 该元素是否由 HTML overlay 呈现（Konva 侧不再画图标）。
   *
   * 这些类型的图形完全由 overlay 里的 ECharts / DOM 画出来，若再走 Konva 图标
   * 路径就会在 overlay 底下多画一张缩略图——表现为「图表/挂件背后有个淡淡的图标」。
   * 类型清单在 overlayTypes.ts，与 HtmlOverlay.vue 共用同一份。
   */
  function isOverlayElement(element: ComponentInstance): boolean {
    return isOverlayType(element.type)
  }

  function getIconImageConfig(element: ComponentInstance) {
    // 订阅图标解码完成信号（见 iconVersion 注释）：位图是异步的，首次求值必然
    // 拿不到 image 而返回 null，必须靠这个依赖在 onLoad 后重跑一次
    void iconVersion.value
    // 图片组件由用户图整块渲染，不再叠默认图标
    if (element.type === 'image' && element.properties?.imageUrl) return null
    // 管道用原生管身图形绘制（见 pipeFlow.ts）：图标方案画不出任意长度的管段
    if (element.type === 'pipe') return null
    // 数值显示图元由实时数值大字承担，不叠内建图标（原先两者重叠成重影）
    if (isDisplayElement(element)) return null
    // 操作按钮由原生圆角矩形 + 指令文字绘制，图标只是组件面板里的缩略图
    if (element.type === 'command-button') return null
    // 纯文本与 HTML overlay 类元素同理：图形另有承载，不再叠内建图标
    if (element.type === 'text' || isOverlayElement(element)) return null
    const def = getComponentDefinition(element.type)
    if (!def?.icon) return null

    const mode = readViewMode()
    // 素材导入件的 2D 必须与素材原稿一致：icon 放原稿，面基稿只走 2.5D。
    // 手绘图元没有 icon25d，两种模式共用 icon。
    const icon = mode === '25d' && def.icon25d ? def.icon25d : def.icon
    const strokeColor = getIconStrokeColor(element)
    const img = getIconImage(
      element.type,
      tightenIconSvg(icon),
      strokeColor,
      mode,
      () => {
        iconVersion.value++
      },
    )
    if (!img) return null

    const layout = getElementLayout(element)
    const aspect = getIconAspect(icon)

    // contain 适配到图形区：矩形由 elementLayout.fitIconRect 统一给出，
    // 运转动效的可动件按同一矩形换算坐标，两边不会漂移
    const rect = fitIconRect(
      layout.contentX,
      layout.contentY,
      layout.contentWidth,
      layout.contentHeight,
      aspect ?? 0,
    )

    return {
      image: img,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      listening: false,
    }
  }

  /**
   * 设备运转动效状态；null 表示该元素没有可动件，或用户关掉了动效。
   *
   * 判定顺序：可动件声明 → animate 开关 → **状态接管** → 驱动变量阈值。
   *
   * 「状态接管」是这里唯一与状态规则耦合的一步，也是修正一条老毛病的：动效原本只做
   * 数值阈值判定，与状态完全无关，于是 `state = 2`（报警）照样满足 `> 0.1`，故障的
   * 设备在画面上还在转。两种情况直接停转：
   * - 未绑定（灰）：画面上不该出现「灰着还在转」的设备；
   * - 命中的规则标了 `stopMotion`：故障/停机这类状态由用户显式声明停机。
   *
   * 无状态组件（`statusRules` 为空）没有未绑定这一档，动效按自身开关一直转——
   * 装饰风车一类的纯装饰用途不需要接数据。
   */
  function getElementMotion(element: ComponentInstance): { running: boolean; speed: number } | null {
    const motion = getComponentDefinition(element.type)?.motion
    if (!motion || !(motion.rotors?.length || motion.belts?.length)) return null
    if (element.properties?.animate === false) return null

    const state = resolveElementState(element)
    if (state.unbound || state.rule?.stopMotion) return { running: false, speed: 0 }

    const binding = motion.driveVariable
      ? element.dataBindings?.find(b => b.variable === motion.driveVariable)
      : element.dataBindings?.[0]
    if (!binding) return { running: true, speed: 1 }

    const deviceId = element.deviceId || element.id
    if (!deviceStore.isDataUsable(deviceId, binding.variable)) {
      return { running: false, speed: 0 }
    }

    const raw = Number(deviceStore.getDeviceData(deviceId)[binding.variable])
    // 绑定了但设备还没有该变量：按运转处理，与未绑定的口径一致
    if (Number.isNaN(raw)) return { running: true, speed: 1 }

    const speed = Math.abs(raw)
    return { running: speed > (motion.threshold ?? 0.1), speed }
  }

  /** 图片组件：用户配置的 URL/data:URL 整块渲染 */
  function getUserImageConfig(element: ComponentInstance) {
    // 同上：用户图同样是异步加载，首次求值返回 null，靠这个依赖重跑补画
    void iconVersion.value
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
    resolveElementState,
    isPipeFlowing,
    getElementMotion,
    getElementValueText,
    isDisplayElement,
    getDisplayValueText,
    getElementLayout,
    getLabelHeight,
    getIconImageConfig,
    getUserImageConfig,
    isOverlayElement,
    getElementPorts,
    // 导出以便调用方（画布 / 预览）显式依赖它；组件内部已自行订阅
    iconVersion,
  }
}
