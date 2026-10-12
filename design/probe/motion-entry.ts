/**
 * 运转动效核对页（临时校验产物，不进构建）。
 *
 * 目的：用**仓库里的真实模块**在浏览器里实际画一遍，确认
 *   1. 可动件（滚筒截齿 / 截割头截齿 / 带面虚线）落在机身上的正确位置；
 *   2. 旋转围绕的是滚筒圆心，而不是图片边框的角；
 *   3. 角度为 0（停机）时的外观与改造前的整张图标完全一致。
 *
 * 几何全部来自 elementMotion / elementLayout / iconBounds 的真实导出，
 * 这里只做「把算出来的 config 交给 Konva 画出来」这一层，不重算任何坐标。
 */
import Konva from 'konva'
import type { ComponentDefinition, ComponentInstance } from '@/types/scada'
import { registerComponents, getComponentDefinition } from '@/industrial/registry'
import {
  coalComponents,
  ShearerDefinition,
  RoadheaderDefinition,
  ConveyorDefinition,
} from '@/industrial/coal'
import { computeElementLayout } from '@/core/canvas/elementLayout'
import { makeIconFrame, getRotorConfigs, getBeltConfigs } from '@/core/canvas/elementMotion'
import { getIconBounds, tightenIconSvg } from '@/core/canvas/iconBounds'
import { getIconImage } from '@/core/canvas/iconImage'

registerComponents(coalComponents)

const RUN_COLOR = '#00d4aa'
const STOP_COLOR = '#666666'

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

/**
 * 画一个元素：图标 + 可动件，完全复刻渲染层的调用顺序。
 * 返回 false 表示位图还没解码好（调用方重试）。
 */
function drawElement(
  layer: Konva.Layer,
  def: ComponentDefinition,
  opts: {
    x: number
    y: number
    width: number
    height: number
    /** 旋转角（度）；皮带忽略 */
    angle: number
    /** 带面位移（px）；旋转件忽略 */
    beltOffset: number
    color: string
    caption: string
  },
): boolean {
  const layout = computeElementLayout({
    width: opts.width,
    height: opts.height,
    wantName: false,
    wantValue: false,
  })
  const element = elementOf(def, opts.width, opts.height)

  const bounds = getIconBounds(def.icon)
  if (!bounds) return false
  const frame = makeIconFrame(bounds, layout)

  // —— 设备图形（与 useElementVisuals.getIconImageConfig 同一套矩形） ——
  const iconImg = getIconImage(def.type, tightenIconSvg(def.icon), opts.color)
  if (!iconImg) return false

  const rotors = def.motion?.rotors?.length
    ? getRotorConfigs(element, layout, opts.color, opts.angle)
    : []
  if (def.motion?.rotors?.length && rotors.length !== def.motion.rotors.length) return false

  const belts = def.motion?.belts?.length
    ? getBeltConfigs(element, layout, opts.color, opts.beltOffset)
    : []

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

  // 旋转件：绕着 x/y（圆心）转，offset 把圆心对齐到图片内部
  for (const config of rotors) {
    group.add(new Konva.Image(config as Konva.ImageConfig))
    group.add(
      new Konva.Circle({
        x: config.x,
        y: config.y,
        radius: 2,
        fill: '#ff4bd8',
        listening: false,
      }),
    )
  }

  // 带面流动虚线
  for (const config of belts) {
    group.add(new Konva.Line(config as Konva.LineConfig))
  }

  group.add(
    new Konva.Text({
      x: 0,
      y: opts.height + 6,
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
}

const ROWS: ProbeRow[] = [
  {
    def: ShearerDefinition,
    width: 176,
    height: 96,
    angles: [0, 20, 40],
    beltOffsets: [0, 0, 0],
    color: RUN_COLOR,
  },
  {
    def: RoadheaderDefinition,
    width: 160,
    height: 96,
    angles: [0, 35, 70],
    beltOffsets: [0, 0, 0],
    color: RUN_COLOR,
  },
  {
    def: ConveyorDefinition,
    width: 176,
    height: 80,
    angles: [0, 0, 0],
    beltOffsets: [0, 18, 36],
    color: RUN_COLOR,
  },
  {
    def: ShearerDefinition,
    width: 176,
    height: 96,
    angles: [0, 0, 0],
    beltOffsets: [0, 0, 0],
    color: STOP_COLOR,
  },
]

const CELL_W = 210
const CELL_H = 150

function buildStage(container: HTMLDivElement) {
  const stage = new Konva.Stage({
    container,
    width: CELL_W * 3 + 20,
    height: CELL_H * ROWS.length + 20,
  })
  const layer = new Konva.Layer()
  stage.add(layer)
  return { stage, layer }
}

function drawAll(layer: Konva.Layer): boolean {
  layer.destroyChildren()
  let ok = true
  ROWS.forEach((row, r) => {
    row.angles.forEach((angle, c) => {
      const caption = row.def.motion?.belts?.length
        ? `带面位移 ${row.beltOffsets[c]}px`
        : `角度 ${angle}°`
      const drawn = drawElement(layer, row.def, {
        x: 10 + c * CELL_W,
        y: 10 + r * CELL_H,
        width: row.width,
        height: row.height,
        angle,
        beltOffset: row.beltOffsets[c],
        color: row.color,
        caption: row.def.name + ' · ' + caption,
      })
      if (!drawn) ok = false
    })
  })
  layer.draw()
  return ok
}

/** 几何核对：可动件是否与图标同心、是否落在图形区内 */
function geometryReport(): string[] {
  const lines: string[] = []
  for (const def of [ShearerDefinition, RoadheaderDefinition, ConveyorDefinition]) {
    const width = def.type === 'roadheader' ? 160 : def.type === 'conveyor' ? 176 : 176
    const height = def.type === 'conveyor' ? 80 : 96
    const layout = computeElementLayout({ width, height, wantName: false, wantValue: false })
    const bounds = getIconBounds(def.icon)
    if (!bounds) {
      lines.push(`${def.name}: 无法测量图标包围盒`)
      continue
    }
    const frame = makeIconFrame(bounds, layout)
    lines.push(
      `${def.name}  元素 ${width}×${height}  图标内容比 ${(bounds.width / bounds.height).toFixed(2)}  ` +
        `图标矩形 ${frame.rect.width.toFixed(1)}×${frame.rect.height.toFixed(1)} @(${frame.rect.x.toFixed(1)},${frame.rect.y.toFixed(1)})`,
    )

    // 图标里的圆（滚筒 / 截割头 / 托辊）——旋转中心必须与其中之一同心
    const circles = [...def.icon.matchAll(/<circle\b[^>]*?cx="([\d.]+)"[^>]*?cy="([\d.]+)"/g)].map(m => [
      parseFloat(m[1]),
      parseFloat(m[2]),
    ])
    const circlePoints = circles.map(([cx, cy]) => `${frame.mapX(cx).toFixed(2)},${frame.mapY(cy).toFixed(2)}`)

    const element = elementOf(def, width, height)
    const rotors = getRotorConfigs(element, layout, RUN_COLOR, 0)
    rotors.forEach((cfg, i) => {
      const rotor = def.motion!.rotors![i]
      const center = `${cfg.x.toFixed(2)},${cfg.y.toFixed(2)}`
      const left = cfg.x - cfg.offsetX
      const top = cfg.y - cfg.offsetY
      lines.push(
        `  · 旋转件${i + 1}  圆心(${rotor.cx},${rotor.cy}) → 元素 ${center}  ` +
          `图片 ${cfg.width.toFixed(1)}×${cfg.height.toFixed(1)} @(${left.toFixed(1)},${top.toFixed(1)})  ` +
          `${circlePoints.includes(center) ? '✓ 与图标圆同心' : '✗ 与任何图标圆都不同心'}`,
      )
    })

    const belts = getBeltConfigs(element, layout, RUN_COLOR, 0)
    belts.forEach((cfg, i) => {
      const belt = def.motion!.belts![i]
      lines.push(
        `  · 带面${i + 1}  y=${belt.y} → 元素 y=${cfg.points[1].toFixed(2)}  ` +
          `x ${cfg.points[0].toFixed(1)}→${cfg.points[2].toFixed(1)}  线宽 ${cfg.strokeWidth.toFixed(1)}  虚线段 ${(cfg.dash as number[])[0].toFixed(1)}`,
      )
    })
  }
  return lines
}

const container = document.getElementById('stage') as HTMLDivElement
const { layer } = buildStage(container)

let attempts = 0
function attempt() {
  attempts++
  const ok = drawAll(layer)
  if (!ok && attempts < 60) {
    setTimeout(attempt, 50)
    return
  }
  const report = document.getElementById('geo') as HTMLElement
  report.textContent = geometryReport().join('\n')
  ;(window as unknown as { __DONE__: boolean }).__DONE__ = true
}

attempt()
