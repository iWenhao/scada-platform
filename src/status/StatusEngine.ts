import type { StatusRule, Condition } from '@/types/scada'

export class StatusEngine {
  /**
   * 评估状态规则，返回匹配的状态
   */
  evaluate(rules: StatusRule[], data: Record<string, any>): StatusRule | null {
    if (!rules || rules.length === 0) {
      return null
    }
    
    // 按优先级排序（数字越小优先级越高）
    const sorted = [...rules].sort((a, b) => a.priority - b.priority)
    
    for (const rule of sorted) {
      if (this.evaluateCondition(rule.condition, data)) {
        return rule
      }
    }
    
    return null
  }

  /**
   * 批量评估多个设备状态
   */
  evaluateBatch(
    devices: Array<{ id: string; rules: StatusRule[] }>,
    data: Record<string, Record<string, any>>
  ): Map<string, StatusRule | null> {
    const results = new Map<string, StatusRule | null>()
    
    for (const device of devices) {
      const deviceData = data[device.id] || {}
      results.set(device.id, this.evaluate(device.rules, deviceData))
    }
    
    return results
  }

  /**
   * 评估单个条件
   */
  evaluateCondition(condition: Condition, data: Record<string, any>): boolean {
    switch (condition.type) {
      case 'compare':
        return this.compare(
          Number(data[condition.variable] ?? 0),
          condition.operator,
          condition.value
        )
      
      case 'range': {
        const val = Number(data[condition.variable] ?? 0)
        return val >= condition.min && val <= condition.max
      }
      
      case 'and':
        return condition.conditions.every(c => this.evaluateCondition(c, data))
      
      case 'or':
        return condition.conditions.some(c => this.evaluateCondition(c, data))
      
      case 'expression':
        return this.evaluateExpression(condition.expr, data)
      
      default:
        return false
    }
  }

  /**
   * 比较运算
   */
  private compare(a: number, op: string, b: number): boolean {
    switch (op) {
      case '>':  return a > b
      case '<':  return a < b
      case '=':  return a === b
      case '>=': return a >= b
      case '<=': return a <= b
      case '!=': return a !== b
      default:   return false
    }
  }

  /**
   * 表达式求值（支持 AND/OR/比较）
   */
  private evaluateExpression(expr: string, data: Record<string, any>): boolean {
    try {
      let processed = expr
      // 替换变量名为值
      for (const [key, value] of Object.entries(data)) {
        processed = processed.replace(new RegExp(`\\b${key}\\b`, 'g'), String(Number(value) || 0))
      }
      // 替换逻辑运算符（大小写均可）
      processed = processed.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||')
      // 安全求值
      return Function(`"use strict"; return (${processed})`)()
    } catch {
      return false
    }
  }
}

// 单例导出
export const statusEngine = new StatusEngine()
