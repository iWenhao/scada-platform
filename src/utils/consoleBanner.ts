// 浏览器控制台横幅渲染：把 shared/consoleBanner.mjs 的模型转成 console.log 的（format, ...styles）参数。
// 布局、像素画、颜色槽位都在 shared 里（与后端终端共用同一份），本文件只负责「浏览器怎么上色」
// 和「前端展示哪些信息」。

import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_SUBTITLE } from '@/stores/brandingStore'
import { FRONTEND_DETAILS, buildBannerModel } from '../../shared/consoleBanner.mjs'
import type { BannerInfo, BannerSpan, BannerTone } from '../../shared/consoleBanner.mjs'

/** 等宽字体：控制台默认字体比例不定，显式指定保证像素画与各分区不错位 */
const MONO = 'font-family:Menlo,Consolas,"Courier New",monospace;'

/** 颜色槽位 → CSS；取值与 shared 的 TONE_RGB 同一组色（品牌青 + CRT 荧光绿） */
const TONE_CSS: Record<BannerTone, string> = {
  plain: '',
  logoEdge: `color:#00d4aa;${MONO}`,
  logoFill: `color:#006b62;${MONO}`,
  title: `color:#5ef57a;font-weight:bold;${MONO}`,
  dim: `color:#2f9e4f;${MONO}`,
}

function cssOf(span: BannerSpan): string {
  return TONE_CSS[span.tone]
}

/** 构建横幅的文本与样式（导出供单测断言，避免依赖 console 打桩） */
export function buildConsoleBanner(info: BannerInfo = defaultInfo()): { text: string; styles: string[] } {
  const model = buildBannerModel(info)
  return {
    text: model.rows.map((row) => row.spans.map((span) => `%c${span.text}`).join('')).join('\n'),
    styles: model.rows.flatMap((row) => row.spans.map(cssOf)),
  }
}

function defaultInfo(): BannerInfo {
  // define 注入的版本在非 Vite 环境（裸 node 等）不存在，typeof 守卫避免 ReferenceError
  return {
    title: DEFAULT_BRAND_NAME,
    // 副标题补「· 前端 Frontend」，与 dev 终端/后端横幅的角色标注保持一致；
    // 只加在横幅上，不动 brandingStore 的品牌副标题——它同时用于浏览器标签页标题
    subtitle: `${DEFAULT_BRAND_SUBTITLE} · 前端 Frontend`,
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
    details: FRONTEND_DETAILS,
    prompt: 'visitor',
  }
}

/** 打印横幅：main.ts 启动时调用，控制台输出「LOGO + 名称 + 信息」的终端风横幅 */
export function printConsoleBanner(): void {
  const { text, styles } = buildConsoleBanner()
  // 前置换行，让横幅与其它启动日志拉开距离
  console.log(`\n${text}`, ...styles)
}