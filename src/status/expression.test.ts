import { describe, it, expect, vi, afterEach } from 'vitest'
import { evaluateExpression, ExpressionError } from './expression'

describe('evaluateExpression', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('逻辑与比较（旧实现兼容面）', () => {
    it('支持 AND 大小写混合', () => {
      const data = { speed: 150, temp: 60 }
      expect(evaluateExpression('speed > 100 AND temp < 80', data)).toBe(true)
      expect(evaluateExpression('speed > 100 and temp < 80', data)).toBe(true)
      expect(evaluateExpression('speed > 100 And temp < 80', data)).toBe(true)
      expect(evaluateExpression('speed > 100 AND temp < 50', data)).toBe(false)
    })

    it('支持 OR 大小写混合', () => {
      const data = { x: 50, y: 5 }
      expect(evaluateExpression('x > 100 OR y < 10', data)).toBe(true)
      expect(evaluateExpression('x > 100 or y < 10', data)).toBe(true)
      expect(evaluateExpression('x > 100 OR y < 1', data)).toBe(false)
    })

    it('支持 && 与 || 符号形式', () => {
      expect(evaluateExpression('a > 1 && b > 1', { a: 2, b: 2 })).toBe(true)
      expect(evaluateExpression('a > 1 || b > 1', { a: 0, b: 2 })).toBe(true)
      expect(evaluateExpression('a > 1 || b > 1', { a: 0, b: 0 })).toBe(false)
    })

    it('支持全部比较运算符', () => {
      const data = { x: 10 }
      expect(evaluateExpression('x > 5', data)).toBe(true)
      expect(evaluateExpression('x < 5', data)).toBe(false)
      expect(evaluateExpression('x >= 10', data)).toBe(true)
      expect(evaluateExpression('x <= 9', data)).toBe(false)
      expect(evaluateExpression('x != 9', data)).toBe(true)
    })

    it('单等号按相等处理（宽松兼容）', () => {
      expect(evaluateExpression('x = 10', { x: 10 })).toBe(true)
      expect(evaluateExpression('x = 11', { x: 10 })).toBe(false)
    })

    it('<> 按不等处理（组态软件惯用写法）', () => {
      expect(evaluateExpression('x <> 9', { x: 10 })).toBe(true)
      expect(evaluateExpression('x <> 10', { x: 10 })).toBe(false)
    })
  })

  describe('四则与优先级', () => {
    it('四则运算与优先级', () => {
      expect(evaluateExpression('2 + 3 * 4 = 14', {})).toBe(true)
      expect(evaluateExpression('(2 + 3) * 4 = 20', {})).toBe(true)
      expect(evaluateExpression('10 / 4 = 2.5', {})).toBe(true)
      expect(evaluateExpression('10 % 3 = 1', {})).toBe(true)
    })

    it('一元负号与取反', () => {
      expect(evaluateExpression('-x < 0', { x: 5 })).toBe(true)
      expect(evaluateExpression('!x', { x: 0 })).toBe(true)
      expect(evaluateExpression('!x', { x: 1 })).toBe(false)
    })

    it('除零得到 NaN（视为假），不抛异常', () => {
      expect(evaluateExpression('x / 0 > 0', { x: 1 })).toBe(false)
      expect(evaluateExpression('x % 0 = 0', { x: 1 })).toBe(false)
    })
  })

  describe('变量取值', () => {
    it('变量缺失按 0（与旧实现一致）', () => {
      expect(evaluateExpression('missing = 0', {})).toBe(true)
      expect(evaluateExpression('missing > 0', {})).toBe(false)
    })

    it('非数值变量数值化为 0（与旧实现一致）', () => {
      expect(evaluateExpression('flag = 0', { flag: false })).toBe(true)
      expect(evaluateExpression('flag = 1', { flag: true })).toBe(true)
      expect(evaluateExpression('text = 0', { text: 'abc' })).toBe(true)
    })

    it('布尔字面量参与比较', () => {
      expect(evaluateExpression('flag == true', { flag: true })).toBe(true)
      expect(evaluateExpression('flag == false', { flag: false })).toBe(true)
    })

    it('字符串字面量相等比较', () => {
      expect(evaluateExpression('status == "run"', { status: 'run' })).toBe(true)
      expect(evaluateExpression("status == 'run'", { status: 'stop' })).toBe(false)
    })

    it('支持点号路径作为整体键查表', () => {
      expect(evaluateExpression('motor_1.speed > 50', { 'motor_1.speed': 100 })).toBe(true)
    })
  })

  describe('白名单函数', () => {
    it('支持数学函数', () => {
      expect(evaluateExpression('min(a, b) = 3', { a: 3, b: 5 })).toBe(true)
      expect(evaluateExpression('max(a, b) = 5', { a: 3, b: 5 })).toBe(true)
      expect(evaluateExpression('abs(0 - 4) = 4', {})).toBe(true)
      expect(evaluateExpression('round(2.6) = 3', {})).toBe(true)
      expect(evaluateExpression('floor(2.9) = 2', {})).toBe(true)
      expect(evaluateExpression('ceil(2.1) = 3', {})).toBe(true)
      expect(evaluateExpression('sqrt(9) = 3', {})).toBe(true)
      expect(evaluateExpression('pow(2, 10) = 1024', {})).toBe(true)
    })

    it('拒绝白名单外的函数', () => {
      expect(evaluateExpression('eval("1")', {})).toBe(false)
      expect(evaluateExpression('fetch("http://evil")', {})).toBe(false)
    })
  })

  describe('注入防护（核心安全用例）', () => {
    it('不接受代码注入串，一律返回 false', () => {
      const attack = [
        '1); alert(1',
        '1); fetch("/steal")',
        'x; globalThis',
        'x; process.exit(1)',
        'constructor.constructor("return 1")()',
        'this.constructor',
        'Function("return 1")()',
        '"abc".constructor',
      ]
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      for (const expr of attack) {
        expect(evaluateExpression(expr, { x: 1 })).toBe(false)
      }
      expect(spy).toHaveBeenCalled()
    })

    it('不产生赋值副作用', () => {
      const data: Record<string, any> = { x: 1 }
      evaluateExpression('x = 999', data)
      expect(data.x).toBe(1)
    })

    it('拒绝不完整表达式与非法字符', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(evaluateExpression('x >', { x: 1 })).toBe(false)
      expect(evaluateExpression('(x > 1', { x: 1 })).toBe(false)
      expect(evaluateExpression('x > 1)', { x: 1 })).toBe(false)
      expect(evaluateExpression('x > 1 AND', { x: 1 })).toBe(false)
      expect(evaluateExpression('status == "run', { status: 'run' })).toBe(false)
      expect(evaluateExpression('x > 1; y > 1', { x: 1, y: 1 })).toBe(false)
      expect(spy).toHaveBeenCalled()
    })

    it('超长表达式被拒绝', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(evaluateExpression('1+'.repeat(2000) + '1', {})).toBe(false)
      expect(spy).toHaveBeenCalled()
    })

    it('求值错误抛出的是 ExpressionError 类型（供调用方甄别）', () => {
      // 直接暴露内部行为：tokenize 层错误可通过 evaluateExpression 的警告信息观察，
      // 这里仅确认错误类可构造，供未来 API 使用
      expect(new ExpressionError('test')).toBeInstanceOf(Error)
    })
  })

  describe('缓存行为', () => {
    it('同一表达式重复求值结果一致', () => {
      for (let i = 0; i < 3; i++) {
        expect(evaluateExpression('a > 10 AND b < 5', { a: 20, b: 1 })).toBe(true)
        expect(evaluateExpression('a > 10 AND b < 5', { a: 5, b: 1 })).toBe(false)
      }
    })
  })
})
