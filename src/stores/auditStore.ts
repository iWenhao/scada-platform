import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStorage } from '@/storage'

/**
 * 写值审计日志。
 *
 * 控制下行是危险操作，"谁在何时对哪个点写了什么值、结果如何"必须留痕：
 * 出问题时可追溯，也倒逼操作者谨慎。日志全局一份（不按工程分隔——审计
 * 关心的是对系统的操作流），随存储后端持久化，本地上限内存中最近 500 条。
 */

/** 单条审计记录 */
export interface AuditEntry {
  /** 毫秒时间戳 */
  t: number
  /** 操作者（当前无账号体系，预留字段；本地运行固定为"操作员"） */
  operator: string
  /** 目标设备 */
  deviceId: string
  /** 目标变量 */
  variable: string
  /** 下发的值 */
  value: string
  /** 是否成功 */
  ok: boolean
  /** 失败原因（成功时为空） */
  error?: string
}

const STORE_KEY = 'scada_audit_log'
const MAX_ENTRIES = 500

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditEntry[]>([])

  /** 启动时恢复历史（供查看入口调用，不自动阻塞首屏） */
  async function load() {
    try {
      const json = await getStorage().get(STORE_KEY)
      const restored = json ? JSON.parse(json) : []
      entries.value = Array.isArray(restored) ? restored.slice(0, MAX_ENTRIES) : []
    } catch {
      console.warn('[auditStore] 审计日志数据损坏，已忽略')
      entries.value = []
    }
  }

  /** 记录一次写值。同步入内存列表并异步落盘，失败不影响调用方 */
  function record(
    entry: Omit<AuditEntry, 't' | 'operator' | 'value'> & {
      operator?: string
      value: string | number
    },
  ) {
    const full: AuditEntry = {
      t: Date.now(),
      operator: entry.operator ?? '操作员',
      deviceId: entry.deviceId,
      variable: entry.variable,
      value: String(entry.value),
      ok: entry.ok,
      error: entry.error,
    }
    entries.value = [full, ...entries.value].slice(0, MAX_ENTRIES)
    void getStorage()
      .set(STORE_KEY, JSON.stringify(entries.value))
      .catch(e => console.warn('[auditStore] 审计日志落盘失败', e))
  }

  function clear() {
    entries.value = []
    void getStorage()
      .set(STORE_KEY, JSON.stringify(entries.value))
      .catch(e => console.warn('[auditStore] 审计日志落盘失败', e))
  }

  return { entries, load, record, clear }
})
