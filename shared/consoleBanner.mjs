// 启动横幅核心（前端与后端共用）。
//
// 为什么放在 shared/ 且写成 .mjs：浏览器侧（Vite/TS）与后端侧（Node 直接跑 .mjs）
// 都 import 这同一份布局。Node 不能 import .ts，所以核心必须是纯 ESM 的 .mjs，
// 再用同目录的 .d.mts 给 TS 侧补类型——否则两端就得各写一份，内容迟早漂移。
//
// 本模块只产出「排好版、着好色」的抽象模型（行 → 带色文本片段）与纯字符串渲染函数，
// 不碰 DOM / Vue / Pinia；信息栏内容由调用方提供（前端给技术栈、后端给端口与数据目录）。
//
// 像素画字符说明：LOGO 源数据用 'a'（描边）/'b'（填充）作占位标记，成模型时统一译成块字符
// █ / ▒ —— 直接拿字母当像素，浏览器里靠 CSS 上色勉强能糊弄过去，终端打印就露馅成字母了。

/** 三个横向分区（LOGO / 名称 / 信息）之间的间隔列数 */
const ZONE_GAP = 4

/** ESC 用 String.fromCharCode(27) 运行时取：源码里既不写真实控制字符（会被编辑器/传输吞掉），也不写转义字面量 */
const ESC = String.fromCharCode(27)

/**
 * 系统 LOGO 像素画：由 public/logo.svg（管道 + 设备线稿）光栅化而来——
 * 48×48 viewBox 按 32×32 网格采样（描边带 1.2 单位），裁掉空白行与行尾空格。
 * 'a' = 描边（品牌主色），'b' = 形状内部（同色暗调）——细线稿直接画在 32 列网格上认不出是标识，
 * 填一层暗调后才像实心设备剪影。
 */
const LOGO_ROWS = [
  '    aaaaaaaaaa',
  '   aaabbbbbbbaa',
  '   aabbbbbbbbba',
  '   aabbbbbbbbba',
  '   aabbbbbbbbbaaa',
  '   aabbbbbbbbba   aaaaaaaaa',
  '   aabbbbbbbbba  aaaaaaaaaaa',
  '   aabbbbbbbbba  abbbbbbbbbaa',
  '    aaaaaaaaaaa  abbbbbbbbbaa',
  '                 abbbbbbbbbaa',
  '                 abbbbbbbbbaa',
  '                 abbbbbbbbbaa',
  '                 abbbbbbbbbaa',
  '                 aaaaaaaaaaa',
  '                  aaaaaaaaaa',
  '       aaaaa       aabbbbbbaa',
  '      aabbaa       aabbbbbbaa',
  '      aabbbaaaaaaaaaabbbbbbaa',
  '      aabbbaaaaaaaaaabbbbbbaa',
  '      aabbaa       aabbbbbbaa',
  '       aaaaa       aabbbbbbaa',
  '                    aaaaaaaa',
  '                     aaaaaa',
]

/**
 * LOGO 像素画（统一补齐到同一宽度）。
 * 行尾空格不写进源码：一来行尾空白容易被编辑器/传输悄悄改写导致错列（实测踩过），
 * 二来每行宽度必须一致，否则右侧名称/信息分区会逐行错位。
 */
export const LOGO_ART = (() => {
  const width = Math.max(...LOGO_ROWS.map((row) => row.length))
  return LOGO_ROWS.map((row) => row.padEnd(width))
})()

/** 分区在 LOGO 总高度内的垂直居中偏移 */
function zoneStart(content, total) {
  return Math.floor((total - content) / 2)
}

/**
 * 前端信息栏（技术栈）：浏览器控制台与 `pnpm dev` 终端横幅共用一份，避免两处各写一遍。
 * 标签已 padEnd 对齐；存储后端横幅不用这份内容，改给端口/数据目录等自身信息。
 */
export const FRONTEND_DETAILS = [
  'Stack:    Vue 3 · TypeScript · Vite',
  'Graphics: Konva.js · vue-konva · Three.js',
  'UI:       Element Plus · Pinia',
  'Storage:  localStorage / 可选后端',
  'Docs:     README.md · USER_GUIDE.md',
  'License:  MIT',
]

/** 是否为双宽字符（CJK / 全角 / 常见 emoji）：终端按 2 列、浏览器等宽字体也按 2 倍字宽渲染 */
function isWideChar(char) {
  const code = char.codePointAt(0) ?? 0
  return (
    (code >= 0x1100 && code <= 0x115f) || // 韩文字母
    (code >= 0x2e80 && code <= 0x303e) || // CJK 部首、标点
    (code >= 0x3041 && code <= 0x33ff) || // 假名、CJK 兼容
    (code >= 0x3400 && code <= 0x4dbf) || // CJK 扩展 A
    (code >= 0x4e00 && code <= 0x9fff) || // CJK 基本区
    (code >= 0xa000 && code <= 0xa4cf) || // 彝文
    (code >= 0xac00 && code <= 0xd7a3) || // 韩文音节
    (code >= 0xf900 && code <= 0xfaff) || // CJK 兼容表意
    (code >= 0xfe30 && code <= 0xfe4f) || // CJK 兼容形式
    (code >= 0xff00 && code <= 0xff60) || // 全角 ASCII
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f9ff) || // 常见 emoji
    (code >= 0x20000 && code <= 0x3fffd) // CJK 扩展 B+
  )
}

/**
 * 显示宽度（按终端列数算）：CJK/全角算 2 列，其余算 1 列。
 * 分区对齐必须用它而不是字符串长度——名称区含中文副标题，长度算出来比实际窄一倍，
 * 直接按长度拼接会让右侧信息栏在「名称区与信息区同行」的那几行错位（实测踩过）。
 */
export function displayWidth(text) {
  let width = 0
  for (const char of text) width += isWideChar(char) ? 2 : 1
  return width
}

/**
 * 把一行 LOGO 像素画按颜色切成片段：'a'→描边 █、'b'→填充 ▒、空格并入前一段（不可见，不单独切段）。
 * 行首缩进是纯空格，落在第一块颜色之前，归为 'plain'（不着色）。
 */
function logoSpans(art) {
  const spans = []
  let current = 'plain'
  let buffer = ''
  const flush = () => {
    if (buffer) spans.push({ text: buffer, tone: current })
    buffer = ''
  }
  for (const char of art) {
    const tone = char === 'a' ? 'logoEdge' : char === 'b' ? 'logoFill' : current
    if (tone !== current) {
      flush()
      current = tone
    }
    // 占位标记译成块字符；空格原样保留（作为缩进/背景）
    buffer += char === 'a' ? '█' : char === 'b' ? '▒' : ' '
  }
  flush()
  return spans
}

/** 给分区的首段前面补上间隔列 */
function withGap(spans) {
  if (!spans.length) return spans
  return [{ ...spans[0], text: ' '.repeat(ZONE_GAP) + spans[0].text }, ...spans.slice(1)]
}

/** 就地补空格，把当前行已占用的显示宽度推到目标列（不可见，故用 plain 色调） */
function padTo(spans, target) {
  const current = displayWidth(spans.map((s) => s.text).join(''))
  if (current < target) spans.push({ text: ' '.repeat(target - current), tone: 'plain' })
}

function line(text, tone) {
  return text ? [{ text, tone }] : []
}

/**
 * 三分区合并：LOGO 左、名称中、信息右，中/右两区相对 LOGO 垂直居中。
 * 名称列与信息列按「显示列」固定起点（LOGO 宽 + 间隔、中间名称区取最宽的一行），
 * 这样名称区与信息区同行的行也不会把右侧推歪。
 */
function blockRows(info) {
  const total = LOGO_ART.length
  const titleRows = [line(info.title, 'title'), line(info.subtitle, 'dim'), line(`v${info.version}`, 'dim')]
  const detailSpans = info.details.map((row) => line(row, 'dim'))
  const titleStart = zoneStart(titleRows.length, total)
  const detailStart = zoneStart(detailSpans.length, total)

  const titleCol = LOGO_ART[0].length + ZONE_GAP
  const titleWidth = Math.max(...titleRows.map((row) => displayWidth(row.map((s) => s.text).join(''))))
  const infoCol = titleCol + titleWidth + ZONE_GAP

  return LOGO_ART.map((art, row) => {
    const spans = logoSpans(art)
    const title = titleRows[row - titleStart]
    const detail = detailSpans[row - detailStart]
    if (!title && !detail) return { spans }
    padTo(spans, titleCol)
    if (title) spans.push(...withGap(title))
    padTo(spans, infoCol)
    if (detail) spans.push(...withGap(detail))
    return { spans }
  })
}

/**
 * 构建横幅模型：LOGO + 名称 + 信息的分区块，以及底部的 shell 提示符与引导语。
 * 纯字符串运算，两端（浏览器 / 终端）共用。
 * @param {{title: string, subtitle: string, version: string, details: string[], prompt?: string}} info
 */
export function buildBannerModel(info) {
  const prompt = [
    { text: `${info.prompt || 'visitor'}@${info.title}`, tone: 'title' },
    { text: ':', tone: 'dim' },
    { text: '~$ ', tone: 'dim' },
    { text: '▊', tone: 'title' },
  ]
  const tagline = [
    { text: `If ${info.title} helps your work, give it a `, tone: 'dim' },
    { text: 'Star ⭐', tone: 'title' },
    { text: ' — it would be a great help.', tone: 'dim' },
  ]
  // 中文引导语单独一行，不与英文拼在一行：CJK 按 2 列算，拼起来超 130 显示列，终端必然折行
  const taglineCn = [
    { text: `如果 ${info.title} 对你有帮助，欢迎点个`, tone: 'dim' },
    { text: 'Star ⭐', tone: 'title' },
    { text: ' 支持这个项目。', tone: 'dim' },
  ]
  return { rows: [...blockRows(info), { spans: prompt }, { spans: tagline }, { spans: taglineCn }] }
}

/** 纯文本渲染（不着色，供无色终端 / 测试对照） */
export function renderPlain(model) {
  return model.rows.map((row) => row.spans.map((s) => s.text).join('')).join('\n')
}

/** 各颜色槽位的 RGB：与 public/logo.svg 的品牌色、CRT 荧光绿保持一致 */
const TONE_RGB = {
  plain: null,
  logoEdge: [0x00, 0xd4, 0xaa],
  logoFill: [0x00, 0x6b, 0x62],
  title: [0x5e, 0xf5, 0x7a],
  dim: [0x2f, 0x9e, 0x4f],
}

/**
 * 终端渲染：SGR 24 位真彩色前景色 + 复位。
 * 是否上色由调用方判断（supportsColor），本函数只负责拼转义序列。
 */
export function renderAnsi(model) {
  return model.rows
    .map((row) =>
      row.spans
        .map((span) => {
          const rgb = TONE_RGB[span.tone]
          return rgb ? `${ESC}[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${span.text}${ESC}[0m` : span.text
        })
        .join(''),
    )
    .join('\n')
}

/**
 * Node 侧：当前宿主是否支持 24 位真彩色（浏览器侧不会调用）。
 * Windows 上额外要求 Windows Terminal 或 mintty 类宿主：传统 conhost（PowerShell 5.1）
 * 不处理 VT 序列，转义字符会被当正文原样打印，横幅直接变乱码。
 */
export function supportsColor() {
  const env = typeof process === 'undefined' ? {} : process.env
  if (env.NO_COLOR) return false
  if (env.FORCE_COLOR) return true
  if (typeof process === 'undefined' || !process.stdout?.isTTY) return false
  if (process.platform !== 'win32') return true
  return Boolean(env.WT_SESSION || (env.TERM && env.TERM !== 'dumb'))
}