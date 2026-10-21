/**
 * imagetracerjs 没有官方类型声明（Unlicense 公共域，UMD 单文件）。
 * 这里只声明本站用到的入口，选项名对齐其 options.md。
 */
declare module 'imagetracerjs' {
  export interface ImageTracerRgba {
    r: number
    g: number
    b: number
    a: number
  }

  export interface ImageTracerOptions {
    pal?: ImageTracerRgba[]
    /** 0 = 直接用 pal，不做自动采样 */
    colorsampling?: 0 | 1 | 2
    numberofcolors?: number
    pathomit?: number
    ltres?: number
    qtres?: number
    blurradius?: number
    strokewidth?: number
  }

  export interface ImageTracerImageData {
    width: number
    height: number
    data: Uint8ClampedArray | Uint8Array
  }

  const ImageTracer: {
    imagedataToSVG(imgd: ImageTracerImageData, options?: ImageTracerOptions): string
  }
  export default ImageTracer
}
