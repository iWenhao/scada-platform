import type { AlarmSeverity, StatusRule } from '@/types/scada'

/**
 * 自定义组件的图元预处理与状态表装配。
 *
 * 这里是「用户贴进来一段 SVG」与「平台内部契约」之间的唯一适配层：
 * 外面来的 SVG 在平台里会被**多张同时插入同一文档**（组件库面板用 v-html 并列渲染
 * 几十张图标），也会被引擎替换 `currentColor` 做状态变色。这两件事各自有一条硬约束，
 * 不满足时症状都是「看起来没坏但就是不对」——所以放在一处集中处理并给出可读告警。
 */

/** 自定义组件宽高的合法区间（与对话框的 el-input-number 保持一致） */
export const CUSTOM_SIZE_MIN = 20
export const CUSTOM_SIZE_MAX = 400

/**
 * 上传 SVG 文件的体积上限，与站点品牌上传（BrandingDialog）的 SVG 档一致：
 * 图标是整份源码存在 KV/本地存储里的，超大矢量没有意义。
 */
export const CUSTOM_SVG_MAX_BYTES = 100 * 1024

/**
 * 上传 SVG 文件的前置校验。返回 null 表示通过，否则是可直接展示给用户的原因。
 *
 * 类型按 MIME 与扩展名双判：部分设计工具导出的 .svg 带的是 `text/xml` 或空 MIME，
 * 只判 MIME 会把合法文件误拦；只判扩展名又拦不住改扩展名的其他文件。
 */
export function validateSvgUpload(file: {
  name?: string
  type?: string
  size?: number
}): string | null {
  const name = file.name ?? ''
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(name)
  if (!isSvg) return '只支持 SVG 文件（.svg）；位图无法随状态变色'
  const size = file.size ?? 0
  if (size === 0) return '文件是空的'
  if (size > CUSTOM_SVG_MAX_BYTES) {
    return `SVG 请控制在 ${CUSTOM_SVG_MAX_BYTES / 1024}KB 以内（当前 ${Math.round(size / 1024)}KB）`
  }
  return null
}

/** 从 SVG 里读出默认宽高：优先 viewBox，其次 width/height 属性 */
export function parseSvgSize(svg: string): { width: number; height: number } | null {
  const viewBox = svg.match(/viewBox\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
  if (viewBox) {
    const nums = (viewBox[1] ?? viewBox[2] ?? '')
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n))
    if (nums.length === 4 && nums[2] > 0 && nums[3] > 0) {
      return { width: clampSize(nums[2]), height: clampSize(nums[3]) }
    }
  }
  const w = svg.match(/\swidth\s*=\s*(?:"([\d.]+)"|'([\d.]+)')/i)
  const h = svg.match(/\sheight\s*=\s*(?:"([\d.]+)"|'([\d.]+)')/i)
  const width = Number(w?.[1] ?? w?.[2])
  const height = Number(h?.[1] ?? h?.[2])
  if (width > 0 && height > 0) {
    return { width: clampSize(width), height: clampSize(height) }
  }
  return null
}

function clampSize(n: number): number {
  return Math.round(Math.min(Math.max(n, CUSTOM_SIZE_MIN), CUSTOM_SIZE_MAX))
}

/**
 * 去掉脚本与事件属性。
 *
 * 用户 SVG 会被存进共享存储、也可能被别人打开，属于不可信输入。位图渲染路径
 * （`Image` 加载 data: URI）不执行脚本，但**组件库面板是 v-html 直接插进文档的**——
 * innerHTML 不执行 `<script>`，却照常挂上 `onload` 这类事件属性。只堵位图那一条不够。
 *
 * `xlink:href` 在这里就收敛成 `href`（而不是等引用改写那一步）：XML 解析器遇到
 * 未声明的 `xlink:` 前缀会直接报 fatal error，而设计工具导出的文件里漏声明
 * `xmlns:xlink` 并不少见——先改写才能让「解析」这一关和真实渲染口径一致。
 */
function sanitize(svg: string): string {
  return svg
    .replace(/<\s*script\b[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*foreignObject\b[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\sxlink:href\s*=/gi, ' href=')
    .replace(/(href\s*=\s*)(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1"#"')
}

/**
 * 按 XML 真解析一遍。这里查的不是「像不像 SVG」，而是「浏览器能不能渲染」：
 * 画布走 `data:image/svg+xml` + `Image` 解码，XML 不合法时 onerror 静默失败、图标空白，
 * 只搜 `<svg` 子串拦不住。片段没有根元素，套一层临时 svg 壳再解析
 * （消费侧 `wrapFragment` 也会包壳）。
 */
function parseSvgDocument(source: string, fragment: boolean): Document | null {
  const xml = fragment
    ? `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${source}</svg>`
    : source
  try {
    const doc = new DOMParser().parseFromString(xml, 'image/svg+xml')
    return doc.getElementsByTagName('parsererror').length > 0 ? null : doc
  } catch {
    return null
  }
}

/**
 * 找出第一个外链引用。内部 `#id` 与自包含的 `data:` URI 不算。
 *
 * 画布用 data URI 渲染 SVG，浏览器不会为它加载外部资源（图片、字体、外部 use），
 * 表现为图标缺块或整张空白且不报错——所以在保存前拦掉，而不是等用户发现画面不对。
 */
function findExternalRef(doc: Document): string | null {
  for (const el of Array.from(doc.getElementsByTagName('*'))) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.localName !== 'href' && attr.localName !== 'src') continue
      const value = attr.value.trim()
      if (!value || value.startsWith('#') || /^data:/i.test(value)) continue
      const shown = value.length > 48 ? `${value.slice(0, 48)}…` : value
      return `<${el.localName} ${attr.localName}="${shown}">`
    }
  }
  return null
}

/**
 * 收集 SVG 内定义的 id（供引用判定）。
 * 只认双引号/单引号两种写法——外部素材基本都是工具导出的，属性值不带裸写法。
 */
function collectIds(svg: string): string[] {
  const ids: string[] = []
  const re = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg)) !== null) {
    const id = (m[1] ?? m[2] ?? '').trim()
    if (id) ids.push(id)
  }
  return ids
}

/** 安全的 id 前缀：只保留 URL 片段能接受的字符 */
function safeKey(raw: string): string {
  const cleaned = raw.replace(/[^\w-]/g, '_')
  return cleaned || `x${Math.random().toString(36).slice(2, 8)}`
}

export interface CustomIconResult {
  svg: string
  /** 给用户看的问题清单（不阻断保存，但要在面板上说清楚） */
  warnings: string[]
  /** 阻断保存的问题：结构不可渲染或引用外部资源，存下来也不会正常显示 */
  errors: string[]
}

export interface NormalizeCustomIconOptions {
  /** 旋转部件：贴的是片段，解析前套一层 svg 壳 */
  fragment?: boolean
  /** 有状态组件：缺 currentColor 由告警升级为阻断（否则状态色永远不生效） */
  requireCurrentColor?: boolean
}

/**
 * 归一化用户贴进来的 SVG：
 *
 * 1. 去脚本与事件属性；
 * 2. 真解析一次 XML，拦下浏览器渲染不了的源码与外部引用；
 * 3. **给所有 id 加唯一前缀**并同步改掉引用（`url(#x)` / `href="#x"`）。
 *
 * 第 3 条是硬约束：多张图标被 v-html 进同一个文档时，同名 id 只有第一个生效，
 * 后插入的渐变/遮罩会全部指向第一张的定义——表现为「第二张图标的颜色不对」，
 * 而且不报任何错。同理 `url(#g)` 一旦悬空，整块图形不可见也不报错，所以只按
 * `defined` 集合改引用，绝不删 id。
 *
 * `fragment: true` 跳过 `<svg>` 外壳校验——旋转部件是片段（一个 circle/path），
 * 由渲染侧 `wrapFragment` 包壳。⚠️ 调用方必须检查返回的 `errors` 与 `svg` 是否为空：
 * 片段过不了校验时也要给用户反馈，不能静默丢弃（动效件曾被这样静默丢掉过）。
 */
export function normalizeCustomIconSvg(
  svg: string,
  idPrefix: string,
  opts: NormalizeCustomIconOptions = {},
): CustomIconResult {
  const warnings: string[] = []
  const source = (svg || '').trim()
  if (!source) return { svg: '', warnings, errors: ['SVG 内容为空'] }
  if (opts.fragment) {
    if (/<svg[\s>]/i.test(source)) {
      return {
        svg: '',
        warnings,
        errors: ['旋转部件请贴片段（一个 circle/path），不要带 <svg> 外壳'],
      }
    }
  } else if (!/<svg[\s>]/i.test(source)) {
    return {
      svg: '',
      warnings,
      errors: ['内容里没有 <svg> 标签，请粘贴完整的 SVG 源码'],
    }
  }

  let out = sanitize(source)
  const errors: string[] = []

  const doc = parseSvgDocument(out, !!opts.fragment)
  if (!doc) {
    return {
      svg: '',
      warnings,
      errors: ['SVG 不是合法的 XML，浏览器无法渲染：请检查标签是否闭合、属性值是否带引号'],
    }
  }
  if (!opts.fragment && doc.documentElement?.localName !== 'svg') {
    const root = doc.documentElement?.localName
    return {
      svg: '',
      warnings,
      errors: [`SVG 的根元素必须是 <svg>（当前是 <${root || '空'}>）`],
    }
  }
  const external = findExternalRef(doc)
  if (external) {
    errors.push(
      `SVG 引用了外部资源（${external}）：画布用 data URI 渲染，外链不会被加载，` +
        '图标会缺块或空白。请把图片内嵌为 data URI 或删除外链',
    )
  }

  const prefix = safeKey(idPrefix)

  const defined = new Set(collectIds(out))
  const map = new Map<string, string>()
  for (const id of defined) map.set(id, `${prefix}-${safeKey(id)}`)

  // 定义处：只改 id 属性的值
  out = out.replace(/(\sid\s*=\s*)(?:"([^"]*)"|'([^']*)')/g, (whole, head, dq, sq) => {
    const raw = (dq ?? sq ?? '').trim()
    const next = map.get(raw)
    if (!next) return whole
    return dq !== undefined ? `${head}"${next}"` : `${head}'${next}'`
  })

  // 引用处：url(#x) 与 href="#x"（含遗留的 xlink:href）
  out = out.replace(/url\(\s*#([^)\s"']+)\s*\)/g, (whole, id: string) => {
    const next = map.get(id)
    return next ? `url(#${next})` : whole
  })
  out = out.replace(
    /((?:xlink:)?href\s*=\s*)(?:"#([^"]*)"|'#([^']*)')/g,
    (_whole, head: string, dq?: string, sq?: string) => {
      const raw = (dq ?? sq ?? '').trim()
      const next = map.get(raw)
      // 顺手把遗留的 xlink:href 收敛成 href：位图渲染走浏览器，SVG2 的 href 已普遍支持
      return `${head.replace(/xlink:/i, '')}"#${next ?? raw}"`
    },
  )

  if (!/currentColor/i.test(out)) {
    if (opts.requireCurrentColor) {
      errors.push(
        '有状态组件的图标必须使用 currentColor，否则状态变色不会生效：请把描边/填充色改成 currentColor',
      )
    } else {
      warnings.push(
        '图标里没有 currentColor：状态变色不会生效。请把描边/填充色改成 currentColor（多色填充稿无法变色）',
      )
    }
  }

  return { svg: out, warnings, errors }
}

/** 状态表的一行（对话框里的编辑形态） */
export interface CustomStateRow {
  name: string
  /** 判定变量：对应元素数据绑定里的变量名 */
  variable: string
  operator: '>' | '<' | '=' | '>=' | '<=' | '!='
  value: number
  color: string
  severity: AlarmSeverity
  /** 命中时停止运转动效 */
  stopMotion: boolean
}

/** 新建有状态组件时的默认三档：运行 / 停机 / 故障（沿用设备图元的 state 契约） */
export function defaultCustomStates(): CustomStateRow[] {
  return [
    { name: '故障', variable: 'state', operator: '=', value: 2, color: '#ff4d4f', severity: 'critical', stopMotion: true },
    { name: '运行', variable: 'state', operator: '=', value: 1, color: '#00d4aa', severity: 'normal', stopMotion: false },
    { name: '停机', variable: 'state', operator: '=', value: 0, color: '#8c8c8c', severity: 'normal', stopMotion: true },
  ]
}

/**
 * 状态表 → StatusRule[]。
 *
 * 优先级就是数组顺序：**自上而下第一条命中即生效**，所以行序即语义，对话框里要能拖动。
 * 条件一律用 `compare`（变量 + 运算符 + 数值常量）——阈值比较是状态判定里九成以上的
 * 用法，需要区间/组合/表达式的进阶场景去元素属性面板的「状态规则」里改，那里五种条件
 * 都能配，没必要在创建对话框里再堆一套。
 */
export function buildCustomStatusRules(rows: CustomStateRow[]): StatusRule[] {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.name.trim() && row.variable.trim())
    .map(({ row, index }) => ({
      id: `s${index + 1}`,
      name: row.name.trim(),
      color: row.color,
      severity: row.severity,
      condition: {
        type: 'compare' as const,
        variable: row.variable.trim(),
        operator: row.operator,
        value: Number(row.value) || 0,
      },
      priority: index + 1,
      // 显式写出而不是靠 undefined 省略：故障档必须真的停转，见 StatusRule.stopMotion
      stopMotion: !!row.stopMotion,
    }))
}

/** 反向解析：把已保存的 StatusRule[] 回填成对话框的行（非 compare 条件的行回退为默认档） */
export function parseCustomStates(rules: StatusRule[]): CustomStateRow[] {
  const rows: CustomStateRow[] = []
  for (const rule of rules ?? []) {
    const c = rule.condition
    if (c?.type !== 'compare') continue
    rows.push({
      name: rule.name ?? '',
      variable: c.variable ?? '',
      operator: c.operator,
      value: Number(c.value) || 0,
      color: rule.color ?? '#8c8c8c',
      severity: rule.severity ?? 'normal',
      stopMotion: rule.stopMotion === true,
    })
  }
  return rows.length ? rows : defaultCustomStates()
}
