// @vitest-environment node
/**
 * 时序历史：按天分片的写入、窗口查询与保留期清理。
 * 时间戳一律用本地 Date 构造，断言里的期望值同样现算，避免用例绑死在某个时区上。
 */
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  appendSamples,
  cleanupExpiredShards,
  dayString,
  historyDirFor,
  querySamples,
} from './history.mjs'

const DAY = 24 * 3600 * 1000
const HOUR = 3600 * 1000
/** 本地正午，避开分片边界：任何时区下它都落在「同一天」中间 */
const at = (daysFromBase: number, hour = 12) =>
  new Date(new Date(2026, 9, 10).getTime() + daysFromBase * DAY + hour * HOUR).getTime()

let root = ''

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'scada-history-'))
})
afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

/** 每个用例一套独立目录，分片文件名互相看不见；目录由被测函数自己创建 */
function freshDir(name: string) {
  return path.join(root, name, 'u/tester/')
}

describe('dayString 与分片目录', () => {
  it('按本地日期出 YYYYMMDD，月日补零', () => {
    expect(dayString(at(0))).toBe('20261010')
    expect(dayString(new Date(2026, 0, 5).getTime())).toBe('20260105')
    expect(dayString(new Date(2025, 11, 31, 23, 59, 59).getTime())).toBe('20251231')
  })

  it('命名空间尾部的斜杠不进入目录名', () => {
    expect(historyDirFor('/hist', 'u/alice/')).toBe(path.join('/hist', 'u/alice'))
    expect(historyDirFor('/hist', 'u/bob//')).toBe(path.join('/hist', 'u/bob'))
  })
})

describe('appendSamples', () => {
  it('跨天数据各写一个分片，返回值是实际写入的点数', async () => {
    const dir = freshDir('append-day')
    const n = await appendSamples(dir, 'pump:flow', [
      { t: at(0), v: 1 },
      { t: at(1), v: 2 },
      { t: at(1), v: 3 },
    ])
    expect(n).toBe(3)
    const files = (await readdir(dir)).sort()
    expect(files).toEqual(['pump%3Aflow.20261010.jsonl', 'pump%3Aflow.20261011.jsonl'])
  })

  it('非有限数、缺字段的点直接跳过，全部非法时不建目录文件', async () => {
    const dir = freshDir('append-invalid')
    expect(await appendSamples(dir, 'k', [
      { t: at(0), v: NaN },
      { t: at(0), v: Infinity },
      { t: '123', v: 1 },
      { t: at(0) },
      null,
      {},
    ])).toBe(0)
    expect(await readdir(dir).catch(() => [])).toEqual([])

    // 混一个合法点时只写它
    expect(await appendSamples(dir, 'k', [{ t: at(0), v: NaN }, { t: at(0), v: 7 }])).toBe(1)
    expect(await querySamples(dir, 'k', at(0) - HOUR, at(0) + HOUR, 0)).toEqual([{ t: at(0), v: 7 }])
  })

  it('时间戳取整后落盘，读取值与原始 v 一致', async () => {
    const dir = freshDir('append-round')
    const t = at(0) + 0.6
    await appendSamples(dir, 'k', [{ t, v: 1.25 }])
    expect(await querySamples(dir, 'k', t - HOUR, t + HOUR, 0)).toEqual([{ t: Math.round(t), v: 1.25 }])
  })
})

describe('querySamples', () => {
  it('区间两端闭区间，跨天分片按日期挑文件', async () => {
    const dir = freshDir('query-range')
    await appendSamples(dir, 'k', [
      { t: at(0), v: 1 },
      { t: at(1), v: 2 },
      { t: at(2), v: 3 },
    ])
    expect(await querySamples(dir, 'k', at(1), at(2), 0)).toEqual([
      { t: at(1), v: 2 },
      { t: at(2), v: 3 },
    ])
    expect(await querySamples(dir, 'k', at(5), at(6), 0)).toEqual([])
    expect(await querySamples(dir, 'no-such-key', at(0), at(2), 0)).toEqual([])
    expect(await querySamples(path.join(root, 'missing-dir'), 'k', at(0), at(2), 0)).toEqual([])
  })

  it('乱序写入的分片读出来按时间升序，损坏行跳过', async () => {
    const dir = freshDir('query-sort')
    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, 'k.20261010.jsonl'),
      `{"t":${at(0,13)},"v":1}\nnot-json\n{"t":${at(0,15)},"v":3}\n{"t":${at(0,14)},"v":2}\n{"v":9}\n`,
      'utf8',
    )
    expect(await querySamples(dir, 'k', at(0) - HOUR, at(0) + DAY, 0)).toEqual([
      { t: at(0, 13), v: 1 },
      { t: at(0, 14), v: 2 },
      { t: at(0, 15), v: 3 },
    ])
  })

  it('超过 maxPoints 时均匀抽稀并保留首尾', async () => {
    const dir = freshDir('query-thin')
    const points = Array.from({ length: 10 }, (_, i) => ({ t: at(0, 0) + i * HOUR, v: i }))
    await appendSamples(dir, 'k', points)

    const full = await querySamples(dir, 'k', at(0, 0), at(1), 0)
    expect(full.length).toBe(10)
    const sampled = await querySamples(dir, 'k', at(0, 0), at(1), 4)
    expect(sampled.length).toBe(4)
    expect(sampled[0]).toEqual(full[0])
    expect(sampled[sampled.length - 1]).toEqual(full[full.length - 1])
    expect(await querySamples(dir, 'k', at(0, 0), at(1), 1)).toEqual([full[full.length - 1]])
  })

  it('窗口聚合按 epoch 对齐，min/avg/max 三种算法各自正确', async () => {
    const dir = freshDir('query-agg')
    const base = Math.floor(at(0) / HOUR) * HOUR
    await appendSamples(dir, 'k', [
      { t: base, v: 5 },
      { t: base + 10 * 60_000, v: 1 },
      { t: base + 50 * 60_000, v: 3 },
      { t: base + HOUR + 5 * 60_000, v: 9 },
    ])

    const t = (from: number, to: number, agg: string, windowMs: number) =>
      querySamples(dir, 'k', from, to, 0, { agg, windowMs })
    const range = [base - HOUR, base + 3 * HOUR]

    expect(await t(range[0], range[1], 'min', HOUR)).toEqual([
      { t: base, v: 1 },
      { t: base + HOUR, v: 9 },
    ])
    expect(await t(range[0], range[1], 'max', HOUR)).toEqual([
      { t: base, v: 5 },
      { t: base + HOUR, v: 9 },
    ])
    expect(await t(range[0], range[1], 'avg', HOUR)).toEqual([
      { t: base, v: 3 },
      { t: base + HOUR, v: 9 },
    ])
    // 聚合结果的 t 是窗口起点，跨页查询可比
    expect((await t(range[0], range[1], 'avg', HOUR))[0].t % HOUR).toBe(0)
  })

  it('非法聚合参数回落成普通查询，不报错也不返回半截聚合', async () => {
    const dir = freshDir('query-agg-fallback')
    await appendSamples(dir, 'k', [{ t: at(0), v: 1 }, { t: at(0) + 10 * 60_000, v: 2 }])
    const plain = await querySamples(dir, 'k', at(0) - HOUR, at(1), 0)
    expect(plain.length).toBe(2)

    // agg 不认识 / 窗口小于 1 秒 / 窗口超过 24 小时 → 三种情况都给原始点
    expect(await querySamples(dir, 'k', at(0) - HOUR, at(1), 0, { agg: 'sum', windowMs: HOUR })).toEqual(plain)
    expect(await querySamples(dir, 'k', at(0) - HOUR, at(1), 0, { agg: 'avg', windowMs: 999 })).toEqual(plain)
    expect(await querySamples(dir, 'k', at(0) - HOUR, at(1), 0, { agg: 'avg', windowMs: 25 * HOUR })).toEqual(plain)
    expect(await querySamples(dir, 'k', at(0) - HOUR, at(1), 0, {})).toEqual(plain)
  })
})

describe('cleanupExpiredShards', () => {
  it('保留期外按天删除，边界当天保留', async () => {
    const histRoot = path.join(root, 'cleanup')
    const alice = historyDirFor(histRoot, 'u/alice/')
    const now = Date.now()
    await appendSamples(alice, 'k', [
      { t: now - 10 * DAY, v: 1 },
      { t: now - 5 * DAY, v: 2 },
      { t: now, v: 3 },
    ])
    expect((await readdir(alice)).length).toBe(3)

    expect(await cleanupExpiredShards(histRoot, 5)).toBe(1)
    const kept = await readdir(alice)
    expect(kept.length).toBe(2)
    expect(kept.map(f => f.match(/(\d{8})/)[1]).sort()).toEqual(
      [dayString(now - 5 * DAY), dayString(now)].sort(),
    )
  })

  it('清理遍历所有用户目录，非目录项与空根目录安全', async () => {
    const histRoot = path.join(root, 'cleanup-all')
    const now = Date.now()
    await appendSamples(historyDirFor(histRoot, 'u/a/'), 'k', [{ t: now - 30 * DAY, v: 1 }])
    await appendSamples(historyDirFor(histRoot, 'u/b/'), 'k', [{ t: now - 30 * DAY, v: 2 }])
    // 根目录下的散落文件不该被当成用户目录
    await writeFile(path.join(histRoot, 'stray.jsonl'), '', 'utf8')

    expect(await cleanupExpiredShards(histRoot, 7)).toBe(2)
    expect(await readdir(path.join(histRoot, 'u/a'))).toEqual([])
    expect(await cleanupExpiredShards(path.join(root, 'no-such-root'), 7)).toBe(0)
  })

  it('保留期非正数表示不清理', async () => {
    const histRoot = path.join(root, 'cleanup-off')
    await appendSamples(historyDirFor(histRoot, 'u/a/'), 'k', [{ t: Date.now() - 400 * DAY, v: 1 }])
    expect(await cleanupExpiredShards(histRoot, 0)).toBe(0)
    expect(await cleanupExpiredShards(histRoot, -1)).toBe(0)
    expect(await readdir(path.join(histRoot, 'u/a'))).toHaveLength(1)
  })
})
