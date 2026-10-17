/**
 * 时序历史（按天分片 JSONL）。
 * 目录：HISTORY_DIR/<scope>/  每 key 一天一个文件 `<key>.<YYYYMMDD>.jsonl`。
 */
import path from 'node:path'
import { promises as fs } from 'node:fs'

/** 时间戳 → `YYYYMMDD` 分片名 */
export function dayString(ms) {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}${mm}${dd}`
}

function shardFile(dir, key, day) {
  return path.join(dir, `${encodeURIComponent(key)}.${day}.jsonl`)
}

function isHistoryShard(fileName, encodedKey) {
  return fileName.startsWith(encodedKey + '.') && fileName.endsWith('.jsonl')
}

/** 历史分片目录（按用户隔离） */
export function historyDirFor(historyRoot, scope) {
  return path.join(historyRoot, scope.replace(/\/+$/, ''))
}

/**
 * 按天分组追加采样。非法点（t/v 非有限数）跳过。
 * @returns {Promise<number>} 实际写入的点数
 */
export async function appendSamples(historyDir, key, samples) {
  const byDay = new Map()
  let count = 0
  for (const s of samples) {
    if (typeof s?.t !== 'number' || typeof s?.v !== 'number' || !Number.isFinite(s.t) || !Number.isFinite(s.v)) continue
    const day = dayString(s.t)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(`${JSON.stringify({ t: Math.round(s.t), v: s.v })}\n`)
    count++
  }
  if (count === 0) return 0
  await fs.mkdir(historyDir, { recursive: true })
  for (const [day, lines] of byDay) {
    await fs.appendFile(shardFile(historyDir, key, day), lines.join(''), 'utf8')
  }
  return count
}

/**
 * 窗口聚合方式：min 取窗口内最小值，max 取最大值，avg 取算术平均。
 * 与前端 src/history/historian.ts 的 HistoryAgg 取值保持一致。
 */
const AGG_KINDS = new Set(['min', 'avg', 'max'])

/**
 * 按窗口把已按时间排序的点聚合成一个点（t 取窗口起始，跨查询稳定可比）。
 * @param {number} bucket 窗口起始时间戳
 * @param {{ min: number, max: number, sum: number, count: number }} acc 窗口累加器
 * @param {string} agg 聚合方式
 */
function bucketToPoint(bucket, acc, agg) {
  const v = agg === 'min' ? acc.min : agg === 'max' ? acc.max : acc.sum / acc.count
  return { t: bucket, v }
}

/**
 * 超过 maxPoints 时均匀抽稀（保留首尾），前后端行为保持一致。
 */
function limitPoints(points, maxPoints) {
  if (!(maxPoints > 0) || points.length <= maxPoints) return points
  if (maxPoints === 1) return [points[points.length - 1]]
  const step = (points.length - 1) / (maxPoints - 1)
  const sampled = []
  for (let i = 0; i < maxPoints; i++) sampled.push(points[Math.round(i * step)])
  return sampled
}

/**
 * 查询 [from, to] 区间采样。超过 maxPoints 时均匀抽稀（保留首尾）。
 * 传 options.agg + options.windowMs 时走服务端窗口聚合：边读边按窗口归约，
 * 内存只保留窗口数（几百个）而非全部原始点，长跨度查询不再全量回传。
 * @param {object} [options] 可选 { agg: 'min'|'avg'|'max', windowMs: number }
 */
export async function querySamples(historyDir, key, from, to, maxPoints, options = {}) {
  const encodedKey = encodeURIComponent(key)
  let files = []
  try {
    files = await fs.readdir(historyDir)
  } catch {
    return []
  }

  const shards = files
    .filter(f => isHistoryShard(f, encodedKey))
    .map(f => {
      const day = f.slice(encodedKey.length + 1, -'.jsonl'.length)
      return { file: path.join(historyDir, f), day }
    })
    .filter(({ day }) => {
      if (!/^\d{8}$/.test(day)) return false
      const dayStart = new Date(
        Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8)),
      ).getTime()
      const dayEnd = dayStart + 24 * 3600 * 1000
      return dayEnd >= from && dayStart <= to
    })
    .sort((a, b) => (a.day < b.day ? -1 : 1))

  // 聚合参数归一：非法取值回落为普通查询（兼容旧前端与手工调用）。
  const agg = AGG_KINDS.has(options?.agg) ? options.agg : null
  const windowMs = Number(options?.windowMs)
  const useAgg = agg !== null && Number.isFinite(windowMs) && windowMs >= 1000
  // 窗口上限 24h：窗口过大将整区间压成一个点，失去趋势意义，直接拒绝走普通查询。
  const effectiveAgg = useAgg && windowMs <= 24 * 3600 * 1000 ? agg : null
  const effectiveWindow = effectiveAgg ? Math.round(windowMs) : 0
  // 窗口按 epoch 对齐（floor(t / window)），多次查询/翻页结果稳定可比。
  const buckets = effectiveAgg ? new Map() : null

  const points = []
  for (const { file } of shards) {
    let text
    try {
      text = await fs.readFile(file, 'utf8')
    } catch {
      continue
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        const p = JSON.parse(line)
        if (typeof p.t !== 'number' || typeof p.v !== 'number' || !Number.isFinite(p.t) || !Number.isFinite(p.v)) continue
        if (p.t < from || p.t > to) continue
        if (effectiveAgg) {
          const bucket = Math.floor(p.t / effectiveWindow) * effectiveWindow
          let acc = buckets.get(bucket)
          if (!acc) {
            acc = { min: p.v, max: p.v, sum: 0, count: 0 }
            buckets.set(bucket, acc)
          }
          if (p.v < acc.min) acc.min = p.v
          if (p.v > acc.max) acc.max = p.v
          acc.sum += p.v
          acc.count += 1
        } else {
          points.push({ t: p.t, v: p.v })
        }
      } catch {
        // 损坏行跳过
      }
    }
  }

  if (effectiveAgg) {
    const aggregated = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, acc]) => bucketToPoint(bucket, acc, effectiveAgg))
    return limitPoints(aggregated, maxPoints)
  }

  points.sort((a, b) => a.t - b.t)
  return limitPoints(points, maxPoints)
}

/** 分片文件名尾部的日期段：`<key>.<YYYYMMDD>.jsonl` */
const SHARD_DAY_RE = /\.(\d{8})\.jsonl$/

/**
 * 递归枚举目录下所有分片。
 * 层级不能写死成一层：命名空间是 `u/<userId>/`，分片实际落在 historyRoot/u/<userId>/ 下，
 * 只扫一层时 readdir 拿到的是「u」这一个目录名、匹配不到分片正则，
 * 于是保留期任务每次返回 0、历史文件无限增长且没有任何报错。
 */
async function* iterShardFiles(dir) {
  let entries = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    // 符号链接的 Dirent 既不是 directory 也不会命中分片名，天然不会被递归带成环
    if (entry.isDirectory()) yield* iterShardFiles(full)
    else {
      const m = SHARD_DAY_RE.exec(entry.name)
      if (m) yield { file: full, day: m[1] }
    }
  }
}

/**
 * 清理所有用户目录下超过保留期的分片。
 * @returns {Promise<number>} 实际删除的分片数
 */
export async function cleanupExpiredShards(historyRoot, retentionDays) {
  if (retentionDays <= 0) return 0
  const expireDay = dayString(Date.now() - retentionDays * 24 * 3600 * 1000)
  let removed = 0
  for await (const { file, day } of iterShardFiles(historyRoot)) {
    // 字符串比较即日期比较（定长 YYYYMMDD）；等于 expireDay 的分片属保留期内，不删
    if (day < expireDay) {
      await fs.rm(file, { force: true })
      removed++
    }
  }
  return removed
}
