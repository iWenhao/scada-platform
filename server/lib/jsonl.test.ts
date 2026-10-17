// @vitest-environment node
/**
 * JSONL 读写（审计日志与通知日志共用）。
 * 关键属性是「日志坏了不能把接口带崩」：读时容错、写时截断，两条都在这里钉住。
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { appendJsonl, readJsonl } from './jsonl.mjs'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'scada-jsonl-'))
})
afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

function fileFor(name: string) {
  return path.join(root, name, 'log.jsonl')
}

/** 直接造一个带内容的日志文件（跳过 appendJsonl，用于测读取端的容错） */
async function writeRaw(name: string, text: string) {
  const file = fileFor(name)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, text, 'utf8')
  return file
}

describe('readJsonl', () => {
  it('返回新→旧，limit 只截尾部（即最近的几条）', async () => {
    const file = fileFor('order')
    await appendJsonl(file, { n: 1 })
    await appendJsonl(file, { n: 2 })
    await appendJsonl(file, { n: 3 })
    expect(await readJsonl(file, 100)).toEqual([{ n: 3 }, { n: 2 }, { n: 1 }])
    expect(await readJsonl(file, 2)).toEqual([{ n: 3 }, { n: 2 }])
  })

  it('limit 非正数按 1 处理，空文件与不存在文件返回空数组', async () => {
    const file = fileFor('limit')
    await appendJsonl(file, { n: 1 })
    await appendJsonl(file, { n: 2 })
    expect(await readJsonl(file, 0)).toEqual([{ n: 2 }])
    expect(await readJsonl(file, -5)).toEqual([{ n: 2 }])
    expect(await readJsonl(path.join(root, 'missing', 'log.jsonl'), 10)).toEqual([])

    const empty = await writeRaw('empty', '\n\n  \n')
    expect(await readJsonl(empty, 10)).toEqual([])
  })

  it('单行损坏只跳过该行，且不影响最后一行没有换行符的情况', async () => {
    const file = await writeRaw('broken', '{"n":1}\n{ broken\n{"n":3}\n{"n":4}')
    expect(await readJsonl(file, 100)).toEqual([{ n: 4 }, { n: 3 }, { n: 1 }])
  })
})

describe('appendJsonl', () => {
  it('目录不存在时自动创建，追加后原内容仍在', async () => {
    const file = fileFor('nested/deeper')
    await appendJsonl(file, { a: 1 })
    await appendJsonl(file, { b: 2 })
    expect((await readFile(file, 'utf8')).split('\n').filter(Boolean)).toEqual([
      '{"a":1}',
      '{"b":2}',
    ])
  })

  it('cap 生效时截断到最近 cap 条，且不留半截行', async () => {
    const file = fileFor('cap')
    for (let i = 1; i <= 5; i++) await appendJsonl(file, { i }, { cap: 3 })
    expect(await readJsonl(file, 100)).toEqual([{ i: 5 }, { i: 4 }, { i: 3 }])
    const raw = await readFile(file, 'utf8')
    expect(raw.endsWith('\n')).toBe(true)
    expect(raw.split('\n').filter(Boolean).length).toBe(3)
  })

  it('cap 为 0（默认）时不截断；cap 大于条数时原样保留', async () => {
    const uncapped = fileFor('uncapped')
    for (let i = 0; i < 4; i++) await appendJsonl(uncapped, { i })
    expect((await readJsonl(uncapped, 100)).length).toBe(4)

    const loose = fileFor('loose-cap')
    await appendJsonl(loose, { i: 1 }, { cap: 10 })
    await appendJsonl(loose, { i: 2 }, { cap: 10 })
    expect((await readJsonl(loose, 100)).length).toBe(2)
  })

  it('条目里的中文与嵌套对象按 JSON 原样往返', async () => {
    const file = fileFor('payload')
    const entry = { user: '管理员', detail: { keys: ['项目:1', '泵'] }, at: 1_700_000_000_000 }
    await appendJsonl(file, entry)
    expect(await readJsonl(file, 1)).toEqual([entry])
  })
})
