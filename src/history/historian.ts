/**
 * 历史数据上报与查询客户端。
 *
 * 上报策略：内存队列 + 定时批量 flush。逐点发请求在 1s 采样率下会把
 * 存储服务打成碎片写入，批量 5s 一发是采样场景的合理折中。
 *
 * 两种后端：
 *   - remote（存储服务在线）：POST/GET 服务端时序接口，按天分片落盘
 *   - local（存储服务离线）：降级写入存储抽象（localStorage，带用户命名空间），
 *     键为 `history:<key>:<YYYYMMDD>`，值为采样 JSON 数组——
 *     过去离线模式下历史只留在内存、刷新即失，与"历史可追溯"的承诺不符
 * 失败策略：远程模式连续多次失败后本次会话内停止远程上报（画面照常运行，
 * 恢复能力随下次刷新回来），但不影响本地降级路径。
 */
import { resolveApiBase } from '@/storage/config'
import { authHeaders } from '@/auth/session'
import { getStorage, storageMode } from '@/storage'

export interface SamplePoint {
  t: number
  v: number
}

/** flush 周期（毫秒）：与 Mock 1s 采样相比，5s 批量一次足够 */
const FLUSH_INTERVAL = 5000
/** 队列上限：超过说明后端长期不可用，丢最老的，内存不被拖垮 */
const MAX_QUEUE_POINTS = 20000
/** 连续失败该次数后停用远程上报 */
const MAX_FAILS = 3
/** 本地模式下单个 key 单日保留的最大点数（localStorage 有配额，不能无限写） */
const MAX_LOCAL_POINTS_PER_DAY = 2000

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

/** 本地降级时按天分片的存储键 */
function localKey(key: string, t: number): string {
  const d = new Date(t)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `history:${key}:${d.getFullYear()}${mm}${dd}`
}

/** 累积一个采样点（仅数值），入队即返回，落盘在后台批量处理 */
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

/**
 * 立即把队列刷到存储：远程模式走服务端接口，本地模式写存储抽象。
 * 远程成功清零失败计数；连续失败累计到阈值后停用远程上报。
 */
export async function flush(): Promise<boolean> {
  if (disabled || queue.size === 0) return true

  const payload: Record<string, SamplePoint[]> = {}
  for (const [key, points] of queue) {
    if (points.length) payload[key] = points
  }
  if (Object.keys(payload).length === 0) return true

  if (storageMode() !== 'remote') {
    try {
      await flushToLocal(payload)
      queue.clear()
      return true
    } catch (e) {
      console.warn('[historian] 本地历史写入失败', e)
      return false
    }
  }

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

/** 本地降级写入：按 key+天合并后回写，超过上限保留最近的点 */
async function flushToLocal(payload: Record<string, SamplePoint[]>): Promise<void> {
  const storage = getStorage()
  for (const [key, points] of Object.entries(payload)) {
    const byDay = new Map<string, SamplePoint[]>()
    for (const p of points) {
      const k = localKey(key, p.t)
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k)!.push(p)
    }
    for (const [storeKey, pts] of byDay) {
      const raw = await storage.get(storeKey)
      let existing: SamplePoint[] = []
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) existing = parsed
        } catch {
          existing = []
        }
      }
      const merged = [...existing, ...pts].sort((a, b) => a.t - b.t)
      const trimmed = merged.length > MAX_LOCAL_POINTS_PER_DAY
        ? merged.slice(merged.length - MAX_LOCAL_POINTS_PER_DAY)
        : merged
      await storage.set(storeKey, JSON.stringify(trimmed))
    }
  }
}

/** 查询某变量在 [from, to] 区间内的历史 */
export async function queryHistory(
  key: string,
  from: number,
  to: number,
  maxPoints = 600,
): Promise<SamplePoint[]> {
  const points = storageMode() === 'remote'
    ? await queryRemote(key, from, to, maxPoints)
    : await queryLocal(key, from, to)
  return downsample(points, maxPoints)
}

/** 服务端负责抽稀到 maxPoints，此处仍做一次保险裁剪 */
async function queryRemote(
  key: string,
  from: number,
  to: number,
  maxPoints: number,
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

/** 本地查询：只读与区间相交的分片（与服务端一致的按天组织） */
async function queryLocal(key: string, from: number, to: number): Promise<SamplePoint[]> {
  const storage = getStorage()
  const result: SamplePoint[] = []
  // 逐天回读：区间跨度可能跨多天，但天数有限（7 天视图最多 8 个分片）
  const startDay = new Date(from)
  startDay.setHours(0, 0, 0, 0)
  for (let t = startDay.getTime(); t <= to; t += 24 * 3600_000) {
    const raw = await storage.get(localKey(key, t))
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) continue
      for (const p of parsed) {
        if (typeof p?.t === 'number' && typeof p?.v === 'number' && p.t >= from && p.t <= to) {
          result.push(p)
        }
      }
    } catch {
      // 损坏分片跳过
    }
  }
  return result.sort((a, b) => a.t - b.t)
}

/** 均匀抽稀到 maxPoints 以内（保留首尾），超过时按间隔取样 */
function downsample(points: SamplePoint[], maxPoints: number): SamplePoint[] {
  if (maxPoints <= 0 || points.length <= maxPoints) return points
  const step = (points.length - 1) / (maxPoints - 1)
  const result: SamplePoint[] = []
  for (let i = 0; i < maxPoints; i++) result.push(points[Math.round(i * step)])
  return result
}

/** 上报是否仍可用（远程连续失败停用后为 false，UI 可据此提示） */
export function historianEnabled(): boolean {
  return !disabled
}

/** 当前历史存储位置：供 UI 提示"本地暂存/服务端" */
export function historianBackend(): 'remote' | 'local' {
  return storageMode() === 'remote' ? 'remote' : 'local'
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
