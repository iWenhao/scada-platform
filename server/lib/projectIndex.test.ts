// @vitest-environment node
/**
 * 工程列表索引：校验它把「每工程 3 次 GET 全量 JSON」收敛成一次摘要，
 * 且只在服务端读盘抽字段、对坏文件与命名空间隔离都稳。
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { writeValue } from './kv.mjs'
import { buildProjectIndex, PROJECT_PREFIX, PUBLISHED_PREFIX, THUMB_PREFIX } from './projectIndex.mjs'

let dataDir = ''
const scope = 'u/indexer/'

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'scada-index-'))
})
afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true })
})

const put = (key: string, value: unknown) =>
  writeValue(dataDir, key, scope, typeof value === 'string' ? value : JSON.stringify(value))

describe('buildProjectIndex', () => {
  it('抽取 timestamp / pageCount / publishedAt，按修改时间倒序', async () => {
    const s = 'u/sort/'
    await writeValue(dataDir, PROJECT_PREFIX + '旧', s, JSON.stringify({ timestamp: 100, pages: [1, 2] }))
    await writeValue(dataDir, PROJECT_PREFIX + '新', s, JSON.stringify({ timestamp: 900, pages: [1] }))
    await writeValue(dataDir, PUBLISHED_PREFIX + '新', s, JSON.stringify({ publishedAt: 950 }))

    const rows = await buildProjectIndex(dataDir, s)
    expect(rows.map(r => r.name)).toEqual(['新', '旧'])
    expect(rows[0]).toMatchObject({ name: '新', timestamp: 900, pageCount: 1, publishedAt: 950 })
    expect(rows[1]).toMatchObject({ name: '旧', timestamp: 100, pageCount: 2, publishedAt: null })
  })

  it('publishedAt 缺失时回落发布快照的工作副本时间戳', async () => {
    const s = 'u/pub-fallback/'
    await writeValue(dataDir, PROJECT_PREFIX + 'A', s, JSON.stringify({ timestamp: 10 }))
    await writeValue(dataDir, PUBLISHED_PREFIX + 'A', s, JSON.stringify({ timestamp: 777 }))
    const [a] = await buildProjectIndex(dataDir, s)
    expect(a.publishedAt).toBe(777)
  })

  it('hasThumbnail 只看键是否存在，不读内容', async () => {
    const s = 'u/thumb/'
    await writeValue(dataDir, PROJECT_PREFIX + '有图', s, JSON.stringify({ timestamp: 1 }))
    await writeValue(dataDir, THUMB_PREFIX + '有图', s, 'data:image/jpeg;base64,....')
    await writeValue(dataDir, PROJECT_PREFIX + '无图', s, JSON.stringify({ timestamp: 2 }))
    const map = Object.fromEntries(
      (await buildProjectIndex(dataDir, s)).map(r => [r.name, r.hasThumbnail]),
    )
    expect(map).toEqual({ 有图: true, 无图: false })
  })

  it('坏 JSON 与非对象值按未知处理，不让整张列表抛错', async () => {
    const s = 'u/bad/'
    await writeValue(dataDir, PROJECT_PREFIX + '坏', s, '{ not json')
    await writeValue(dataDir, PROJECT_PREFIX + '数组', s, '[1,2,3]')
    await writeValue(dataDir, PROJECT_PREFIX + '好', s, JSON.stringify({ timestamp: 5, pages: [1] }))
    const rows = await buildProjectIndex(dataDir, s)
    const bad = rows.find(r => r.name === '坏')!
    expect(bad).toMatchObject({ timestamp: 0, pageCount: 1, publishedAt: null })
    expect(rows.find(r => r.name === '数组')!.pageCount).toBe(1)
    expect(rows.find(r => r.name === '好')!.timestamp).toBe(5)
  })

  it('只列工作副本键：草稿 / 孤立发布快照 / 缩略图不单独成项', async () => {
    const s = 'u/scope/'
    await writeValue(dataDir, PROJECT_PREFIX + 'P', s, JSON.stringify({ timestamp: 1 }))
    await writeValue(dataDir, 'scada_draft_P', s, '{}')
    await writeValue(dataDir, PUBLISHED_PREFIX + '已删工作副本', s, '{"publishedAt":9}')
    await writeValue(dataDir, THUMB_PREFIX + '无主', s, 'x')
    const names = (await buildProjectIndex(dataDir, s)).map(r => r.name)
    expect(names).toEqual(['P'])
  })

  it('命名空间隔离：a 的索引看不到 b 的工程', async () => {
    await writeValue(dataDir, PROJECT_PREFIX + 'A', 'u/alice/', JSON.stringify({ timestamp: 1 }))
    await writeValue(dataDir, PROJECT_PREFIX + 'B', 'u/bob/', JSON.stringify({ timestamp: 1 }))
    expect((await buildProjectIndex(dataDir, 'u/alice/')).map(r => r.name)).toEqual(['A'])
    expect(await buildProjectIndex(dataDir, 'u/empty/')).toEqual([])
  })
})
