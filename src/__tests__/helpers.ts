import type { ComponentInstance, StatusRule } from '@/types/scada'

/**
 * 创建测试用的组件实例
 */
export function createMockComponent(overrides?: Partial<ComponentInstance>): ComponentInstance {
  return {
    id: `el_${Date.now()}`,
    type: 'motor',
    x: 100,
    y: 100,
    width: 80,
    height: 80,
    rotation: 0,
    name: '测试电机',
    layerId: 'device',
    properties: {
      speed: 0,
      temp: 25,
    },
    statusRules: [
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
    ],
    dataBindings: [],
    ...overrides,
  }
}

/**
 * 创建测试用的状态规则
 */
export function createMockStatusRule(overrides?: Partial<StatusRule>): StatusRule {
  return {
    id: 'test_status',
    name: '测试状态',
    color: '#00d4aa',
    condition: { type: 'compare', variable: 'speed', operator: '>', value: 0 },
    priority: 1,
    ...overrides,
  }
}

/**
 * 等待指定时间
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
