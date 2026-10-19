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
 */
function sanitize(svg: string): string {
  return svg
    .replace(/<\s*script\b[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*foreignObject\b[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/(href\s*=\s*)(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1"#"')
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
}

/**
 * 归一化用户贴进来的 SVG：
 *
 * 1. 去脚本与事件属性；
 * 2. `xlink:href` 转成 `href`；
 * 3. **给所有 id 加唯一前缀**并同步改掉引用（`url(#x)` / `href="#x"`）。
 *
 * 第 3 条是硬约束：多张图标被 v-html 进同一个文档时，同名 id 只有第一个生效，
 * 后插入的渐变/遮罩会全部指向第一张的定义——表现为「第二张图标的颜色不对」，
 * 而且不报任何错。同理 `url(#g)` 一旦悬空，整块图形不可见也不报错，所以只按
 * `defined` 集合改引用，绝不删 id。
 */
export function normalizeCustomIconSvg(svg: string, idPrefix: string): CustomIconResult {
  const warnings: string[] = []
  const source = (svg || '').trim()
  if (!source) return { svg: '', warnings: ['SVG 内容为空'] }
  if (!/<svg[\s>]/i.test(source)) {
    return { svg: '', warnings: ['内容里没有 <svg> 标签，请粘贴完整的 SVG 源码'] }
  }

  let out = sanitize(source)
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
    warnings.push(
      '图标里没有 currentColor：状态变色不会生效。请把描边/填充色改成 currentColor（多色填充稿无法变色）',
    )
  }

  return { svg: out, warnings }
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
