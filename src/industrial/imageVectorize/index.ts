/**
 * 设备图片 → 可用 SVG 的入口。
 *
 * 流程：解码 → 缩到分析尺寸 → 识别/去除背景并裁边 → 交给各策略生成 SVG。
 * 分析尺寸与产物尺寸分开：4000px 手机原图只用于取内容框，真正参与编码/描摹的
 * 是裁切后的 512px 画布，避免大图把主线程卡死。
 */

import {
  analyzeContent,
  IMAGE_ANALYZE_MAX_DIM,
  IMAGE_EMBED_MAX_DIM,
  IMAGE_SOURCE_MAX_BYTES,
  IMAGE_URL_TIMEOUT_MS,
  isSupportedImageMime,
  validateImageSize,
  validateImageUpload,
} from './preprocess'
import {
  getImageVectorizeStrategies,
  type ImageVectorizeStrategy,
} from './strategies'
import { svgByteLength } from './svgOutput'

export type { ImageVectorizeStrategy, ImageVectorizeContext } from './strategies'
export { registerImageVectorizeStrategy, getImageVectorizeStrategies } from './strategies'
export {
  IMAGE_SOURCE_MAX_BYTES,
  SUPPORTED_IMAGE_TYPES,
  validateImageUpload,
} from './preprocess'

export interface ImageConversionItem {
  strategy: ImageVectorizeStrategy
  svg: string
  bytes: number
}

export interface ImageConversionFailure {
  label: string
  message: string
}

export interface ImageConversionOutcome {
  results: ImageConversionItem[]
  failures: ImageConversionFailure[]
  /** 预处理阶段的说明（是否去底、裁边），展示给用户 */
  notes: string[]
}

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // 少数浏览器对带色彩配置的 WebP 解码失败，回落到 <img>
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('图片解码失败，请确认文件没有损坏'))
      el.src = url
    })
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function prepareSource(decoded: DecodedImage): { canvas: HTMLCanvasElement; notes: string[] } {
  const notes: string[] = []
  const scale = Math.min(1, IMAGE_ANALYZE_MAX_DIM / Math.max(decoded.width, decoded.height))
  const analysis = createCanvas(decoded.width * scale, decoded.height * scale)
  const ctx = analysis.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('浏览器不支持 Canvas 2D，无法转换图片')
  ctx.drawImage(decoded.source, 0, 0, analysis.width, analysis.height)

  const image = ctx.getImageData(0, 0, analysis.width, analysis.height)
  const content = analyzeContent(image)
  ctx.putImageData(image, 0, 0)

  if (content.background === 'flat') notes.push('已自动去掉纯色背景并裁边')
  else if (content.background === 'alpha') notes.push('已按透明区域裁边')
  else notes.push('未识别到纯色背景，保留整张图片')

  const targetScale = Math.min(
    1,
    IMAGE_EMBED_MAX_DIM / Math.max(content.box.width, content.box.height),
  )
  const processed = createCanvas(content.box.width * targetScale, content.box.height * targetScale)
  const pctx = processed.getContext('2d')
  if (!pctx) throw new Error('浏览器不支持 Canvas 2D，无法转换图片')
  pctx.drawImage(
    analysis,
    content.box.x,
    content.box.y,
    content.box.width,
    content.box.height,
    0,
    0,
    processed.width,
    processed.height,
  )

  return { canvas: processed, notes }
}

/** 生成所有已注册策略的预览产物；单个策略失败不影响其它策略 */
export async function convertImageToSvg(blob: Blob): Promise<ImageConversionOutcome> {
  // 从 URL 下载的 blob 可能没有 MIME（服务端未发 Content-Type），此时只卡体积，
  // 真实格式交给解码环节；本地文件与剪贴板仍走完整的 MIME/扩展名双判
  const invalid = blob.type
    ? validateImageUpload({ type: blob.type, size: blob.size })
    : validateImageSize(blob.size)
  if (invalid) throw new Error(invalid)

  const decoded = await decodeImage(blob)
  try {
    const prepared = prepareSource(decoded)
    const results: ImageConversionItem[] = []
    const failures: ImageConversionFailure[] = []
    for (const strategy of getImageVectorizeStrategies()) {
      try {
        const svg = await strategy.run({
          canvas: prepared.canvas,
          width: prepared.canvas.width,
          height: prepared.canvas.height,
          blob,
        })
        if (!svg) throw new Error('没有生成内容')
        results.push({ strategy, svg, bytes: svgByteLength(svg) })
      } catch (error) {
        failures.push({
          label: strategy.label,
          message: error instanceof Error ? error.message : '转换失败',
        })
      }
    }
    return { results, failures, notes: prepared.notes }
  } finally {
    decoded.release()
  }
}

/** 只允许 http(s) 与内嵌 data 图片；其它协议（file:、javascript:）一律拒绝 */
export function normalizeImageUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (/^data:image\//i.test(value)) return value
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/**
 * 从 URL 读取图片。浏览器直连第三方站点，受 CORS 限制——
 * 失败时给出可操作的提示，而不是把 NetworkError 原样抛给用户。
 */
export async function fetchImageBlob(raw: string): Promise<Blob> {
  const url = normalizeImageUrl(raw)
  if (!url) throw new Error('请输入 http(s) 图片链接')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), IMAGE_URL_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal, mode: 'cors' })
    if (!response.ok) throw new Error(`下载失败（HTTP ${response.status}）`)
    const headerType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (headerType && !isSupportedImageMime(headerType)) {
      throw new Error(`链接不是 PNG / JPG / WebP 图片（${headerType}）`)
    }
    const blob = await response.blob()
    const type = (blob.type || headerType).toLowerCase()
    if (type && !isSupportedImageMime(type)) {
      throw new Error(`链接不是 PNG / JPG / WebP 图片（${type}）`)
    }
    if (!blob.size) throw new Error('链接返回了空文件')
    if (blob.size > IMAGE_SOURCE_MAX_BYTES) {
      throw new Error(`图片请控制在 ${IMAGE_SOURCE_MAX_BYTES / 1024 / 1024}MB 以内`)
    }
    return blob
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('下载超时，请检查网络或改用本地上传')
    }
    if (error instanceof TypeError) {
      throw new Error('无法读取该链接（可能不允许跨域访问），请下载后上传')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
