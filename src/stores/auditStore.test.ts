import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuditStore } from './auditStore'
import { setStorage, MemoryStorageAdapter, getStorage } from '@/storage'

describe('auditStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
  })

  it('记录写值：时间/操作者/目标/结果完整', () => {
    const audit = useAuditStore()

    audit.record({ deviceId: 'motor_1', variable: 'speed', value: 1200, ok: true })

    expect(audit.entries).toHaveLength(1)
    const e = audit.entries[0]
    expect(e.operator).toBe('操作员')
    expect(e.deviceId).toBe('motor_1')
    expect(e.variable).toBe('speed')
    expect(e.value).toBe('1200')
    expect(e.ok).toBe(true)
    expect(e.t).toBeGreaterThan(0)
  })

  it('失败记录保留原因，最新记录排在最前', () => {
    const audit = useAuditStore()

    audit.record({ deviceId: 'a', variable: 'v', value: 1, ok: true })
    audit.record({ deviceId: 'b', variable: 'v', value: 2, ok: false, error: '未连接' })

    expect(audit.entries).toHaveLength(2)
    expect(audit.entries[0].deviceId).toBe('b')
    expect(audit.entries[0].ok).toBe(false)
    expect(audit.entries[0].error).toBe('未连接')
  })

  it('记录后应异步落盘，load 可恢复', async () => {
    const audit = useAuditStore()
    audit.record({ deviceId: 'motor_1', variable: 'speed', value: 100, ok: true })

    // 等待异步落盘完成
    await vi.waitFor(() => {
      expect(getStorage().get('scada_audit_log')).resolves.not.toBeNull()
    })

    // 新 store 实例恢复
    setActivePinia(createPinia())
    const audit2 = useAuditStore()
    await audit2.load()
    expect(audit2.entries).toHaveLength(1)
    expect(audit2.entries[0].deviceId).toBe('motor_1')
  })

  it('clear 清空内存并落盘', async () => {
    const audit = useAuditStore()
    audit.record({ deviceId: 'a', variable: 'v', value: 1, ok: true })

    audit.clear()

    expect(audit.entries).toHaveLength(0)
    await vi.waitFor(() => {
      expect(getStorage().get('scada_audit_log')).resolves.toBe('[]')
    })
  })
})
