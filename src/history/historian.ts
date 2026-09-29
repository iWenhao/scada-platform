/**
 * 历史数据上报与查询客户端。
 *
 * 上报策略：内存队列 + 定时批量 flush。逐点发请求在 1s 采样率下会把
 * 存储服务打成碎片写入，批量 5s 一发是采样场景的合理折中。
 * 失败策略：连续多次失败后本次会话内停用（画面照常运行，只是不再累积
 * 历史），避免存储后端离线时反复打无效请求；恢复能力随下次刷新回来。
 */
import { resolveApiBase } from '@/storage/config'
import { authHeaders } from '@/auth/session'

export interface SamplePoint {
  t: number
  v: number
}

/** flush 周期（毫秒）：与 Mock 1s 采样相比，5s 批量一次足够 */
const FLUSH_INTERVAL = 5000
/** 队列上限：超过说明后端长期不可用，丢最老的，内存不被拖垮 */
const MAX_QUEUE_POINTS = 20000
/** 连续失败该次数后停用上报 */
const MAX_FAILS = 3

const queue = new Map<string, SamplePoint[]>()
let flushTimer: number | null = null
let failCount = 0
let disabled = false

function ensureTimer() {
  if (flushTimer !== null || disabled) return
  flushTimer = window.setInterval(() => {
    void flush()
  }, FLUSH_INTERVAL)
}

/** 累积一个采样点（仅数值），入队即返回，网络在后台批量处理 */
export function pushSample(key: string, t: number, v: number) {
  if (disabled || !Number.isFinite(t) || !Number.isFinite(v)) return
  let points = queue.get(key)
  if (!points) {
    points = []
    queue.set(key, points)
  }
  points.push({ t, v })
  // 丢最老的 key 整段，而不是逐点裁剪：长期断连时优先保住新数据的完整性
  let total = 0
  for (const pts of queue.values()) total += pts.length
  while (total > MAX_QUEUE_POINTS && queue.size > 1) {
    const oldest = queue.keys().next().value
    if (oldest === undefined) break
    total -= queue.get(oldest)!.length
    queue.delete(oldest)
  }
  ensureTimer()
}

/** 立即把队列刷到存储后端。成功清零失败计数；失败累计到阈值后停用 */
export async function flush(): Promise<boolean> {
  if (disabled || queue.size === 0) return true

  const payload: Record<string, SamplePoint[]> = {}
  for (const [key, points] of queue) {
    if (points.length) payload[key] = points
  }
  if (Object.keys(payload).length === 0) return true

  try {
    const res = await fetch(`${resolveApiBase()}/history/write`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    queue.clear()
    failCount = 0
    return true
  } catch {
    failCount++
    if (failCount >= MAX_FAILS) {
      disabled = true
      if (flushTimer !== null) {
        clearInterval(flushTimer)
        flushTimer = null
      }
      console.warn('[historian] 历史数据连续上报失败，本次会话停用上报')
    }
    return false
  }
}

/** 查询某变量在 [from, to] 区间内的历史（服务端负责抽稀到 maxPoints） */
export async function queryHistory(
  key: string,
  from: number,
  to: number,
  maxPoints = 600,
): Promise<SamplePoint[]> {
  const params = new URLSearchParams({
    key,
    from: String(Math.round(from)),
    to: String(Math.round(to)),
    maxPoints: String(maxPoints),
  })
  const res = await fetch(`${resolveApiBase()}/history/query?${params}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`历史查询失败: HTTP ${res.status}`)
  const data = await res.json()
  return Array.isArray(data?.points) ? data.points : []
}

/** 上报是否仍可用（连续失败停用后为 false，UI 可据此提示） */
export function historianEnabled(): boolean {
  return !disabled
}

/** 测试与重置用 */
export function resetHistorian() {
  queue.clear()
  failCount = 0
  disabled = false
  if (flushTimer !== null) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}
