/**
 * 运转动效核对页（临时校验产物，不进构建）。
 *
 * 目的：用**仓库里的真实模块**在浏览器里实际画一遍，确认
 *   1. 可动件（滚筒 / 截割头截齿 / 带面虚线）落在机身上的正确位置；
 *   2. 旋转围绕的是滚筒圆心，而不是图片边框的角；
 *   3. 滚筒被挖出去之后，角度 0 的样子与**未挖取的整张素材图**逐像素重合。
 *
 * 第 3 条靠 ghost 叠图核对：素材原始图标（滚筒还在里面）按它自己的 contain 变换画进
 * 同一格、半透明压在挖取后的版本上——机身或滚筒对不齐会直接看成重影。
 *
 * 几何全部来自 elementMotion / elementLayout / iconBounds 的真实导出，
 * 这里只做「把算出来的 config 交给 Konva 画出来」这一层，不重算任何坐标。
 */
import Konva from 'konva'
import type { ComponentDefinition, ComponentInstance, ViewMode } from '@/types/scada'
import { registerComponents } from '@/industrial/registry'
import { coalComponents } from '@/industrial/coal'
import { coalAssetIcons } from '@/industrial/coal/assets.generated'
import { computeElementLayout, type ElementLayout } from '@/core/canvas/elementLayout'
import { makeIconFrame, getRotorConfigs, getBeltConfigs, type IconFrame } from '@/core/canvas/elementMotion'
import { getIconBounds, tightenIconSvg } from '@/core/canvas/iconBounds'
import { getIconImage } from '@/core/canvas/iconImage'

registerComponents(coalComponents)

const byType = (type: string): ComponentDefinition => coalComponents.find(d => d.type === type)!
const SHEARER = byType('coal_shearer_wide')
const ROADHEADER = byType('roadheader')
const CONVEYOR = byType('conveyor')

const RUN_COLOR = '#00d4aa'
const STOP_COLOR = '#666666'
/** ghost 用洋红：与运转绿、停机灰都拉开，重影一眼可见 */
const GHOST_COLOR = 'rgba(255,75,216,0.9)'

function elementOf(def: ComponentDefinition, width: number, height: number): ComponentInstance {
  return {
    id: `probe_${def.type}`,
    type: def.type,
    x: 0,
    y: 0,
    width,
    height,
    rotation: 0,
    name: def.name,
    layerId: 'probe',
    properties: {},
    statusRules: [],
    dataBindings: [],
  }
}

function layoutOf(width: number, height: number): ElementLayout {
  return computeElementLayout({ width, height, wantName: false, wantValue: false })
}

/** 图标在元素内的坐标映射；测不到包围盒返回 null（调用方重试） */
function frameOf(svg: string, layout: ElementLayout): IconFrame | null {
  const bounds = getIconBounds(svg)
  if (!bounds) return null
  return makeIconFrame(bounds, layout)
}

interface DrawOpts {
  x: number
  y: number
  width: number
  height: number
  /** 旋转角（度）；皮带忽略 */
  angle: number
  /** 带面位移（px）；旋转件忽略 */
  beltOffset: number
  color: string
  mode: ViewMode
  caption: string
  /** 挖取前的整张素材图，半透明叠在同一格上用于对重影 */
  ghostSvg?: string
}

/** 画一个元素：图标 + 可动件，完全复刻渲染层的调用顺序 */
function drawElement(layer: Konva.Layer, def: ComponentDefinition, opts: DrawOpts): boolean {
  const layout = layoutOf(opts.width, opts.height)
  const frame = frameOf(def.icon, layout)
  if (!frame) return false
  const element = elementOf(def, opts.width, opts.height)

  // —— 设备图形（与 useElementVisuals.getIconImageConfig 同一套矩形） ——
  const iconImg = getIconImage(`${def.type}|${opts.mode}`, tightenIconSvg(def.icon), opts.color, opts.mode)
  if (!iconImg) return false

  const rotors = def.motion?.rotors?.length
    ? getRotorConfigs(element, layout, opts.color, opts.mode, opts.angle)
    : []
  if (def.motion?.rotors?.length && rotors.length !== def.motion.rotors.length) return false

  const belts = def.motion?.belts?.length ? getBeltConfigs(element, layout, opts.color, opts.beltOffset) : []

  const group = new Konva.Group({ x: opts.x, y: opts.y })
  layer.add(group)

  // 图形区参考框（虚线）：用于核对图标是否与可动件同处一套变换
  group.add(
    new Konva.Rect({
      x: frame.rect.x,
      y: frame.rect.y,
      width: frame.rect.width,
      height: frame.rect.height,
      stroke: 'rgba(255,255,255,0.16)',
      strokeWidth: 1,
      dash: [3, 3],
      listening: false,
    }),
  )

  group.add(
    new Konva.Image({
      image: iconImg,
      x: frame.rect.x,
      y: frame.rect.y,
      width: frame.rect.width,
      height: frame.rect.height,
      listening: false,
    }),
  )

  // 旋转件：绕 x/y（圆心）转，offset 把圆心对齐到图片内部
  for (const config of rotors) {
    group.add(new Konva.Image(config as Konva.ImageConfig))
    group.add(new Konva.Circle({ x: config.x, y: config.y, radius: 2, fill: '#ff4bd8', listening: false }))
  }

  // 带面流动虚线
  for (const config of belts) {
    group.add(new Konva.Line(config as Konva.LineConfig))
  }

  if (opts.ghostSvg) {
    const ghostFrame = frameOf(opts.ghostSvg, layout)
    const ghostImg = getIconImage(`${def.type}#ghost`, tightenIconSvg(opts.ghostSvg), GHOST_COLOR, opts.mode)
    if (ghostFrame && ghostImg) {
      group.add(
        new Konva.Image({
          image: ghostImg,
          x: ghostFrame.rect.x,
          y: ghostFrame.rect.y,
          width: ghostFrame.rect.width,
          height: ghostFrame.rect.height,
          opacity: 0.4,
          listening: false,
        }),
      )
    }
  }

  group.add(
    new Konva.Text({
      x: 0,
      y: opts.height + 8,
      width: opts.width,
      align: 'center',
      text: opts.caption,
      fontSize: 11,
      fill: 'rgba(220,232,238,0.75)',
      listening: false,
    }),
  )

  return true
}

interface ProbeRow {
  def: ComponentDefinition
  width: number
  height: number
  /** 逐列的旋转角（度） */
  angles: number[]
  /** 逐列的带面位移（px） */
  beltOffsets: number[]
  color: string
  mode: ViewMode
  label: string
  /** 第一格是否叠未挖取的原始素材图 */
  ghost?: boolean
}

const SHEARER_W = 300
const SHEARER_H = 114

const ROWS: ProbeRow[] = [
  {
    def: SHEARER,
    width: SHEARER_W,
    height: SHEARER_H,
    angles: [0, 25, 50],
    beltOffsets: [0, 0, 0],
    color: RUN_COLOR,
    mode: '2d',
    label: '采煤机 2D（第 1 格叠原始素材图对重影）',
    ghost: true,
  },
  {
    def: SHEARER,
    width: SHEARER_W,
    height: SHEARER_H,
    angles: [0, 25, 50],
    beltOffsets: [0, 0, 0],
    color: RUN_COLOR,
    mode: '25d',
    label: '采煤机 2.5D（线条稿应无光照差异）',
  },
  {
    def: SHEARER,
    width: SHEARER_W,
    height: SHEARER_H,
    angles: [0, 0, 0],
    beltOffsets: [0, 0, 0],
    color: STOP_COLOR,
    mode: '2d',
    label: '采煤机 停机色',
  },
  {
    def: ROADHEADER,
    width: 160,
    height: 96,
    angles: [0, 35, 70],
    beltOffsets: [0, 0, 0],
    color: RUN_COLOR,
    mode: '2d',
    label: '掘进机',
  },
  {
    def: CONVEYOR,
    width: 176,
    height: 80,
    angles: [0, 0, 0],
    beltOffsets: [0, 18, 36],
    color: RUN_COLOR,
    mode: '2d',
    label: '皮带输送机',
  },
]

const CELL_W = SHEARER_W + 30
const CELL_H = 170

function drawAll(layer: Konva.Layer): boolean {
  layer.destroyChildren()
  let ok = true
  ROWS.forEach((row, r) => {
    row.angles.forEach((angle, c) => {
      const caption = row.def.motion?.belts?.length ? `带面位移 ${row.beltOffsets[c]}px` : `角度 ${angle}°`
      const drawn = drawElement(layer, row.def, {
        x: 10 + c * CELL_W,
        y: 10 + r * CELL_H,
        width: row.width,
        height: row.height,
        angle,
        beltOffset: row.beltOffsets[c],
        color: row.color,
        mode: row.mode,
        caption: (c === 0 ? `${row.label} · ` : '') + caption,
        ghostSvg: row.ghost && c === 0 ? coalAssetIcons[row.def.type] : undefined,
      })
      if (!drawn) ok = false
    })
  })
  layer.draw()
  return ok
}

/** 几何核对：挖取后的滚筒圆心相对未挖取版本偏了多少像素、滚筒是否溢出图形区 */
function geometryReport(): string[] {
  const lines: string[] = []
  for (const row of ROWS.filter(r => r.def.motion?.rotors?.length)) {
    const def = row.def
    const layout = layoutOf(row.width, row.height)
    const frame = frameOf(def.icon, layout)
    if (!frame) {
      lines.push(`${def.name}: 无法测量图标包围盒`)
      continue
    }
    const ghostSvg = coalAssetIcons[def.type]
    const ghostFrame = ghostSvg ? frameOf(ghostSvg, layout) : null
    lines.push(
      `${def.name}（${row.mode}） 元素 ${row.width}×${row.height}  内容比 ${(
        frame.bounds.width / frame.bounds.height
      ).toFixed(2)}  矩形 ${frame.rect.width.toFixed(1)}×${frame.rect.height.toFixed(1)} @(${frame.rect.x.toFixed(
        1,
      )},${frame.rect.y.toFixed(1)})`,
    )

    const element = elementOf(def, row.width, row.height)
    getRotorConfigs(element, layout, row.color, row.mode, 0).forEach((cfg, i) => {
      const rotor = def.motion!.rotors![i]
      const left = cfg.x - cfg.offsetX
      const top = cfg.y - cfg.offsetY
      const delta = ghostFrame
        ? `Δ vs 未挖取 = (${(cfg.x - ghostFrame.mapX(rotor.cx)).toFixed(2)}, ${(
            cfg.y - ghostFrame.mapY(rotor.cy)
          ).toFixed(2)}) px`
        : '无对照图标'
      const outLeft = Math.max(0, frame.rect.x - left)
      const outRight = Math.max(0, left + cfg.width - frame.rect.x - frame.rect.width)
      const outTop = Math.max(0, frame.rect.y - top)
      const outBottom = Math.max(0, top + cfg.height - frame.rect.y - frame.rect.height)
      lines.push(
        `  · 旋转件${i + 1}  圆心(${rotor.cx},${rotor.cy}) → 元素 (${cfg.x.toFixed(2)},${cfg.y.toFixed(
          2,
        )})  图片 ${cfg.width.toFixed(1)}×${cfg.height.toFixed(1)} @(${left.toFixed(1)},${top.toFixed(1)})  ` +
          `${delta}  溢出图形区 左${outLeft.toFixed(1)} 右${outRight.toFixed(1)} 上${outTop.toFixed(1)} 下${outBottom.toFixed(
            1,
          )} px`,
      )
    })
  }
  return lines
}

const container = document.getElementById('stage') as HTMLDivElement
const stage = new Konva.Stage({ container, width: CELL_W * 3 + 20, height: CELL_H * ROWS.length + 20 })
const layer = new Konva.Layer()
stage.add(layer)

let attempts = 0
function attempt() {
  attempts++
  const ok = drawAll(layer)
  if (!ok && attempts < 60) {
    setTimeout(attempt, 50)
    return
  }
  document.getElementById('geo')!.textContent = geometryReport().join('\n')
  ;(window as unknown as { __DONE__: boolean }).__DONE__ = true
}

attempt()
