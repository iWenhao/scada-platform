// @vitest-environment node
/**
 * 原子写的两条不变量：读者永远看到完整内容，同目标并发不会丢写。
 * 后者不是理论担忧——Windows 上两个 rename 替换同一目标，后到的拿 EPERM，
 * 而调用方（会话、审计、通知配置）普遍把落盘失败 catch 掉，丢的是一次无人知晓的写入。
 */
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { writeFileAtomic, withTransientRetry } from './atomicWrite.mjs'

let dir = ''

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'scada-atomic-'))
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

/** 目录里不应残留过程文件（临时文件以 . 开头、.tmp 结尾） */
async function leftovers() {
  const names = await readdir(dir)
  return names.filter((n) => n.startsWith('.') && n.endsWith('.tmp'))
}

describe('writeFileAtomic', () => {
  it('并发写同一目标：全部成功，落盘的是某一份完整内容而非拼接残片', async () => {
    const file = path.join(dir, 'race.json')
    await writeFile(file, 'INIT', 'utf8')
    const payloads = Array.from({ length: 20 }, (_, i) => JSON.stringify({ n: i, body: 'A'.repeat(8000) }))

    await Promise.all(payloads.map((p) => writeFileAtomic(file, p, 'utf8')))

    const parsed = JSON.parse(await readFile(file, 'utf8'))
    expect(payloads.map((p) => JSON.parse(p).body)).toContain(parsed.body)
    await expect(leftovers()).resolves.toEqual([])
  })

  it('同一路径连续覆盖，最后一次生效', async () => {
    const file = path.join(dir, 'seq.json')
    await writeFileAtomic(file, '{"v":1}', 'utf8')
    await writeFileAtomic(file, '{"v":2}', 'utf8')
    expect(JSON.parse(await readFile(file, 'utf8')).v).toBe(2)
    await expect(leftovers()).resolves.toEqual([])
  })

  it('一次写失败不卡死队列，也不留临时文件', async () => {
    const file = path.join(dir, 'recover.json')
    await writeFileAtomic(file, '{"v":0}', 'utf8')
    // 非法 data 让「写临时文件」这步直接抛错，模拟写盘失败
    await expect(writeFileAtomic(file, 123 as any)).rejects.toThrow()
    expect(JSON.parse(await readFile(file, 'utf8')).v).toBe(0)

    await writeFileAtomic(file, '{"v":1}', 'utf8')
    expect(JSON.parse(await readFile(file, 'utf8')).v).toBe(1)
    await expect(leftovers()).resolves.toEqual([])
  })

  it('不同目标并发写互不干扰', async () => {
    const files = Array.from({ length: 6 }, (_, i) => path.join(dir, `multi-${i}.json`))
    await Promise.all(files.map((f, i) => writeFileAtomic(f, JSON.stringify({ i }), 'utf8')))
    for (const [i, f] of files.entries()) {
      expect(JSON.parse(await readFile(f, 'utf8')).i).toBe(i)
    }
    await expect(leftovers()).resolves.toEqual([])
  })
})

describe('withTransientRetry', () => {
  /** 造一个只带 code 的 fs 错误，避免真的去抢文件句柄 */
  const fsError = (code: string) => Object.assign(new Error(`${code}: simulated`), { code })

  it('EPERM 与 EBUSY 都算瞬时占用，重试到成功为止', async () => {
    let calls = 0
    const value = await withTransientRetry(async () => {
      calls += 1
      if (calls < 3) throw fsError(calls === 1 ? 'EPERM' : 'EBUSY')
      return 'done'
    }, [1, 2, 4])

    expect(value).toBe('done')
    expect(calls).toBe(3)
  })

  it('非瞬时错误立刻抛出，一次都不重试', async () => {
    let calls = 0
    await expect(
      withTransientRetry(async () => {
        calls += 1
        throw fsError('EACCES')
      }, [1, 2]),
    ).rejects.toThrow(/EACCES/)
    expect(calls).toBe(1)
  })

  it('重试次数用完仍失败，抛出的是原始错误', async () => {
    let calls = 0
    await expect(
      withTransientRetry(async () => {
        calls += 1
        throw fsError('EPERM')
      }, [1, 2]),
    ).rejects.toMatchObject({ code: 'EPERM' })
    // 首次 + 两次重试
    expect(calls).toBe(3)
  })
})
