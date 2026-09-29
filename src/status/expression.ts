/**
 * 受限表达式求值器（零依赖，词法分析 + 递归下降，边解析边求值）。
 *
 * 为什么不用 Function/New Function 直接执行：表达式来自工程文件（可被导入/分享），
 * 直接执行等于把任意 JS 注入浏览器上下文；旧的"变量名正则替换 + Function"还有
 * 变量名注入问题。本求值器只开放白名单能力：
 *   - 字面量：数字、单/双引号字符串、true/false
 *   - 变量：从 data 查表取值，缺失按 0（与旧实现 `Number(v) || 0` 语义一致）
 *   - 运算：比较（=, ==, !=, <>, >, <, >=, <=）、逻辑（&&, ||, AND/OR 大小写）、四则（+ - * / %）、一元（- !）
 *   - 函数：仅白名单数学函数（min/max/abs/round/floor/ceil/sqrt/pow）
 * 不存在成员访问、任意函数调用与赋值，构造注入串只会得到求值错误。
 *
 * 兼容说明：旧实现把字符串变量数值化为 0，导致 `status == "run"` 永远不成立；
 * 本实现保留字符串原值参与 ==/!= 比较，数值场景行为与旧版一致。
 */

/** 表达式语法/求值错误（调用方通常捕获后按 false 处理） */
export class ExpressionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpressionError'
  }
}

/** 输入长度上限：状态规则表达式没有正当的长文本场景，超限直接拒绝 */
const MAX_EXPR_LENGTH = 1000

/** 白名单数学函数：参数一律数值化 */
const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  pow: Math.pow,
}

type TokenType = 'num' | 'str' | 'ident' | 'op' | 'eof'

interface Token {
  type: TokenType
  /** num 为数字原文，str 为去引号内容，ident/op 为原文 */
  value: string
  num?: number
}

const IDENT_RE = /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*/
const NUM_RE = /^\d*\.?\d+(?:[eE][+-]?\d+)?/
const TWO_CHAR_OPS = ['==', '!=', '>=', '<=', '&&', '||', '<>']
const ONE_CHAR_OPS = '<>!+-*/%(),='

function tokenize(input: string): Token[] {
  if (input.length > MAX_EXPR_LENGTH) {
    throw new ExpressionError(`表达式超过 ${MAX_EXPR_LENGTH} 字符上限`)
  }

  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]

    if (/\s/.test(ch)) {
      i++
      continue
    }

    // 数字（含小数与科学计数法；".5" 也视为数字）
    if ((ch >= '0' && ch <= '9') || (ch === '.' && /\d/.test(input[i + 1] ?? ''))) {
      const m = NUM_RE.exec(input.slice(i))
      if (!m) throw new ExpressionError(`位置 ${i} 的数字无法解析`)
      tokens.push({ type: 'num', value: m[0], num: Number(m[0]) })
      i += m[0].length
      continue
    }

    // 字符串字面量（不支持转义，组态表达式没有这个需求）
    if (ch === '"' || ch === "'") {
      const end = input.indexOf(ch, i + 1)
      if (end === -1) throw new ExpressionError(`位置 ${i} 的字符串未闭合`)
      tokens.push({ type: 'str', value: input.slice(i + 1, end) })
      i = end + 1
      continue
    }

    // 标识符/变量名（允许 a.b 形式的点号路径，整体作为一个键查表，不产生成员访问）
    if (/[A-Za-z_$]/.test(ch)) {
      const m = IDENT_RE.exec(input.slice(i))
      if (!m) throw new ExpressionError(`位置 ${i} 的标识符无法解析`)
      tokens.push({ type: 'ident', value: m[0] })
      i += m[0].length
      continue
    }

    const two = input.slice(i, i + 2)
    if (TWO_CHAR_OPS.includes(two)) {
      tokens.push({ type: 'op', value: two })
      i += 2
      continue
    }
    if (ONE_CHAR_OPS.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }

    throw new ExpressionError(`位置 ${i} 存在无法识别的字符 "${ch}"`)
  }

  tokens.push({ type: 'eof', value: '' })
  return tokens
}

type Value = number | string | boolean

function truthy(v: Value): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v)
  return v.length > 0
}

function numeric(v: Value): number {
  if (typeof v === 'number') return v // 运算产生的 NaN 保留：truthy 与 == 比较都会视为不成立
  if (typeof v === 'boolean') return v ? 1 : 0
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

class Parser {
  private pos = 0

  constructor(
    private tokens: Token[],
    private data: Record<string, any>,
  ) {}

  /** 入口：求值整个表达式并确保没有剩余 token */
  evaluate(): boolean {
    const result = this.parseOr()
    if (this.tokens[this.pos].type !== 'eof') {
      throw new ExpressionError('表达式末尾有多余内容')
    }
    return truthy(result)
  }

  /** or := and ( ('||' | 'OR') and )*。纯查表求值无副作用，不短路，保持解析逻辑简单 */
  private parseOr(): Value {
    let left = this.parseAnd()
    while (this.matchKeyword('OR') || this.matchOp('||')) {
      const right = this.parseAnd()
      left = truthy(left) || truthy(right)
    }
    return left
  }

  /** and := cmp ( ('&&' | 'AND') cmp )* */
  private parseAnd(): Value {
    let left = this.parseCompare()
    while (this.matchKeyword('AND') || this.matchOp('&&')) {
      const right = this.parseCompare()
      left = truthy(left) && truthy(right)
    }
    return left
  }

  /** cmp := add ( ('=='|'='|'!='|'<>'|'>='|'<='|'>'|'<') add )* */
  private parseCompare(): Value {
    let left = this.parseAdd()
    for (;;) {
      const op = this.peekCompareOp()
      if (!op) return left
      this.pos++
      const right = this.parseAdd()
      left = this.compare(op, left, right)
    }
  }

  private peekCompareOp(): string | null {
    const t = this.tokens[this.pos]
    if (t.type !== 'op') return null
    return ['==', '=', '!=', '<>', '>=', '<=', '>', '<'].includes(t.value) ? t.value : null
  }

  private compare(op: string, a: Value, b: Value): boolean {
    // 仅两侧都是字符串才按文本比较；混合类型数值化（旧实现把所有变量转数字）
    const bothStr = typeof a === 'string' && typeof b === 'string'
    switch (op) {
      case '==':
      case '=':
        return bothStr ? a === b : numeric(a) === numeric(b)
      case '!=':
      case '<>':
        return bothStr ? a !== b : numeric(a) !== numeric(b)
      case '>':
        return numeric(a) > numeric(b)
      case '<':
        return numeric(a) < numeric(b)
      case '>=':
        return numeric(a) >= numeric(b)
      case '<=':
        return numeric(a) <= numeric(b)
      default:
        throw new ExpressionError(`不支持的比较运算符 "${op}"`)
    }
  }

  /** add := mul ( ('+'|'-') mul )* */
  private parseAdd(): Value {
    let left = this.parseMul()
    for (;;) {
      const t = this.tokens[this.pos]
      if (t.type === 'op' && (t.value === '+' || t.value === '-')) {
        this.pos++
        const right = this.parseMul()
        left = t.value === '+' ? numeric(left) + numeric(right) : numeric(left) - numeric(right)
      } else {
        return left
      }
    }
  }

  /** mul := unary ( ('*'|'/'|'%') unary )* */
  private parseMul(): Value {
    let left = this.parseUnary()
    for (;;) {
      const t = this.tokens[this.pos]
      if (t.type === 'op' && ['*', '/', '%'].includes(t.value)) {
        this.pos++
        const right = this.parseUnary()
        const a = numeric(left)
        const b = numeric(right)
        if (t.value === '*') left = a * b
        else if (t.value === '/') left = b === 0 ? Number.NaN : a / b
        else left = b === 0 ? Number.NaN : a % b
      } else {
        return left
      }
    }
  }

  /** unary := ('!' | '-') unary | primary */
  private parseUnary(): Value {
    const t = this.tokens[this.pos]
    if (t.type === 'op' && t.value === '!') {
      this.pos++
      return !truthy(this.parseUnary())
    }
    if (t.type === 'op' && t.value === '-') {
      this.pos++
      return -numeric(this.parseUnary())
    }
    return this.parsePrimary()
  }

  /** primary := 数字 | 字符串 | true/false | 变量 | 白名单函数调用 | '(' expr ')' */
  private parsePrimary(): Value {
    const t = this.tokens[this.pos]

    if (t.type === 'num') {
      this.pos++
      return t.num ?? 0
    }

    if (t.type === 'str') {
      this.pos++
      return t.value
    }

    if (t.type === 'ident') {
      this.pos++
      const name = t.value
      const upper = name.toUpperCase()
      if (upper === 'TRUE') return true
      if (upper === 'FALSE') return false

      // 带括号的标识符只允许白名单数学函数，其余一律拒绝
      if (this.tokens[this.pos].type === 'op' && this.tokens[this.pos].value === '(') {
        const fn = FUNCTIONS[name]
        if (!fn) throw new ExpressionError(`不支持的函数 "${name}"`)
        this.pos++
        const args: number[] = []
        if (!(this.tokens[this.pos].type === 'op' && this.tokens[this.pos].value === ')')) {
          args.push(numeric(this.parseOr()))
          while (this.tokens[this.pos].type === 'op' && this.tokens[this.pos].value === ',') {
            this.pos++
            args.push(numeric(this.parseOr()))
          }
        }
        this.expectOp(')', '函数调用缺少右括号')
        return fn(...args)
      }

      // 变量查表：键不存在按 0（与旧实现 `Number(v) || 0` 的兜底语义一致）；
      // 数据源可能推送 NaN（脏数据），这里归零而不是带进运算
      if (!(name in this.data)) return 0
      const raw = this.data[name]
      return typeof raw === 'number' && Number.isNaN(raw) ? 0 : (raw as Value)
    }

    if (t.type === 'op' && t.value === '(') {
      this.pos++
      const v = this.parseOr()
      this.expectOp(')', '括号不匹配')
      return v
    }

    throw new ExpressionError(`意外的 token "${t.value || '表达式结束'}"`)
  }

  private matchKeyword(kw: 'AND' | 'OR'): boolean {
    const t = this.tokens[this.pos]
    if (t.type === 'ident' && t.value.toUpperCase() === kw) {
      this.pos++
      return true
    }
    return false
  }

  private matchOp(op: string): boolean {
    const t = this.tokens[this.pos]
    if (t.type === 'op' && t.value === op) {
      this.pos++
      return true
    }
    return false
  }

  private expectOp(op: string, message: string): void {
    if (!this.matchOp(op)) throw new ExpressionError(message)
  }
}

/**
 * 词法结果缓存：报警/着色在每次数据推送时都会重算表达式，
 * 同一表达式反复 tokenize 是纯浪费；缓存有上限，防止工程里
 * 出现大量动态拼接表达式把缓存撑爆。
 */
const TOKEN_CACHE_LIMIT = 200
const tokenCache = new Map<string, Token[]>()

function getCachedTokens(expr: string): Token[] {
  const cached = tokenCache.get(expr)
  if (cached) return cached
  const tokens = tokenize(expr)
  if (tokenCache.size >= TOKEN_CACHE_LIMIT) {
    // Map 保序，淘汰最早写入的一条即可
    const firstKey = tokenCache.keys().next().value
    if (firstKey !== undefined) tokenCache.delete(firstKey)
  }
  tokenCache.set(expr, tokens)
  return tokens
}

/**
 * 求值表达式，返回布尔结果。任何语法/求值错误按 false 处理并输出警告，
 * 与旧实现"catch 后返回 false"的行为保持一致，规则配置错误不会拖垮画面。
 */
export function evaluateExpression(expr: string, data: Record<string, any>): boolean {
  try {
    return new Parser(getCachedTokens(expr), data).evaluate()
  } catch (e) {
    console.warn(`[StatusEngine] 表达式求值失败: "${expr}"`, e instanceof Error ? e.message : e)
    return false
  }
}
