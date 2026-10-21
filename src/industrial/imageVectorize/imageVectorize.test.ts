// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  alphaBox,
  analyzeContent,
  hasTransparency,
  IMAGE_SOURCE_MAX_BYTES,
  toGrayscaleContrast,
  validateImageSize,
  validateImageUpload,
  whitePixelRatio,
  type RawImage,
} from './preprocess'
import { buildEmbeddedSvg, colorizeTracedSvg, svgByteLength } from './svgOutput'
import { normalizeImageUrl } from './index'

type Rgba = [number, number, number, number]

function makeImage(width: number, height: number, fill: Rgba = [255, 255, 255, 255]): RawImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]
    data[i + 1] = fill[1]
    data[i + 2] = fill[2]
    data[i + 3] = fill[3]
  }
  return { width, height, data }
}

function setPixel(img: RawImage, x: number, y: number, color: Rgba): void {
  const i = (y * img.width + x) * 4
  img.data[i] = color[0]
  img.data[i + 1] = color[1]
  img.data[i + 2] = color[2]
  img.data[i + 3] = color[3]
}

function fillRect(img: RawImage, x: number, y: number, w: number, h: number, color: Rgba): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(img, xx, yy, color)
  }
}

describe('validateImageUpload', () => {
  const ok = { name: 'pump.png', type: 'image/png', size: 2048 }

  it('PNG / JPG / WebP 通过', () => {
    expect(validateImageUpload(ok)).toBeNull()
    expect(validateImageUpload({ name: 'a.jpg', type: 'image/jpeg', size: 2048 })).toBeNull()
    expect(validateImageUpload({ name: 'a.webp', type: 'image/webp', size: 2048 })).toBeNull()
  })

  it('MIME 为空时按扩展名放行（系统截图常见）', () => {
    expect(validateImageUpload({ name: 'shot.PNG', type: '', size: 2048 })).toBeNull()
  })

  it('SVG 提示走源码页签', () => {
    expect(validateImageUpload({ name: 'fan.svg', type: 'image/svg+xml', size: 2048 })).toContain('SVG')
    expect(validateImageUpload({ name: 'fan.svg', type: '', size: 2048 })).toContain('SVG')
  })

  it('GIF 等未支持格式被拒', () => {
    expect(validateImageUpload({ name: 'a.gif', type: 'image/gif', size: 2048 })).toContain('PNG / JPG / WebP')
  })

  it('空文件与超体积被拒，边界值放行', () => {
    expect(validateImageUpload({ name: 'a.png', type: 'image/png', size: 0 })).toContain('空')
    expect(
      validateImageUpload({ name: 'a.png', type: 'image/png', size: IMAGE_SOURCE_MAX_BYTES + 1 }),
    ).toContain('10MB')
    expect(
      validateImageUpload({ name: 'a.png', type: 'image/png', size: IMAGE_SOURCE_MAX_BYTES }),
    ).toBeNull()
  })

  it('下载回来的 blob 没有 MIME 时只卡体积（服务端未发 Content-Type）', () => {
    expect(validateImageSize(2048)).toBeNull()
    expect(validateImageSize(0)).toContain('空')
    expect(validateImageSize(IMAGE_SOURCE_MAX_BYTES + 1)).toContain('10MB')
  })
})

describe('alphaBox / hasTransparency', () => {
  it('返回非透明像素外接矩形', () => {
    const img = makeImage(6, 5, [0, 0, 0, 0])
    setPixel(img, 1, 2, [0, 0, 0, 255])
    setPixel(img, 3, 4, [0, 0, 0, 255])
    expect(alphaBox(img)).toEqual({ x: 1, y: 2, width: 3, height: 3 })
  })

  it('全透明返回 null', () => {
    expect(alphaBox(makeImage(4, 4, [0, 0, 0, 0]))).toBeNull()
  })

  it('只有抗锯齿级别的一两个透明像素不算透明底', () => {
    const img = makeImage(20, 20)
    setPixel(img, 0, 0, [255, 255, 255, 0])
    expect(hasTransparency(img)).toBe(false)
  })
})

describe('analyzeContent', () => {
  it('透明底按 alpha 裁边并留出边距', () => {
    const img = makeImage(20, 20, [0, 0, 0, 0])
    fillRect(img, 5, 5, 6, 4, [10, 10, 10, 255])
    const result = analyzeContent(img)
    expect(result.background).toBe('alpha')
    expect(result.box).toEqual({ x: 3, y: 3, width: 10, height: 8 })
  })

  it('白底从四边泛洪去除，设备内部的白色不被掏空', () => {
    const img = makeImage(15, 15, [255, 255, 255, 255])
    // 黑色环：外圈 5..9，中心 7,7 仍是白色（被黑环包住）
    fillRect(img, 5, 5, 5, 5, [10, 10, 10, 255])
    setPixel(img, 7, 7, [255, 255, 255, 255])

    const result = analyzeContent(img)
    expect(result.background).toBe('flat')
    expect(result.removedPixels).toBe(225 - 25)
    // 内部白点仍不透明，说明泛洪没有跨过黑色轮廓
    expect(img.data[(7 * 15 + 7) * 4 + 3]).toBe(255)
    expect(result.box).toEqual({ x: 3, y: 3, width: 9, height: 9 })
  })

  it('背景颜色不统一时不做去底', () => {
    const img = makeImage(8, 8, [255, 255, 255, 255])
    for (let x = 0; x < 8; x += 2) {
      setPixel(img, x, 0, [20, 20, 20, 255])
      setPixel(img, x, 7, [120, 60, 30, 255])
    }
    const result = analyzeContent(img)
    expect(result.background).toBe('none')
    expect(result.removedPixels).toBe(0)
    expect(result.box).toEqual({ x: 0, y: 0, width: 8, height: 8 })
  })
})

describe('whitePixelRatio', () => {
  it('按不透明像素统计近白占比', () => {
    const img = makeImage(4, 1, [250, 250, 250, 255])
    setPixel(img, 0, 0, [10, 10, 10, 255])
    setPixel(img, 1, 0, [10, 10, 10, 255])
    expect(whitePixelRatio(img)).toBe(0.5)
  })

  it('全透明返回 0', () => {
    expect(whitePixelRatio(makeImage(2, 2, [0, 0, 0, 0]))).toBe(0)
  })
})

describe('toGrayscaleContrast', () => {
  it('按百分位拉伸并保持灰度', () => {
    const img = makeImage(10, 1)
    for (let x = 0; x < 10; x++) setPixel(img, x, 0, [100 + x, 100 + x, 100 + x, 255])
    const range = toGrayscaleContrast(img)
    expect(range).toEqual({ lo: 100, hi: 109 })
    expect(img.data[0]).toBe(0)
    expect(img.data[9 * 4]).toBe(255)
    expect(img.data[4]).toBe(img.data[5])
    expect(img.data[6]).toBe(img.data[4])
  })

  it('透明像素不参与统计也不改色', () => {
    const img = makeImage(2, 1, [0, 0, 0, 0])
    expect(toGrayscaleContrast(img)).toEqual({ lo: 0, hi: 255 })
    expect(img.data[0]).toBe(0)
  })
})

describe('buildEmbeddedSvg', () => {
  it('内嵌 data URI，并把 viewBox 缩到最长边 100', () => {
    const svg = buildEmbeddedSvg({ width: 512, height: 256, mime: 'image/webp', base64: 'AAAA' })
    expect(svg).toContain('viewBox="0 0 100 50"')
    expect(svg).toContain('href="data:image/webp;base64,AAAA"')
    expect(svg).toContain('width="100"')
    expect(svg).toContain('height="50"')
  })
})

describe('colorizeTracedSvg', () => {
  const traced =
    '<svg width="200" height="100" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
    '<path fill="rgb(255,255,255)" stroke="rgb(255,255,255)" stroke-width="1" opacity="0.9" d="M0 0 L10 0 L10 10 Z"/>' +
    '<path fill="rgb(40,40,40)" stroke="rgb(40,40,40)" stroke-width="1" opacity="0.9" d="M1 1 L5 1 L5 5 Z"/>' +
    '<path fill="none" d="M9 9 L8 8"/>' +
    '</svg>'

  it('白底丢弃、深色层改 currentColor，并去掉描边与自带透明度', () => {
    const out = colorizeTracedSvg(traced, { whiteIsBackground: true })
    expect(out).toContain('viewBox="0 0 100 50"')
    expect(out).toContain('scale(0.5)')
    expect(out.match(/fill="currentColor"/g)).toHaveLength(1)
    expect(out).toContain('M1 1')
    expect(out).not.toContain('M0 0')
    expect(out).not.toContain('stroke')
    expect(out).not.toContain('opacity="0.9"')
  })

  it('白色是图形本体时保留为浅色层', () => {
    const out = colorizeTracedSvg(traced, { whiteIsBackground: false })
    expect(out.match(/fill="currentColor"/g)).toHaveLength(2)
    expect(out).toContain('fill-opacity="0.45"')
  })

  it('没有可着色路径时返回空串（由策略报错，不能静默保存空白图标）', () => {
    expect(
      colorizeTracedSvg('<svg width="10" height="10"><path fill="none" d="M0 0"/></svg>', {
        whiteIsBackground: true,
      }),
    ).toBe('')
    expect(colorizeTracedSvg('<p>not svg</p>', { whiteIsBackground: true })).toBe('')
  })
})

describe('svgByteLength', () => {
  it('按 UTF-8 字节计数', () => {
    expect(svgByteLength('abc')).toBe(3)
    expect(svgByteLength('中')).toBe(3)
  })
})

describe('normalizeImageUrl', () => {
  it('放行 http(s) 与 data 图片', () => {
    expect(normalizeImageUrl('https://a.test/p.png')).toBe('https://a.test/p.png')
    expect(normalizeImageUrl('http://a.test/p.png')).toBe('http://a.test/p.png')
    expect(normalizeImageUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
  })

  it('拒绝空值、相对路径与危险协议', () => {
    expect(normalizeImageUrl('')).toBeNull()
    expect(normalizeImageUrl('images/p.png')).toBeNull()
    expect(normalizeImageUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeImageUrl('file:///c:/a.png')).toBeNull()
  })
})
