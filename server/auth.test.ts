// @vitest-environment node
/**
 * 账号、会话与登录限流。
 * 这里的断言都是安全属性：口令不落地成明文、会话有明确期限、爆破有上限、
 * 最后一个管理员不会被删掉——四条都是「出事就没法登录」的那类，值得钉住。
 */
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ROLE_RANK, createAuthStore, roleAtLeast } from './auth.mjs'

const SEED = 'Seed-Pass-2026'
const SESSION_TTL_MS = 12 * 3600 * 1000
const LOCK_MS = 5 * 60 * 1000
/** 会话与口令改动的基准时间；用真实时刻，避免和 Date.now() 的默认实现纠缠 */
const BASE = 1_800_000_000_000

let dataDir = ''
let storeSeq = 0

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'scada-auth-'))
  process.env.SEED_PASSWORD = SEED
  // 种子账号初始化会往控制台打 4 行口令提示，测试里属于噪音
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterAll(async () => {
  vi.restoreAllMocks()
  delete process.env.SEED_PASSWORD
  await rm(dataDir, { recursive: true, force: true })
})

afterEach(() => {
  vi.useRealTimers()
})

/** 只冻结时钟：fs/timer 走真实实现，避免假时钟把异步 I/O 一起接管 */
function freezeClock(now = BASE) {
  vi.useFakeTimers({ toFake: ['Date'], now })
}

/** 每个用例一个独立数据目录，登录限流计数与账号表都互不干扰 */
async function newStore() {
  const dir = path.join(dataDir, `s${++storeSeq}`)
  const auth = createAuthStore(dir)
  await auth.init()
  return { auth, dir }
}

/** 连续失败 n 次（口令故意错），用于把限流计数打满 */
async function failLogins(auth: any, username: string, times: number, clientKey: string) {
  for (let i = 0; i < times; i++) {
    expect(await auth.login(username, 'wrong-password', clientKey)).toBeNull()
  }
}

describe('角色等级', () => {
  it('严格按 viewer < operator < engineer < admin 判定', () => {
    expect(roleAtLeast('admin', 'viewer')).toBe(true)
    expect(roleAtLeast('engineer', 'engineer')).toBe(true)
    expect(roleAtLeast('operator', 'engineer')).toBe(false)
    expect(roleAtLeast('viewer', 'admin')).toBe(false)
    expect(Object.values(ROLE_RANK)).toEqual([0, 1, 2, 3])
  })

  it('未知角色既不满足任何要求，也不会被未知门槛放行', () => {
    expect(roleAtLeast('root', 'viewer')).toBe(false)
    expect(roleAtLeast('admin', 'superuser')).toBe(false)
  })
})

describe('种子账号与口令存储', () => {
  it('首次运行建出四个种子账号，对外列表不含口令字段', async () => {
    const { auth } = await newStore()
    expect(auth.listUsers().map(u => u.username)).toEqual(['admin', 'engineer', 'operator', 'viewer'])
    expect(auth.listUsers().map(u => u.role)).toEqual(['admin', 'engineer', 'operator', 'viewer'])
    for (const u of auth.listUsers()) {
      expect(u).not.toHaveProperty('passwordHash')
      expect(u).not.toHaveProperty('salt')
    }
  })

  it('_users.json 里只有 scrypt 哈希，没有明文口令', async () => {
    const { auth, dir } = await newStore()
    await auth.login('admin', SEED, '1.1.1.1')
    const raw = await readFile(path.join(dir, '_users.json'), 'utf8')
    expect(raw).not.toContain(SEED)
    // 存储格式固定为 salt:hash，两段十六进制
    expect(JSON.parse(raw)[0].passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/)
  })

  it('同一口令的不同账号盐值不同，密文也不相同', async () => {
    const { auth, dir } = await newStore()
    await auth.createUser({ username: 'same-pw-1', displayName: '', role: 'viewer', password: SEED })
    await auth.createUser({ username: 'same-pw-2', displayName: '', role: 'viewer', password: SEED })
    const stored = JSON.parse(await readFile(path.join(dir, '_users.json'), 'utf8'))
    const [a, b] = stored.filter(u => u.username.startsWith('same-pw-'))
    expect(a.passwordHash.split(':')[0]).not.toBe(b.passwordHash.split(':')[0])
    expect(a.passwordHash).not.toBe(b.passwordHash)
    // 盐不同但都验得过同一口令
    expect(await auth.login('same-pw-1', SEED, '10.0.0.9')).not.toBeNull()
    expect(await auth.login('same-pw-2', SEED, '10.0.1.0')).not.toBeNull()
  })
})

describe('登录与令牌', () => {
  it('口令正确签发会话，resolveToken 返回脱敏用户', async () => {
    freezeClock()
    const { auth } = await newStore()
    const session = await auth.login('admin', SEED, '10.0.0.1')
    expect(session.token).toMatch(/^[0-9a-f]{48}$/)
    expect(session.expiresAt).toBe(BASE + SESSION_TTL_MS)
    expect(session.user).toEqual({
      id: 'usr_seed_0',
      username: 'admin',
      displayName: '管理员',
      role: 'admin',
      createdAt: BASE,
    })
    expect(auth.resolveToken(session.token).username).toBe('admin')
  })

  it('口令错与用户不存在返回同样的 null，不给枚举账号留线索', async () => {
    const { auth } = await newStore()
    expect(await auth.login('admin', 'nope', '10.0.0.2')).toBeNull()
    expect(await auth.login('ghost', SEED, '10.0.0.2')).toBeNull()
    expect(auth.resolveToken('')).toBeNull()
    expect(auth.resolveToken('deadbeef')).toBeNull()
  })

  it('注销后令牌立即失效；注销未知令牌返回 false', async () => {
    const { auth } = await newStore()
    const { token } = await auth.login('engineer', SEED, '10.0.0.3')
    expect(await auth.logout(token)).toBe(true)
    expect(auth.resolveToken(token)).toBeNull()
    expect(await auth.logout('')).toBe(false)
    expect(await auth.logout(token)).toBe(false)
  })

  it('超过 12 小时的会话被拒绝', async () => {
    freezeClock()
    const { auth } = await newStore()
    const { token } = await auth.login('operator', SEED, '10.0.0.4')
    expect(auth.resolveToken(token)).not.toBeNull()
    vi.setSystemTime(BASE + SESSION_TTL_MS - 1)
    expect(auth.resolveToken(token)).not.toBeNull()
    vi.setSystemTime(BASE + SESSION_TTL_MS + 1)
    expect(auth.resolveToken(token)).toBeNull()
  })

  it('账号被删除后，该账号的全部会话同时失效', async () => {
    const { auth } = await newStore()
    const created = await auth.createUser({ username: 'temp', displayName: '', role: 'engineer', password: 'pass123' })
    const { token } = await auth.login('temp', 'pass123', '10.0.0.5')
    expect(await auth.removeUser(created.user.id)).toEqual({ ok: true })
    expect(auth.resolveToken(token)).toBeNull()
  })
})

describe('会话落盘与恢复', () => {
  /** 磁盘只认摘要，测试手造会话文件时按同一算法写 */
  const digest = (token: string) => createHash('sha256').update(token).digest('hex')

  it('进程重启后未过期会话仍可用', async () => {
    freezeClock()
    const { auth, dir } = await newStore()
    const { token } = await auth.login('admin', SEED, '10.0.0.6')

    const restored = createAuthStore(dir)
    await restored.init()
    expect(restored.resolveToken(token).username).toBe('admin')
  })

  it('_sessions.json 只写令牌摘要，明文令牌不落盘', async () => {
    freezeClock()
    const { auth, dir } = await newStore()
    const { token } = await auth.login('admin', SEED, '10.0.0.20')

    const raw = await readFile(path.join(dir, '_sessions.json'), 'utf8')
    expect(raw).not.toContain(token)
    const [entry] = JSON.parse(raw)
    expect(entry.tokenHash).toBe(digest(token))
    expect(entry.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(entry).not.toHaveProperty('token')
    expect(entry.userId).toBe('usr_seed_0')
    // 注销走的也是摘要定位，明文令牌在服务端各处都不必出现
    expect(await auth.logout(token)).toBe(true)
    expect(await readFile(path.join(dir, '_sessions.json'), 'utf8')).toBe('[]')
  })

  it('重启时丢弃已过期会话，损坏的会话文件按空处理', async () => {
    freezeClock()
    const { dir } = await newStore()
    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, '_sessions.json'),
      JSON.stringify([
        { tokenHash: digest('live'), userId: 'usr_seed_0', expiresAt: BASE + SESSION_TTL_MS },
        { tokenHash: digest('dead'), userId: 'usr_seed_0', expiresAt: BASE - 1 },
      ]),
      'utf8',
    )
    const auth = createAuthStore(dir)
    await auth.init()
    vi.setSystemTime(BASE + 1000)
    expect(auth.resolveToken('live').id).toBe('usr_seed_0')
    expect(auth.resolveToken('dead')).toBeNull()

    await writeFile(path.join(dir, '_sessions.json'), '{ broken', 'utf8')
    const broken = createAuthStore(dir)
    await broken.init()
    expect(broken.resolveToken('live')).toBeNull()
  })

  it('旧版明文令牌不迁移，且升级时当场把文件改写成摘要格式', async () => {
    freezeClock()
    const { dir } = await newStore()
    await writeFile(
      path.join(dir, '_sessions.json'),
      JSON.stringify([{ token: 'legacy-plain-token', userId: 'usr_seed_0', expiresAt: BASE + SESSION_TTL_MS }]),
      'utf8',
    )
    const auth = createAuthStore(dir)
    await auth.init()

    // 已明文落过盘的令牌一律作废
    expect(auth.resolveToken('legacy-plain-token')).toBeNull()
    // 不等下一次登录触发落盘：init 就把明文从磁盘上抹掉
    const raw = await readFile(path.join(dir, '_sessions.json'), 'utf8')
    expect(raw).not.toContain('legacy-plain-token')
    expect(JSON.parse(raw)).toEqual([])
  })

  it('过期会话在被判过期的那一刻就从 Map 删除（键是摘要，删错键会一直残留）', async () => {
    freezeClock()
    const { auth, dir } = await newStore()
    const { token } = await auth.login('viewer', SEED, '10.0.0.21')
    vi.setSystemTime(BASE + SESSION_TTL_MS + 1)
    expect(auth.resolveToken(token)).toBeNull()
    // 条目已被 resolveToken 摘掉，所以注销报 false；若删的是原始令牌这种错键，这里会是 true
    expect(await auth.logout(token)).toBe(false)

    // 落盘只反映仍存活的会话：过期项不会跟着下一次登录被写回磁盘
    const again = await auth.login('viewer', SEED, '10.0.0.22')
    const list = JSON.parse(await readFile(path.join(dir, '_sessions.json'), 'utf8'))
    expect(list).toHaveLength(1)
    expect(list[0].tokenHash).toBe(digest(again.token))
  })
})

describe('登录失败限流', () => {
  it('同一用户名连续失败 5 次后，即使口令正确也拒绝；锁定期过后恢复', async () => {
    freezeClock()
    const { auth } = await newStore()
    await failLogins(auth, 'admin', 4, '10.0.0.7')
    expect(await auth.login('admin', SEED, '10.0.0.7')).not.toBeNull()

    const { token } = await auth.login('admin', SEED, '10.0.0.7')
    await failLogins(auth, 'admin', 5, '10.0.0.8')
    expect(await auth.login('admin', SEED, '10.0.0.9')).toBeNull()

    vi.setSystemTime(BASE + LOCK_MS - 1)
    expect(await auth.login('admin', SEED, '10.0.0.9')).toBeNull()
    vi.setSystemTime(BASE + LOCK_MS + 1)
    // 锁定过期后放行；此前签发的会话不受限流影响
    expect(await auth.login('admin', SEED, '10.0.0.9')).not.toBeNull()
    expect(auth.resolveToken(token).username).toBe('admin')
  })

  it('按来源也限流：同一 IP 撞 5 个不同账号后整体拒绝', async () => {
    freezeClock()
    const { auth } = await newStore()
    const names = ['viewer', 'operator', 'engineer', 'nope-1', 'nope-2']
    await failLogins(auth, names[0], 1, '172.16.0.1')
    for (const n of names.slice(1)) {
      expect(await auth.login(n, 'wrong-password', '172.16.0.1')).toBeNull()
    }
    expect(await auth.login('admin', SEED, '172.16.0.1')).toBeNull()
    // 换一个来源不受影响
    expect(await auth.login('admin', SEED, '172.16.0.2')).not.toBeNull()
  })
})

describe('账号管理', () => {
  it('新建账号校验口令长度、角色合法与用户名不重复', async () => {
    const { auth } = await newStore()
    expect(await auth.createUser({ username: 'x', displayName: '', role: 'viewer', password: '123' }))
      .toEqual({ error: 'username/password invalid' })
    expect(await auth.createUser({ username: 'x', displayName: '', role: 'superuser', password: 'pass123' }))
      .toEqual({ error: 'invalid role' })
    expect(await auth.createUser({ username: 'admin', displayName: '', role: 'viewer', password: 'pass123' }))
      .toEqual({ error: 'username exists' })
  })

  it('用户名前后空格不算新账号，避免和已有账号重名', async () => {
    const { auth } = await newStore()
    expect(await auth.createUser({ username: '  admin  ', displayName: '', role: 'viewer', password: 'pass123' }))
      .toEqual({ error: 'username exists' })
    expect(await auth.createUser({ username: '   ', displayName: '', role: 'viewer', password: 'pass123' }))
      .toEqual({ error: 'username/password invalid' })
  })

  it('不允许降级或删除最后一名管理员，补上第二名之后才放行', async () => {
    const { auth } = await newStore()
    const admin = auth.findByUsername('admin')
    expect(await auth.updateUser(admin.id, { role: 'engineer' })).toEqual({ error: 'cannot demote last admin' })
    expect(await auth.removeUser(admin.id)).toEqual({ error: 'cannot remove last admin' })
    expect(auth.getUser(admin.id).role).toBe('admin')

    // 补两名管理员：降级与删除都还有余地
    const second = await auth.createUser({ username: 'admin2', displayName: '', role: 'admin', password: 'pass123' })
    await auth.createUser({ username: 'admin3', displayName: '', role: 'admin', password: 'pass123' })
    expect(await auth.updateUser(admin.id, { role: 'engineer' })).toMatchObject({ user: { role: 'engineer' } })
    expect(await auth.removeUser(second.user.id)).toEqual({ ok: true })
    // 此时只剩 admin3，回到「最后一名」状态
    expect(await auth.removeUser(auth.findByUsername('admin3').id)).toEqual({ error: 'cannot remove last admin' })
  })

  it('管理员重置口令后旧口令立即失效，过短口令拒绝', async () => {
    const { auth } = await newStore()
    const u = auth.findByUsername('viewer')
    expect(await auth.updateUser(u.id, { password: '123' })).toEqual({ error: 'password too short' })
    expect(await auth.updateUser(u.id, { password: 'brand-new' })).toMatchObject({ user: { username: 'viewer' } })
    expect(await auth.login('viewer', SEED, '10.0.1.1')).toBeNull()
    expect(await auth.login('viewer', 'brand-new', '10.0.1.2')).not.toBeNull()
  })

  it('自助改口令需验证旧口令，新用户同样走这套校验', async () => {
    const { auth } = await newStore()
    const created = await auth.createUser({ username: 'self', displayName: '自助', role: 'operator', password: 'pass123' })
    expect(await auth.changeOwnPassword(created.user.id, 'wrong', 'other123'))
      .toEqual({ error: 'old password incorrect' })
    expect(await auth.changeOwnPassword(created.user.id, 'pass123', '1'))
      .toEqual({ error: 'password too short' })
    expect(await auth.changeOwnPassword('usr_missing', 'pass123', 'other123'))
      .toEqual({ error: 'not found' })
    expect(await auth.changeOwnPassword(created.user.id, 'pass123', 'other123')).toEqual({ ok: true })
    expect(await auth.login('self', 'pass123', '10.0.1.3')).toBeNull()
    expect(await auth.login('self', 'other123', '10.0.1.4')).not.toBeNull()
  })

  it('账号表落盘：重启后用户名、角色与口令都还在', async () => {
    const { auth, dir } = await newStore()
    await auth.createUser({ username: 'persist', displayName: '持久', role: 'engineer', password: 'pass123' })

    const restored = createAuthStore(dir)
    await restored.init()
    expect(restored.listUsers().map(u => u.username)).toContain('persist')
    expect(restored.findByUsername('persist').role).toBe('engineer')
    expect(await restored.login('persist', 'pass123', '10.0.1.5')).not.toBeNull()
  })
})
