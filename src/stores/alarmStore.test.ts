import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useAlarmStore } from './alarmStore'
import { useCanvasStore } from './canvasStore'
import { useDeviceStore } from './deviceStore'
import { useProjectStore } from './projectStore'
import type { ComponentInstance, StatusRule } from '@/types/scada'
import type { AlarmDefinition } from '@/types/alarm'

function makeElement(overrides: Partial<ComponentInstance> = {}): ComponentInstance {
  return {
    id: 'el_1',
    type: 'tank',
    x: 0,
    y: 0,
    width: 80,
    height: 100,
    rotation: 0,
    name: '储罐1',
    layerId: 'device',
    properties: {},
    statusRules: [],
    dataBindings: [],
    ...overrides,
  }
}

function rule(partial: Partial<StatusRule> = {}): StatusRule {
  return {
    id: 'r1',
    name: '异常',
    color: '#ff4757',
    severity: 'critical',
    condition: { type: 'compare', variable: 'level', operator: '>', value: 80 },
    priority: 1,
    ...partial,
  }
}

describe('alarmStore', () => {
  let alarm: ReturnType<typeof useAlarmStore>
  let canvas: ReturnType<typeof useCanvasStore>
  let device: ReturnType<typeof useDeviceStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    alarm = useAlarmStore()
    canvas = useCanvasStore()
    device = useDeviceStore()
  })

  it('数据满足条件时产生报警', () => {
    canvas.addElement(makeElement({
      deviceId: 'tank_1',
      statusRules: [rule()],
      dataBindings: [{ property: 'level', variable: 'level' }],
    }))
    device.deviceData['tank_1'] = { level: 95 }

    alarm.recompute()

    expect(alarm.activeCount).toBe(1)
    expect(alarm.unackedCount).toBe(1)
    const record = alarm.activeAlarms[0]
    expect(record.severity).toBe('critical')
    expect(record.elementName).toBe('储罐1')
    expect(record.lastValue).toBe('95')
  })

  it('标记为 normal 的规则即便用了报警色也不进报警列表', () => {
    canvas.addElement(makeElement({
      deviceId: 'valve_1',
      statusRules: [rule({ id: 'closed', name: '关闭', color: '#ff4757', severity: 'normal' })],
    }))
    device.deviceData['valve_1'] = { openDegree: 0 }

    alarm.recompute()

    expect(alarm.activeCount).toBe(0)
  })

  it('条件恢复后报警转入历史而非直接消失', () => {
    canvas.addElement(makeElement({
      deviceId: 'tank_1',
      statusRules: [rule()],
    }))
    device.deviceData['tank_1'] = { level: 95 }
    alarm.recompute()
    expect(alarm.activeCount).toBe(1)

    device.deviceData['tank_1'] = { level: 50 }
    alarm.recompute()

    expect(alarm.activeCount).toBe(0)
    expect(alarm.alarmHistory).toHaveLength(1)
    expect(alarm.alarmHistory[0].clearedAt).toBeGreaterThan(0)
  })

  it('确认报警后未确认数归零但报警仍在列表', () => {
    canvas.addElement(makeElement({ deviceId: 'tank_1', statusRules: [rule()] }))
    device.deviceData['tank_1'] = { level: 95 }
    alarm.recompute()

    alarm.acknowledge(alarm.activeAlarms[0].key)

    expect(alarm.activeCount).toBe(1)
    expect(alarm.unackedCount).toBe(0)
  })

  it('全部确认一次性处理所有报警', () => {
    canvas.addElement(makeElement({ id: 'el_1', deviceId: 'tank_1', statusRules: [rule()] }))
    canvas.addElement(makeElement({ id: 'el_2', deviceId: 'tank_2', statusRules: [rule()] }))
    device.deviceData['tank_1'] = { level: 95 }
    device.deviceData['tank_2'] = { level: 95 }
    alarm.recompute()
    expect(alarm.unackedCount).toBe(2)

    alarm.acknowledgeAll()

    expect(alarm.activeCount).toBe(2)
    expect(alarm.unackedCount).toBe(0)
  })

  it('报警按严重级别排序，报警排在预警之前', () => {
    canvas.addElement(makeElement({
      id: 'el_1', deviceId: 'd1',
      statusRules: [rule({ id: 'w', name: '预警', severity: 'warning', priority: 1 })],
    }))
    canvas.addElement(makeElement({
      id: 'el_2', deviceId: 'd2',
      statusRules: [rule({ id: 'c', name: '报警', severity: 'critical', priority: 1 })],
    }))
    device.deviceData['d1'] = { level: 95 }
    device.deviceData['d2'] = { level: 95 }
    alarm.recompute()

    expect(alarm.activeAlarms.map(a => a.severity)).toEqual(['critical', 'warning'])
  })

  it('数据源推送自动刷新报警（无需 UI 组件存活）', async () => {
    canvas.addElement(makeElement({ deviceId: 'tank_1', statusRules: [rule()] }))
    device.deviceData['tank_1'] = { level: 95 }

    // 仅推进数据源时间戳，模拟一次推送
    device.lastUpdateTime = Date.now()
    await nextTick()

    expect(alarm.activeCount).toBe(1)
  })

  it('reset 清空活跃报警与历史', () => {
    canvas.addElement(makeElement({ deviceId: 'tank_1', statusRules: [rule()] }))
    device.deviceData['tank_1'] = { level: 95 }
    alarm.recompute()
    expect(alarm.activeCount).toBe(1)

    alarm.reset()

    expect(alarm.activeCount).toBe(0)
    expect(alarm.alarmHistory).toHaveLength(0)
  })
})

describe('alarmStore - 独立报警定义', () => {
  let alarm: ReturnType<typeof useAlarmStore>
  let device: ReturnType<typeof useDeviceStore>
  let project: ReturnType<typeof useProjectStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    alarm = useAlarmStore()
    device = useDeviceStore()
    project = useProjectStore()
  })

  function makeDef(partial: Partial<AlarmDefinition> = {}): AlarmDefinition {
    return {
      id: 'alm_1',
      name: '液位过高',
      deviceId: 'tank_1',
      variable: 'level',
      severity: 'warning',
      condition: { type: 'compare', variable: 'level', operator: '>', value: 80 },
      deadband: 0,
      onDelayMs: 0,
      enabled: true,
      ...partial,
    }
  }

  it('定义报警不依赖画布元素即可触发与恢复', () => {
    project.setAlarmDefs([makeDef()])
    device.deviceData['tank_1'] = { level: 95 }

    alarm.recompute()
    expect(alarm.activeCount).toBe(1)
    const record = alarm.activeAlarms[0]
    expect(record.key).toBe('def:alm_1')
    expect(record.elementName).toBe('液位过高')
    expect(record.ruleName).toBe('tank_1.level')
    expect(record.severity).toBe('warning')

    device.deviceData['tank_1'] = { level: 50 }
    alarm.recompute()
    expect(alarm.activeCount).toBe(0)
    expect(alarm.alarmHistory).toHaveLength(1)
  })

  it('延时未到不触发，持续满足到时才触发', () => {
    // 判定用时间戳而非定时器，用 fake timers 推进时钟
    vi.useFakeTimers()
    try {
      project.setAlarmDefs([makeDef({ onDelayMs: 5000 })])
      device.deviceData['tank_1'] = { level: 95 }

      alarm.recompute()
      expect(alarm.activeCount).toBe(0)

      vi.advanceTimersByTime(5001)
      device.lastUpdateTime = Date.now()
      alarm.recompute()
      expect(alarm.activeCount).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('延时等待期间条件消失则重新计时', () => {
    vi.useFakeTimers()
    try {
      project.setAlarmDefs([makeDef({ onDelayMs: 5000 })])

      device.deviceData['tank_1'] = { level: 95 }
      alarm.recompute() // 进入延时等待
      expect(alarm.activeCount).toBe(0)

      vi.advanceTimersByTime(1000)
      device.deviceData['tank_1'] = { level: 50 }
      device.lastUpdateTime = Date.now()
      alarm.recompute() // 条件消失，计时取消
      expect(alarm.activeCount).toBe(0)

      vi.advanceTimersByTime(2000)
      device.deviceData['tank_1'] = { level: 95 }
      device.lastUpdateTime = Date.now()
      alarm.recompute() // 重新计时（此刻记为新的起点）
      expect(alarm.activeCount).toBe(0)

      vi.advanceTimersByTime(4999)
      device.lastUpdateTime = Date.now()
      alarm.recompute()
      expect(alarm.activeCount).toBe(0)

      vi.advanceTimersByTime(2)
      device.lastUpdateTime = Date.now()
      alarm.recompute()
      expect(alarm.activeCount).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('死区内波动不恢复，超出死区才恢复', () => {
    project.setAlarmDefs([makeDef({ deadband: 5 })])

    // 触发值 82；条件阈值 80，死区 5 → 条件不满足但仍在 [77, 87] 内时保持报警
    device.deviceData['tank_1'] = { level: 82 }
    alarm.recompute()
    expect(alarm.activeCount).toBe(1)

    // 条件已不满足（82 → 78），但偏离触发值仅 4 < 死区 5，保持报警
    device.deviceData['tank_1'] = { level: 78 }
    alarm.recompute()
    expect(alarm.activeCount).toBe(1)

    // 偏离达到 6 ≥ 死区 5，恢复
    device.deviceData['tank_1'] = { level: 76 }
    alarm.recompute()
    expect(alarm.activeCount).toBe(0)
  })

  it('禁用的定义不参与判定', () => {
    project.setAlarmDefs([makeDef({ enabled: false })])
    device.deviceData['tank_1'] = { level: 95 }

    alarm.recompute()

    expect(alarm.activeCount).toBe(0)
  })
})
