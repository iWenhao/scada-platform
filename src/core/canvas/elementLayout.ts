/**
 * 元素内部分区计算（纯函数，编辑器画布与预览页共用）。
 *
 * 画布形态：只有设备图形本身，没有卡片底色与描边；名称/实时值是可选的素文本。
 * 三者共用同一块矩形，因此必须把「顶部数值区 / 中部图形区 / 底部名称区」的高度
 * 算清楚——原先这些高度散落在 getLabelHeight 的 16/26 与模板里的 +4/+12 魔法
 * 数字中，元素一缩小就互相挤压。
 *
 * 两条规则：
 * 1. 信息区高度按元素高度比例取值并夹在上下限之间，而不是固定像素
 *    （固定 16/26px 在元素缩到 0.6× 时会把图形空间吃光，图形只剩十几像素）。
 * 2. 空间仍不够时按「先撤数值、再撤名称」降级，优先级：设备图形 > 名称 > 数值。
 */

/** 元素内边距：图形与元素边界之间的呼吸空间 */
const PAD = 4
/**
 * 图形可用区的最小高度：低于此值宁可撤掉文字信息，也不把设备压成一条。
 * 取值 24 是实测出来的——再低（16）时元素高 50px 仍会同时挂着名称与数值，
 * 图形只剩 18px，纵向设备基本看不清。
 */
const MIN_CONTENT_HEIGHT = 24
/** 名称区 / 数值区高度比例与上下限 */
const NAME_RATIO = 0.18
const VALUE_RATIO = 0.2
const INFO_MIN_HEIGHT = 12
const INFO_MAX_HEIGHT = 20

export interface ElementLayoutInput {
  width: number
  height: number
  /** 数值显示图元：数值即图形本身（居中大字），不占顶部数值区 */
  isDisplay?: boolean
  wantName: boolean
  wantValue: boolean
}

export interface ElementLayout {
  pad: number
  /** 底部名称区高度（0 = 不显示） */
  nameHeight: number
  /** 顶部数值区高度（0 = 不显示） */
  valueHeight: number
  /** 经降级后是否仍有名称 / 数值 */
  showName: boolean
  showValue: boolean
  /** 图形可用区（图标按此区域做 contain 适配并居中） */
  contentX: number
  contentY: number
  contentWidth: number
  contentHeight: number
  /** 名称素文本 */
  nameFontSize: number
  nameY: number
  /** 实时值素文本 */
  valueFontSize: number
  valueY: number
  /** 数值显示图元的居中大字 */
  displayFontSize: number
  displayY: number
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export function computeElementLayout(input: ElementLayoutInput): ElementLayout {
  const W = Math.max(input.width, 1)
  const H = Math.max(input.height, 1)

  let nameHeight = input.wantName ? clamp(H * NAME_RATIO, INFO_MIN_HEIGHT, INFO_MAX_HEIGHT) : 0
  let valueHeight =
    input.wantValue && !input.isDisplay
      ? clamp(H * VALUE_RATIO, INFO_MIN_HEIGHT, INFO_MAX_HEIGHT)
      : 0

  // 降级：先撤数值，再撤名称——设备图形永远优先于文字信息
  const availableHeight = () => H - PAD * 2 - nameHeight - valueHeight
  if (availableHeight() < MIN_CONTENT_HEIGHT) valueHeight = 0
  if (availableHeight() < MIN_CONTENT_HEIGHT) nameHeight = 0

  const nameFontSize = nameHeight > 0 ? clamp(nameHeight - 5, 9, 12) : 0
  const valueFontSize = valueHeight > 0 ? clamp(valueHeight - 6, 9, 12) : 0
  const displayFontSize = clamp(H * 0.24, 12, 26)

  return {
    pad: PAD,
    nameHeight,
    valueHeight,
    showName: nameHeight > 0,
    showValue: input.isDisplay ? input.wantValue : valueHeight > 0,
    contentX: PAD,
    contentY: PAD + valueHeight,
    contentWidth: Math.max(W - PAD * 2, 1),
    contentHeight: Math.max(H - PAD * 2 - valueHeight - nameHeight, 1),
    nameFontSize,
    nameY: H - nameHeight + (nameHeight - nameFontSize) / 2,
    valueFontSize,
    valueY: PAD + (valueHeight - valueFontSize) / 2,
    displayFontSize,
    displayY: (H - nameHeight) / 2 - displayFontSize / 2,
  }
}
