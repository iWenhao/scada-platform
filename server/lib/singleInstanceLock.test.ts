// @vitest-environment node
/**
 * 单实例锁。
 * 钉住两件事：判活规则不能把活实例顶掉（那等于两个实例同时写盘），
 * 也不能让残留锁永久挡住启动（那等于安全检查自己制造一次起不来的故障）。
 */
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  acquireInstanceLock,
  describeHolder,
  isHolderAlive,
  lockFilePath,
  STALE_AFTER_MS,
} from './singleInstanceLock.mjs'

/** 固定时钟：陈旧判定全靠时间差，用 Date.now() 会让断言依赖真实耗时 */
const NOW = 1_800_000_000_000
const now = () => NOW

let root = ''
/** 每个用例一个独立数据目录：抢锁是有状态的，共用目录会让上一个用例的残留锁挡住下一个 */
let dirSeq = 0
function nextDir() {
  return path.join(root, `d${++dirSeq}`)
}

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'scada-lock-'))
})
afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

/** 造一个已存在的持锁记录（绕过抢锁，直接摆磁盘上的状态） */
async function plantHolder(at: string, overrides: Record<string, unknown> = {}) {
  const holder = {
    owner: 'planted-owner',
    pid: process.pid,
    hostname: os.hostname(),
    createdAt: NOW - 10_000,
    updatedAt: NOW - 1_000,
    ...overrides,
  }
  await mkdir(at, { recursive: true })
  await writeFile(lockFilePath(at), JSON.stringify(holder), 'utf8')
  return holder
}

/** 拿到一个确实已退出的 pid：起一个立刻结束的进程并等它退出 */
async function findDeadPid() {
  const child = spawn(process.execPath, ['-e', ''], { stdio: 'ignore' })
  const pid = await new Promise<number>((resolve) => child.once('exit', () => resolve(child.pid!)))
  return pid
}

describe('acquireInstanceLock', () => {
  it('首次抢锁成功并把自身信息写进锁文件', async () => {
    const at = nextDir()
    const lock = await acquireInstanceLock(at, { now })
    expect(lock.acquired).toBe(true)
    const raw = JSON.parse(await readFile(lockFilePath(at), 'utf8'))
    expect(raw.pid).toBe(process.pid)
    expect(raw.hostname).toBe(os.hostname())
    expect(raw.createdAt).toBe(NOW)
    expect(typeof raw.owner).toBe('string')
    await lock.release()
  })

  it('活实例持锁时拒绝，并带回报错所需的持锁方', async () => {
    const at = nextDir()
    const planted = await plantHolder(at)
    const lock = await acquireInstanceLock(at, { now })
    expect(lock).toMatchObject({ acquired: false, reason: 'held' })
    expect(lock.holder).toEqual(planted)
    // 拒绝方不许动别人的锁文件
    expect(JSON.parse(await readFile(lockFilePath(at), 'utf8')).owner).toBe('planted-owner')
  })

  it('同机 pid 已退出 → 立刻接管，不等心跳陈旧', async () => {
    const at = nextDir()
    await plantHolder(at, { pid: await findDeadPid() })
    const lock = await acquireInstanceLock(at, { now })
    expect(lock.acquired).toBe(true)
    expect(JSON.parse(await readFile(lockFilePath(at), 'utf8')).owner).not.toBe('planted-owner')
    await lock.release()
  })

  it('跨主机只认心跳：新鲜即拒绝，超期即接管', async () => {
    const at = nextDir()
    await plantHolder(at, { hostname: 'some-other-host' })
    expect((await acquireInstanceLock(at, { now })).acquired).toBe(false)

    await plantHolder(at, { hostname: 'some-other-host', updatedAt: NOW - STALE_AFTER_MS - 1 })
    const lock = await acquireInstanceLock(at, { now })
    expect(lock.acquired).toBe(true)
    await lock.release()
  })

  it('同机但心跳长期没续期也判可接管（防 pid 复用把启动永久挡死）', async () => {
    // pid 是 process.pid（活着），但心跳超期 → 认定它属于一个早已挂死的实例
    const at = nextDir()
    await plantHolder(at, { updatedAt: NOW - STALE_AFTER_MS - 1 })
    const lock = await acquireInstanceLock(at, { now })
    expect(lock.acquired).toBe(true)
    await lock.release()
  })

  it('锁文件损坏（半截 JSON）视为可接管', async () => {
    const at = nextDir()
    await mkdir(at, { recursive: true })
    await writeFile(lockFilePath(at), '{"owner":"ab', 'utf8')
    const lock = await acquireInstanceLock(at, { now })
    expect(lock.acquired).toBe(true)
    await lock.release()
  })

  it('缺 updatedAt 的记录按陈旧处理', async () => {
    const at = nextDir()
    await plantHolder(at, { updatedAt: undefined })
    const lock = await acquireInstanceLock(at, { now })
    expect(lock.acquired).toBe(true)
    await lock.release()
  })

  it('数据目录不存在时先建出来再抢锁', async () => {
    const at = nextDir()
    const lock = await acquireInstanceLock(at, { now })
    expect(lock.acquired).toBe(true)
    expect(await readFile(lockFilePath(at), 'utf8')).toContain(String(process.pid))
    await lock.release()
  })

  it('两个实例在同一目录上同时启动，只有一个拿到锁', async () => {
    // 同一进程内并发两次抢锁：'wx' 独占语义保证后来者只能走 EEXIST 分支
    const at = nextDir()
    const [a, b] = await Promise.all([acquireInstanceLock(at, { now }), acquireInstanceLock(at, { now })])
    expect([a.acquired, b.acquired].filter(Boolean)).toHaveLength(1)
    const winner = a.acquired ? a : b
    await winner.release()
  })
})

describe('release', () => {
  it('删掉自己的锁，重复调用不抛', async () => {
    const at = nextDir()
    const lock = await acquireInstanceLock(at, { now })
    expect(await lock.release()).toBe(true)
    await expect(readFile(lockFilePath(at), 'utf8')).rejects.toThrow()
    // 第二次：文件已不在，幂等而不是 ENOENT
    expect(await lock.release()).toBe(true)
  })

  it('锁已被接管时不放行、也不删对方的锁', async () => {
    const at = nextDir()
    const lock = await acquireInstanceLock(at, { now })
    const takeover = await plantHolder(at)
    expect(await lock.release()).toBe(false)
    expect(JSON.parse(await readFile(lockFilePath(at), 'utf8')).owner).toBe(takeover.owner)
  })
})

describe('isHolderAlive', () => {
  const base = { owner: 'x', hostname: os.hostname(), pid: process.pid, createdAt: NOW - 9_000, updatedAt: NOW - 1_000 }

  it('同机 + pid 存活 + 心跳新鲜 → 活着', () => {
    expect(isHolderAlive(base, NOW)).toBe(true)
  })

  it('同机 + pid 已退出 → 死了', async () => {
    expect(isHolderAlive({ ...base, pid: await findDeadPid() }, NOW)).toBe(false)
  })

  it('跨主机 + 心跳新鲜 → 活着（验不了 pid）', () => {
    expect(isHolderAlive({ ...base, hostname: 'other' }, NOW)).toBe(true)
  })

  it('心跳超期一律判死，与主机与 pid 无关', () => {
    expect(isHolderAlive({ ...base, updatedAt: NOW - STALE_AFTER_MS - 1 }, NOW)).toBe(false)
    expect(isHolderAlive({ ...base, hostname: 'other', updatedAt: NOW - STALE_AFTER_MS - 1 }, NOW)).toBe(false)
  })

  it('缺文件/半截 JSON/字段非法 → 判死（可接管）', () => {
    expect(isHolderAlive(null, NOW)).toBe(false)
    expect(isHolderAlive({ ...base, updatedAt: 0 }, NOW)).toBe(false)
    expect(isHolderAlive({ ...base, updatedAt: 'abc' }, NOW)).toBe(false)
    expect(isHolderAlive({ ...base, pid: 'abc' }, NOW)).toBe(false)
  })
})

describe('describeHolder', () => {
  it('给启动被拒时的日志用人话：pid、主机、锁龄与心跳间隔', () => {
    const text = describeHolder({ pid: 4242, hostname: os.hostname(), createdAt: NOW - 9_000, updatedAt: NOW - 2_000 }, NOW)
    expect(text).toContain('pid 4242')
    expect(text).toContain('（本机）')
    expect(text).toContain('9 秒前')
    expect(text).toContain('2 秒前')
  })

  it('锁文件读不出来时也不抛', () => {
    expect(describeHolder(null, NOW)).toContain('无法解析')
  })
})
