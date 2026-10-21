/**
 * 位图图标的像素预处理（纯函数，不碰 DOM，便于单测）。
 *
 * 上传的设备图有三类常见背景，处理策略必须分开，否则会把设备本体当成背景去掉：
 * - 透明 PNG：按 alpha 裁边即可；
 * - 纯色/白底产品图：从四边泛洪填充去底（只去掉与边框连通的部分，设备内部的白色保留）；
 * - 现场照片（背景杂乱）：不做去底，只保留整张图，交给用户自己裁。
 *
 * 像素约定与 canvas 一致：RGBA，长度 = width * height * 4；所有函数就地修改传入的 data。
 */

export interface RawImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface PixelBox {
  x: number
  y: number
  width: number
  height: number
}

/** 原图体积上限：现场手机照片通常在 2~8MB，给到 10MB；更大的先压缩再传 */
export const IMAGE_SOURCE_MAX_BYTES = 10 * 1024 * 1024
/** 分析阶段的最大边长：4000px 手机原图直接泛洪填充又慢又占内存，先缩到这个尺寸 */
export const IMAGE_ANALYZE_MAX_DIM = 1024
/** 内嵌位图的最大边长：512px 的 WebP 通常在 20~40KB，足够 400px 画布尺寸 */
export const IMAGE_EMBED_MAX_DIM = 512
/** 描摹输入的最大边长：再大只会增加路径数，56px 图标的观感提升有限 */
export const IMAGE_TRACE_MAX_DIM = 320
/** 图片 URL 下载超时：跨域失败通常是挂起而不是立刻报错，必须有上限 */
export const IMAGE_URL_TIMEOUT_MS = 15_000

export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

const BORDER_UNIFORM_TOLERANCE = 42
const BACKGROUND_TOLERANCE = 38

/**
 * 上传前置校验：MIME 与扩展名双判，理由同 `validateSvgUpload`——
 * 设计工具/系统截图导出的文件 MIME 常为空，只判 MIME 会误拦；只判扩展名又拦不住改后缀。
 */
export function validateImageUpload(file: {
  name?: string
  type?: string
  size?: number
}): string | null {
  const name = file.name ?? ''
  const type = (file.type ?? '').toLowerCase()
  const isSvg = type === 'image/svg+xml' || /\.svg$/i.test(name)
  if (isSvg) return 'SVG 请切到「SVG 源码」页签粘贴或上传，这里只处理位图'
  const supported =
    (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type) ||
    /\.(png|jpe?g|webp)$/i.test(name)
  if (!supported) return '只支持 PNG / JPG / WebP 设备图片'
  return validateImageSize(file.size ?? 0)
}

/**
 * 体积关。单独拆出来给下载路径用：`Response.blob()` 在服务端没发 Content-Type 时
 * `blob.type` 是空串，按上传口径判 MIME 会误报「只支持 PNG / JPG / WebP」，
 * 而真实格式在解码那一步自然会暴露。
 */
export function validateImageSize(size: number): string | null {
  if (size === 0) return '文件是空的'
  if (size > IMAGE_SOURCE_MAX_BYTES) {
    return `原图请控制在 ${IMAGE_SOURCE_MAX_BYTES / 1024 / 1024}MB 以内（当前 ${(size / 1024 / 1024).toFixed(1)}MB）`
  }
  return null
}

/** 下载回来的 blob 只认 MIME，不猜扩展名（URL 末尾常带查询串） */
export function isSupportedImageMime(type: string): boolean {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type.toLowerCase())
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function colorDistance(a: readonly number[], r: number, g: number, b: number): number {
  return Math.max(Math.abs(a[0] - r), Math.abs(a[1] - g), Math.abs(a[2] - b))
}

function countTransparent(img: RawImage, minAlpha = 8): number {
  let count = 0
  for (let i = 3; i < img.data.length; i += 4) {
    if (img.data[i] < minAlpha) count++
  }
  return count
}

/** 有意义的透明区域（抗锯齿边缘不算）：用于判定「透明底 PNG」 */
export function hasTransparency(img: RawImage): boolean {
  const minimum = Math.max(8, img.width * img.height * 0.002)
  return countTransparent(img) > minimum
}

/** 不透明像素里接近纯白的占比：描摹时用来判断白色是背景还是图形本体 */
export function whitePixelRatio(img: RawImage, threshold = 0.93): number {
  let white = 0
  let opaque = 0
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] < 8) continue
    opaque++
    if (luminance(img.data[i], img.data[i + 1], img.data[i + 2]) / 255 >= threshold) white++
  }
  return opaque ? white / opaque : 0
}

/** 非透明像素的外接矩形；整张图都透明时返回 null */
export function alphaBox(img: RawImage, minAlpha = 16): PixelBox | null {
  const { width, height, data } = img
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < minAlpha) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function perimeterIndices(width: number, height: number): number[] {
  const indices: number[] = []
  for (let x = 0; x < width; x++) {
    indices.push(x, (height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y++) {
    indices.push(y * width, y * width + width - 1)
  }
  return indices
}

/** 边框不透明像素的平均色；整圈都透明时返回 null */
function borderAverage(img: RawImage): number[] | null {
  const { data } = img
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (const index of perimeterIndices(img.width, img.height)) {
    const i = index * 4
    if (data[i + 3] < 8) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    n++
  }
  return n ? [r / n, g / n, b / n] : null
}

/**
 * 四边颜色是否足够一致。只在整个边框都同色时才当背景处理：
 * 现场照片的边框里通常有设备、地面、杂物，一致性很差，此时不能去底。
 */
function borderIsUniform(img: RawImage): boolean {
  const avg = borderAverage(img)
  if (!avg) return false
  const { data } = img
  let near = 0
  let total = 0
  for (const index of perimeterIndices(img.width, img.height)) {
    const i = index * 4
    if (data[i + 3] < 8) continue
    total++
    if (colorDistance(avg, data[i], data[i + 1], data[i + 2]) <= BORDER_UNIFORM_TOLERANCE) near++
  }
  return total > 0 && near / total >= 0.96
}

/**
 * 从四边泛洪填充背景为透明，返回被去掉的像素数。
 *
 * 用连通性而不是全局颜色阈值：设备本体里的白色面板与背景同色，但被设备轮廓隔开，
 * 不会被从四边出发的填充波及——这是「自动去白底」不把设备掏空的关键。
 */
export function removeFlatBackground(img: RawImage, tolerance = BACKGROUND_TOLERANCE): number {
  const { width, height, data } = img
  if (!borderIsUniform(img)) return 0
  const bg = borderAverage(img)
  if (!bg) return 0

  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0

  const isBackground = (index: number): boolean => {
    const i = index * 4
    return data[i + 3] >= 8 && colorDistance(bg, data[i], data[i + 1], data[i + 2]) <= tolerance
  }
  const push = (index: number) => {
    if (visited[index] || !isBackground(index)) return
    visited[index] = 1
    queue[tail++] = index
  }

  for (let x = 0; x < width; x++) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y++) {
    push(y * width)
    push(y * width + width - 1)
  }

  let removed = 0
  while (head < tail) {
    const index = queue[head++]
    data[index * 4 + 3] = 0
    removed++
    const x = index % width
    const y = (index - x) / width
    if (x > 0) push(index - 1)
    if (x < width - 1) push(index + 1)
    if (y > 0) push(index - width)
    if (y < height - 1) push(index + width)
  }
  return removed
}

export interface ContentAnalysis {
  box: PixelBox
  /** alpha：本来就透明；flat：识别并去掉了纯色底；none：背景杂乱，保留整张图 */
  background: 'alpha' | 'flat' | 'none'
  removedPixels: number
}

function padBox(box: PixelBox, width: number, height: number): PixelBox {
  const pad = Math.max(2, Math.round(Math.max(box.width, box.height) * 0.02))
  const x = Math.max(0, box.x - pad)
  const y = Math.max(0, box.y - pad)
  const right = Math.min(width, box.x + box.width + pad)
  const bottom = Math.min(height, box.y + box.height + pad)
  return { x, y, width: right - x, height: bottom - y }
}

/**
 * 识别内容区域（并就地去掉可识别的纯色背景）。
 * 调用方必须把修改后的像素写回 canvas，后续裁切才带透明底。
 */
export function analyzeContent(img: RawImage): ContentAnalysis {
  const full: PixelBox = { x: 0, y: 0, width: img.width, height: img.height }
  if (hasTransparency(img)) {
    const box = alphaBox(img)
    return {
      box: box ? padBox(box, img.width, img.height) : full,
      background: 'alpha',
      removedPixels: 0,
    }
  }

  const removed = removeFlatBackground(img)
  if (removed > 0) {
    const box = alphaBox(img)
    if (box) {
      return {
        box: padBox(box, img.width, img.height),
        background: 'flat',
        removedPixels: removed,
      }
    }
  }
  return { box: full, background: 'none', removedPixels: removed }
}

/**
 * 灰度化 + 百分位对比度拉伸。
 *
 * 不做这一步，手机照片的曝光差会直接体现为「同一款设备有的描摹成一片黑、有的几乎没有轮廓」。
 * 取 4%~96% 分位而不是最小/最大值，避免单个高光/噪点把整个动态范围压扁。
 */
export function toGrayscaleContrast(
  img: RawImage,
  opts: { low?: number; high?: number } = {},
): { lo: number; hi: number } {
  const { data } = img
  const hist = new Uint32Array(256)
  let total = 0
  const lums = new Float32Array(data.length / 4)

  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    if (data[i + 3] < 8) continue
    const lum = luminance(data[i], data[i + 1], data[i + 2])
    lums[p] = lum
    hist[Math.min(255, Math.max(0, Math.round(lum)))]++
    total++
  }
  if (!total) return { lo: 0, hi: 255 }

  const percentile = (ratio: number): number => {
    const target = total * ratio
    let seen = 0
    for (let v = 0; v < 256; v++) {
      seen += hist[v]
      if (seen >= target) return v
    }
    return 255
  }
  const lo = percentile(opts.low ?? 0.04)
  const hi = percentile(opts.high ?? 0.96)

  // 对比度本来就足够的图不必拉伸；范围过窄时强行拉伸只会放大噪点
  if (hi - lo < 8) {
    for (let p = 0, i = 0; i < data.length; i += 4, p++) {
      if (data[i + 3] < 8) continue
      const g = Math.round(lums[p])
      data[i] = data[i + 1] = data[i + 2] = g
    }
    return { lo, hi }
  }

  const span = hi - lo
  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    if (data[i + 3] < 8) continue
    const g = Math.round(Math.min(255, Math.max(0, ((lums[p] - lo) / span) * 255)))
    data[i] = data[i + 1] = data[i + 2] = g
  }
  return { lo, hi }
}
