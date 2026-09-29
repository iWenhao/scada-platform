import { describe, it, expect } from 'vitest'
import {
  parseTagCsv,
  tagsToCsv,
  tagKey,
  tagToCsvRow,
  type TagDef,
} from './tag'

const sample: TagDef = {
  id: 't1',
  deviceId: 'motor_1',
  name: 'speed',
  description: '转速',
  unit: 'rpm',
  dataType: 'number',
  min: 0,
  max: 3000,
  writable: true,
  note: '主泵',
}

describe('tagKey / tagToCsvRow', () => {
  it('拼接设备.变量', () => {
    expect(tagKey(sample)).toBe('motor_1.speed')
  })
  it('CSV 行字段对齐', () => {
    expect(tagToCsvRow(sample)).toEqual([
      'motor_1',
      'speed',
      '转速',
      'rpm',
      'number',
      '0',
      '3000',
      '1',
      '主泵',
    ])
  })
})

describe('tagsToCsv / parseTagCsv', () => {
  it('导出再导入应保持字段', () => {
    const csv = tagsToCsv([sample])
    const parsed = parseTagCsv(csv)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].deviceId).toBe('motor_1')
    expect(parsed[0].name).toBe('speed')
    expect(parsed[0].unit).toBe('rpm')
    expect(parsed[0].dataType).toBe('number')
    expect(parsed[0].min).toBe(0)
    expect(parsed[0].max).toBe(3000)
    expect(parsed[0].writable).toBe(true)
    expect(parsed[0].note).toBe('主泵')
  })

  it('无表头时按 deviceId,name 猜测', () => {
    const parsed = parseTagCsv('pump_1,flow\npump_2,level')
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toMatchObject({ deviceId: 'pump_1', name: 'flow', dataType: 'number' })
    expect(parsed[1]).toMatchObject({ deviceId: 'pump_2', name: 'level' })
  })

  it('缺 deviceId/name 的行丢弃', () => {
    const csv = 'deviceId,name\n,orphan\nmotor_1,\nmotor_1,ok'
    const parsed = parseTagCsv(csv)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toBe('ok')
  })

  it('引号字段支持逗号与转义', () => {
    const csv = 'deviceId,name,description\nm1,v1,"含,逗号"\nm2,v2,"引号""内"'
    const parsed = parseTagCsv(csv)
    expect(parsed[0].description).toBe('含,逗号')
    expect(parsed[1].description).toBe('引号"内')
  })

  it('writable 别名与布尔类型', () => {
    const csv = 'device,variable,type,write\nm1,flag,boolean,true\nm2,s,s,0'
    const parsed = parseTagCsv(csv)
    expect(parsed[0].dataType).toBe('boolean')
    expect(parsed[0].writable).toBe(true)
    expect(parsed[1].dataType).toBe('string')
    expect(parsed[1].writable).toBe(false)
  })
})
