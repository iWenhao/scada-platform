/**
 * 图片 → SVG 的转换策略。
 *
 * 默认两条本地策略（原图内嵌 / 单色描摹）之外，这里留了一个注册表：
 * 接入云端或 AI 矢量化服务时，实现 `ImageVectorizeStrategy` 并在应用启动处调用
 * `registerImageVectorizeStrategy()` 即可出现在对话框里，不需要改 UI。
 * 约束只有一条：`run()` 返回完整 `<svg>`，且必须遵守 `recolorable` 的声明——
 * 声明可变色却没出现 `currentColor`，有状态组件会在保存校验时被拦下。
 */

import { CUSTOM_SVG_MAX_BYTES } from '@/industrial/customComponent'
import {
  IMAGE_EMBED_MAX_DIM,
  IMAGE_TRACE_MAX_DIM,
  toGrayscaleContrast,
  whitePixelRatio,
  type RawImage,
} from './preprocess'
import { buildEmbeddedSvg, colorizeTracedSvg, svgByteLength } from './svgOutput'

export interface ImageVectorizeContext {
  /** 已裁边、去底的源画布（保持原始宽高比，最长边不超过 512） */
  canvas: HTMLCanvasElement
  width: number
  height: number
  fileName?: string
  /** 原始图片；云端/AI 策略需要原图字节时用它 */
  blob?: Blob
}

export interface ImageVectorizeStrategy {
  id: string
  label: string
  hint: string
  /** 产物是否含 currentColor：有状态组件只能选 true 的策略 */
  recolorable: boolean
  run(ctx: ImageVectorizeContext): Promise<string>
}

const registry = new Map<string, ImageVectorizeStrategy>()

export function registerImageVectorizeStrategy(strategy: ImageVectorizeStrategy): void {
  registry.set(strategy.id, strategy)
}

export function getImageVectorizeStrategies(): ImageVectorizeStrategy[] {
  return [...registry.values()]
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('浏览器不支持 Canvas 2D，无法转换图片')
  return ctx
}

function drawScaled(source: HTMLCanvasElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height))
  const target = createCanvas(source.width * scale, source.height * scale)
  context2d(target).drawImage(source, 0, 0, target.width, target.height)
  return target
}

/**
 * 缩到描摹尺寸并铺白底后读出像素。
 * 必须铺白底：透明区域在 canvas 里是 (0,0,0,0)，不铺白会被描摹成黑色实心块。
 */
function readOnWhite(source: HTMLCanvasElement, maxDim: number): RawImage {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height))
  const canvas = createCanvas(source.width * scale, source.height * scale)
  const ctx = context2d(canvas)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { width: image.width, height: image.height, data: image.data }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error('图片编码失败'))
    reader.readAsDataURL(blob)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败'))),
      'image/webp',
      quality,
    )
  })
}

/** 原图内嵌：逐步降尺寸/质量，直到产物落在自定义组件的 100KB 上限内 */
const embeddedStrategy: ImageVectorizeStrategy = {
  id: 'embedded',
  label: '原图内嵌',
  hint: '最像现场设备，但不能随状态变色',
  recolorable: false,
  async run(ctx) {
    const steps = [
      { dim: IMAGE_EMBED_MAX_DIM, quality: 0.85 },
      { dim: 384, quality: 0.8 },
      { dim: 256, quality: 0.75 },
    ]
    for (const step of steps) {
      const canvas = drawScaled(ctx.canvas, step.dim)
      const blob = await canvasToBlob(canvas, step.quality)
      const svg = buildEmbeddedSvg({
        width: canvas.width,
        height: canvas.height,
        mime: blob.type || 'image/png',
        base64: await blobToBase64(blob),
      })
      if (svgByteLength(svg) <= CUSTOM_SVG_MAX_BYTES) return svg
    }
    throw new Error('图片压缩到最小档仍超过 100KB，请换一张更简单的图')
  },
}

/** 调色板：白 / 浅灰 / 中灰 / 深灰，按最近色量化，再据此还原明暗层次 */
const TRACE_PALETTE = [
  { r: 255, g: 255, b: 255, a: 255 },
  { r: 200, g: 200, b: 200, a: 255 },
  { r: 130, g: 130, b: 130, a: 255 },
  { r: 40, g: 40, b: 40, a: 255 },
]

/** 单色描摹：轮廓与明暗保留，颜色交给 currentColor */
const tracedStrategy: ImageVectorizeStrategy = {
  id: 'traced',
  label: '矢量描摹',
  hint: '矢量线稿，可随状态变色；照片细节会简化',
  recolorable: true,
  async run(ctx) {
    const attempts = [
      { dim: IMAGE_TRACE_MAX_DIM, pathomit: 12, ltres: 1.5, qtres: 1.5, blurradius: 1 },
      { dim: IMAGE_TRACE_MAX_DIM, pathomit: 20, ltres: 2.2, qtres: 2.2, blurradius: 2 },
      { dim: 240, pathomit: 16, ltres: 2, qtres: 2, blurradius: 1.5 },
    ]
    const tracer = (await import('imagetracerjs')).default
    let last = ''
    for (const attempt of attempts) {
      const image = readOnWhite(ctx.canvas, attempt.dim)
      const whiteIsBackground = whitePixelRatio(image) >= 0.55
      toGrayscaleContrast(image)
      const traced = tracer.imagedataToSVG(image, {
        pal: TRACE_PALETTE,
        colorsampling: 0,
        numberofcolors: TRACE_PALETTE.length,
        pathomit: attempt.pathomit,
        ltres: attempt.ltres,
        qtres: attempt.qtres,
        blurradius: attempt.blurradius,
        strokewidth: 0,
      })
      last = colorizeTracedSvg(traced, { whiteIsBackground })
      if (last && svgByteLength(last) <= CUSTOM_SVG_MAX_BYTES) return last
    }
    if (!last) throw new Error('没能从这张图里提取出轮廓，请换对比度更高的设备图')
    throw new Error('描摹结果仍超过 100KB，请换一张更简单的图，或改用「原图内嵌」')
  },
}

registerImageVectorizeStrategy(embeddedStrategy)
registerImageVectorizeStrategy(tracedStrategy)
