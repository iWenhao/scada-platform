import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useCanvasStore } from './canvasStore'
import { useDeviceStore } from './deviceStore'
import { statusEngine } from '@/status/StatusEngine'
import { resolveSeverity } from '@/status/severity'
import type { AlarmSeverity } from '@/types/scada'

/** 一条报警记录（活跃期间唯一，恢复后转入历史） */
export interface AlarmRecord {
  /** `${元素ID}::${规则ID}`，同一元素同一规则复用一条记录 */
  key: string
  elementId: string
  elementName: string
  ruleId: string
  ruleName: string
  severity: Exclude<AlarmSeverity, 'normal'>
  color: string
  /** 首次触发时的变量值 */
  value: string
  /** 最近一次刷新时的变量值 */
  lastValue: string
  /** 触发时间戳 */
  since: number
  /** 是否已确认 */
  acknowledged: boolean
  /** 恢复时间戳（仅历史记录有值） */
  clearedAt?: number
}

/** 历史记录保留条数上限 */
const MAX_HISTORY = 100

const SEVERITY_ORDER = { critical: 0, warning: 1 } as const

function formatValue(raw: unknown): string {
  if (raw === undefined || raw === null) return '-'
  return typeof raw === 'number' ? String(Math.round(raw * 10) / 10) : String(raw)
}

/**
 * 报警中心。
 *
 * 判定放在 store 而非 AlarmPanel 组件内：报警面板挂在 popover 里，
 * 弹层关闭时组件会被销毁，组件内的判定与计时会一并停摆，
 * 导致工具栏徽标冻结在上一次的数字上。store 与渲染解耦后，
 * 报警在数据源推送时增量刷新，与 UI 是否挂载无关。
 */
export const useAlarmStore = defineStore('alarm', () => {
  const canvasStore = useCanvasStore()
  const deviceStore = useDeviceStore()

  /** 当前仍成立的报警，按 key 索引 */
  const activeMap = ref<Record<string, AlarmRecord>>({})
  /** 已恢复的报警记录（倒序，最新的在前） */
  const history = ref<AlarmRecord[]>([])

  /**
   * 报警输入指纹。刻意不 deep watch 整个 elements：
   * 拖拽会高频改写 x/y，而报警只取决于数据、设备绑定与规则本身，
   * 用指纹把这些区分开可以避免拖动时反复全量求值。
   */
  const inputsKey = computed(() =>
    canvasStore.elements
      .filter(el => el.statusRules?.length)
      .map(el =>
        `${el.id}|${el.deviceId ?? ''}|${el.name}|` +
        el.statusRules.map(r => `${r.id}:${resolveSeverity(r)}:${r.priority}`).join(',')
      )
      .join(';')
  )

  const activeAlarms = computed(() =>
    Object.values(activeMap.value).sort((a, b) => {
      if (a.severity !== b.severity) {
        return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      }
      return a.since - b.since
    })
  )

  const alarmHistory = computed(() => history.value)

  /** 活跃报警数（用于工具栏徽标） */
  const activeCount = computed(() => activeAlarms.value.length)

  /** 未确认报警数：确认过的报警不应再催促操作员 */
  const unackedCount = computed(
    () => activeAlarms.value.filter(a => !a.acknowledged).length
  )

  /** 按当前数据刷新报警（一处推送一次全量评估，元素量级下开销可忽略） */
  function recompute() {
    const now = Date.now()
    const stillActive = new Set<string>()

    for (const el of canvasStore.elements) {
      if (!el.statusRules?.length) continue

      const data = deviceStore.getDeviceData(el.deviceId || el.id)
      const matched = statusEngine.evaluate(el.statusRules, data)
      if (!matched) continue

      const severity = resolveSeverity(matched)
      if (severity === 'normal') continue

      const key = `${el.id}::${matched.id}`
      stillActive.add(key)

      const binding = el.dataBindings?.[0]
      const value = formatValue(binding ? data[binding.variable] : undefined)

      const existing = activeMap.value[key]
      if (existing) {
        existing.lastValue = value
        existing.severity = severity
        existing.color = matched.color
        continue
      }

      activeMap.value = {
        ...activeMap.value,
        [key]: {
          key,
          elementId: el.id,
          elementName: el.name,
          ruleId: matched.id,
          ruleName: matched.name,
          severity,
          color: matched.color,
          value,
          lastValue: value,
          since: now,
          acknowledged: false,
        },
      }
    }

    // 条件不再成立的报警转入历史，而不是直接消失
    const survivors: Record<string, AlarmRecord> = {}
    let moved = false
    for (const [key, record] of Object.entries(activeMap.value)) {
      if (stillActive.has(key)) {
        survivors[key] = record
      } else {
        history.value = [{ ...record, clearedAt: now }, ...history.value]
        moved = true
      }
    }
    if (moved) {
      activeMap.value = survivors
      if (history.value.length > MAX_HISTORY) {
        history.value = history.value.slice(0, MAX_HISTORY)
      }
    }
  }

  function acknowledge(key: string) {
    const record = activeMap.value[key]
    if (record) {
      activeMap.value = { ...activeMap.value, [key]: { ...record, acknowledged: true } }
    }
  }

  function acknowledgeAll() {
    const next: Record<string, AlarmRecord> = {}
    for (const [key, record] of Object.entries(activeMap.value)) {
      next[key] = { ...record, acknowledged: true }
    }
    activeMap.value = next
  }

  function clearHistory() {
    history.value = []
  }

  /** 切换项目/数据源时清空，避免上一项目的报警残留 */
  function reset() {
    activeMap.value = {}
    history.value = []
  }

  watch([() => deviceStore.lastUpdateTime, inputsKey], recompute, { immediate: true })

  return {
    activeAlarms,
    alarmHistory,
    activeCount,
    unackedCount,
    recompute,
    acknowledge,
    acknowledgeAll,
    clearHistory,
    reset,
  }
})
