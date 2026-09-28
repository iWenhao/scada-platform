import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useAlarmStore } from './alarmStore'
import { useCanvasStore } from './canvasStore'
import { useDeviceStore } from './deviceStore'
import type { ComponentInstance, StatusRule } from '@/types/scada'

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
