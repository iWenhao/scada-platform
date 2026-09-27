import { describe, it, expect } from 'vitest'
import { StatusEngine } from './StatusEngine'
import type { StatusRule, Condition } from '@/types/scada'

describe('StatusEngine', () => {
  const engine = new StatusEngine()

  describe('evaluate', () => {
    it('应该返回匹配的状态规则', () => {
      const rules: StatusRule[] = [
        {
          id: 'running',
          name: '运行',
          color: '#00d4aa',
          condition: { type: 'compare', variable: 'speed', operator: '>', value: 0 },
          priority: 1,
        },
        {
          id: 'stopped',
          name: '停止',
          color: '#ff4757',
          condition: { type: 'compare', variable: 'speed', operator: '=', value: 0 },
          priority: 2,
        },
      ]

      const data = { speed: 100 }
      const result = engine.evaluate(rules, data)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('running')
      expect(result?.name).toBe('运行')
    })

    it('应该按优先级返回匹配的规则', () => {
      const rules: StatusRule[] = [
        {
          id: 'high-temp',
          name: '高温',
          color: '#ff4757',
          condition: { type: 'compare', variable: 'temp', operator: '>', value: 80 },
          priority: 1,
        },
        {
          id: 'running',
          name: '运行',
          color: '#00d4aa',
          condition: { type: 'compare', variable: 'speed', operator: '>', value: 0 },
          priority: 2,
        },
      ]

      const data = { speed: 100, temp: 90 }
      const result = engine.evaluate(rules, data)

      expect(result?.id).toBe('high-temp')
    })

    it('当没有匹配时应该返回null', () => {
      const rules: StatusRule[] = [
        {
          id: 'running',
          name: '运行',
          color: '#00d4aa',
          condition: { type: 'compare', variable: 'speed', operator: '>', value: 1000 },
          priority: 1,
        },
      ]

      const data = { speed: 100 }
      const result = engine.evaluate(rules, data)

      expect(result).toBeNull()
    })

    it('当规则为空时应该返回null', () => {
      const result = engine.evaluate([], { speed: 100 })
      expect(result).toBeNull()
    })
  })

  describe('compare条件', () => {
    it('应该正确比较 >', () => {
      const condition: Condition = { type: 'compare', variable: 'x', operator: '>', value: 10 }
      expect(engine.evaluateCondition(condition, { x: 15 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 5 })).toBe(false)
      expect(engine.evaluateCondition(condition, { x: 10 })).toBe(false)
    })

    it('应该正确比较 <', () => {
      const condition: Condition = { type: 'compare', variable: 'x', operator: '<', value: 10 }
      expect(engine.evaluateCondition(condition, { x: 5 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 15 })).toBe(false)
      expect(engine.evaluateCondition(condition, { x: 10 })).toBe(false)
    })

    it('应该正确比较 =', () => {
      const condition: Condition = { type: 'compare', variable: 'x', operator: '=', value: 10 }
      expect(engine.evaluateCondition(condition, { x: 10 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 11 })).toBe(false)
    })

    it('应该正确比较 >=', () => {
      const condition: Condition = { type: 'compare', variable: 'x', operator: '>=', value: 10 }
      expect(engine.evaluateCondition(condition, { x: 10 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 11 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 9 })).toBe(false)
    })

    it('应该正确比较 <=', () => {
      const condition: Condition = { type: 'compare', variable: 'x', operator: '<=', value: 10 }
      expect(engine.evaluateCondition(condition, { x: 10 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 9 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 11 })).toBe(false)
    })

    it('应该正确比较 !=', () => {
      const condition: Condition = { type: 'compare', variable: 'x', operator: '!=', value: 10 }
      expect(engine.evaluateCondition(condition, { x: 11 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 10 })).toBe(false)
    })
  })

  describe('range条件', () => {
    it('应该正确判断区间', () => {
      const condition: Condition = { type: 'range', variable: 'x', min: 10, max: 20 }
      expect(engine.evaluateCondition(condition, { x: 15 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 5 })).toBe(false)
      expect(engine.evaluateCondition(condition, { x: 25 })).toBe(false)
      expect(engine.evaluateCondition(condition, { x: 10 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 20 })).toBe(true)
    })
  })

  describe('and条件', () => {
    it('应该所有条件都满足时返回true', () => {
      const condition: Condition = {
        type: 'and',
        conditions: [
          { type: 'compare', variable: 'x', operator: '>', value: 10 },
          { type: 'compare', variable: 'y', operator: '<', value: 20 },
        ],
      }

      expect(engine.evaluateCondition(condition, { x: 15, y: 10 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 5, y: 10 })).toBe(false)
      expect(engine.evaluateCondition(condition, { x: 15, y: 25 })).toBe(false)
    })
  })

  describe('or条件', () => {
    it('应该任一条件满足时返回true', () => {
      const condition: Condition = {
        type: 'or',
        conditions: [
          { type: 'compare', variable: 'x', operator: '>', value: 100 },
          { type: 'compare', variable: 'y', operator: '<', value: 10 },
        ],
      }

      expect(engine.evaluateCondition(condition, { x: 150, y: 50 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 50, y: 5 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 50, y: 50 })).toBe(false)
    })
  })

  describe('expression条件', () => {
    it('应该正确求值表达式', () => {
      const condition: Condition = {
        type: 'expression',
        expr: 'speed > 100 AND temp < 80',
      }

      expect(engine.evaluateCondition(condition, { speed: 150, temp: 60 })).toBe(true)
      expect(engine.evaluateCondition(condition, { speed: 50, temp: 60 })).toBe(false)
      expect(engine.evaluateCondition(condition, { speed: 150, temp: 90 })).toBe(false)
    })

    it('应该支持OR表达式', () => {
      const condition: Condition = {
        type: 'expression',
        expr: 'x > 100 OR y < 10',
      }

      expect(engine.evaluateCondition(condition, { x: 150, y: 50 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 50, y: 5 })).toBe(true)
      expect(engine.evaluateCondition(condition, { x: 50, y: 50 })).toBe(false)
    })
  })

  describe('evaluateBatch', () => {
    it('应该批量评估多个设备状态', () => {
      const devices = [
        {
          id: 'motor_1',
          rules: [
            {
              id: 'running',
              name: '运行',
              color: '#00d4aa',
              condition: { type: 'compare' as const, variable: 'speed', operator: '>' as const, value: 0 },
              priority: 1,
            },
          ],
        },
        {
          id: 'motor_2',
          rules: [
            {
              id: 'stopped',
              name: '停止',
              color: '#ff4757',
              condition: { type: 'compare' as const, variable: 'speed', operator: '=' as const, value: 0 },
              priority: 1,
            },
          ],
        },
      ]

      const data = {
        motor_1: { speed: 100 },
        motor_2: { speed: 0 },
      }

      const results = engine.evaluateBatch(devices, data)

      expect(results.get('motor_1')?.id).toBe('running')
      expect(results.get('motor_2')?.id).toBe('stopped')
    })
  })
})
