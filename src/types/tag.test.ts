import { describe, it, expect } from 'vitest'
import {
  parseTagCsv,
  tagsToCsv,
  tagKey,
  tagToCsvRow,
  findTag,
  checkWriteAllowed,
  checkUnregisteredPolicy,
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

describe('findTag / checkWriteAllowed', () => {
  const tags: TagDef[] = [
    {
      id: 'a',
      deviceId: 'motor_1',
      name: 'speed',
      dataType: 'number',
      min: 0,
      max: 3000,
      writable: true,
    },
    {
      id: 'b',
      deviceId: 'motor_1',
      name: 'temp',
      dataType: 'number',
      writable: false,
    },
  ]

  it('findTag 支持短变量名与全键', () => {
    expect(findTag(tags, 'motor_1', 'speed')?.id).toBe('a')
    expect(findTag(tags, 'motor_1', 'motor_1.speed')?.id).toBe('a')
    expect(findTag(tags, 'other', 'speed')).toBeNull()
  })

  it('未登记点位默认允许写', () => {
    expect(checkWriteAllowed(null, 1)).toBeNull()
  })

  it('只读点位拒绝', () => {
    expect(checkWriteAllowed(tags[1], 1)).toMatch(/只读/)
  })

  it('量程校验', () => {
    expect(checkWriteAllowed(tags[0], 1500)).toBeNull()
    expect(checkWriteAllowed(tags[0], -1)).toMatch(/下限/)
    expect(checkWriteAllowed(tags[0], 5000)).toMatch(/上限/)
  })

  it('数值点位写入字符串被类型校验拒绝', () => {
    expect(checkWriteAllowed(tags[0], '1500')).toMatch(/数值类型/)
  })

  describe('string / boolean 类型点位', () => {
    const strTag: TagDef = { id: 's', deviceId: 'dev', name: 'label', dataType: 'string', writable: true }
    const boolTag: TagDef = { id: 'b', deviceId: 'dev', name: 'running', dataType: 'boolean', writable: true }

    it('字符串点位接受非空文本，拒绝空串与非字符串', () => {
      expect(checkWriteAllowed(strTag, '运行正常')).toBeNull()
      expect(checkWriteAllowed(strTag, '')).toMatch(/非空文本/)
      expect(checkWriteAllowed(strTag, '   ')).toMatch(/非空文本/)
      expect(checkWriteAllowed(strTag, 1)).toMatch(/字符串类型/)
    })

    it('开关点位接受布尔值，拒绝数字与字符串', () => {
      expect(checkWriteAllowed(boolTag, true)).toBeNull()
      expect(checkWriteAllowed(boolTag, false)).toBeNull()
      expect(checkWriteAllowed(boolTag, 1)).toMatch(/开关类型/)
      expect(checkWriteAllowed(boolTag, 'true')).toMatch(/开关类型/)
    })
  })
})

describe('checkUnregisteredPolicy', () => {
  it('allow / warn 放行（warn 的提示由调用方处理）', () => {
    expect(checkUnregisteredPolicy('allow', null)).toBeNull()
    expect(checkUnregisteredPolicy('warn', null)).toBeNull()
  })

  it('deny 拒绝未登记点位', () => {
    expect(checkUnregisteredPolicy('deny', null)).toMatch(/未在点表中登记/)
  })

  it('已登记点位不受策略影响', () => {
    const tag: TagDef = { id: 'x', deviceId: 'd', name: 'v', dataType: 'number' }
    expect(checkUnregisteredPolicy('deny', tag)).toBeNull()
  })
})
