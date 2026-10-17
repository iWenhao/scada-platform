/**
 * 账号 / 会话 / 角色模块（零依赖）
 *
 * 职责：
 *   1. 用户档案持久化（DATA_DIR/_users.json，口令 scrypt 哈希 + 随机盐）
 *   2. 登录会话（内存 Map + 可选落盘 _sessions.json，TTL 12 小时）
 *   3. 角色等级校验（viewer < operator < engineer < admin）
 *
 * 安全约定：
 *   - 口令只存 `salt:hash`，永不回传前端
 *   - 校验使用 timingSafeEqual，降低时序侧信道
 *   - 不允许删除/降级「最后一名管理员」，避免锁死系统
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto'
import { writeFileAtomic } from './lib/atomicWrite.mjs'

/** 角色等级：数字越大权限越高（与前端 types/auth.ts 保持一致） */
export const ROLE_RANK = {
  viewer: 0,
  operator: 1,
  engineer: 2,
  admin: 3,
}

/**
 * 判断 role 是否达到 min 等级。
 * @param {string} role  当前角色
 * @param {string} min   要求的最低角色
 * @returns {boolean} 达到则为 true
 */
export function roleAtLeast(role, min) {
  return (ROLE_RANK[role] ?? -1) >= (ROLE_RANK[min] ?? 99)
}

/**
 * 口令哈希：scrypt(password, salt, 32) → "salt:hash_hex"
 * 存储格式固定两段，便于 verify 时拆开。
 */
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 32).toString('hex')
  return `${salt}:${hash}`
}

/**
 * 校验口令。使用常数时间比较，失败（格式错/长度不一致）一律 false。
 */
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  try {
    const calc = scryptSync(String(password), salt, 32)
    const expected = Buffer.from(hash, 'hex')
    return calc.length === expected.length && timingSafeEqual(calc, expected)
  } catch {
    return false
  }
}

/**
 * 裁剪用户对象：去掉 salt / passwordHash，供 API 返回。
 */
function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    createdAt: u.createdAt,
  }
}

/**
 * 创建账号存储。dataDir 下维护：
 *   _users.json     用户列表（含口令哈希）
 *   _sessions.json  会话 token 列表（进程重启后可恢复未过期会话）
 *
 * @param {string} dataDir 数据目录
 */
export function createAuthStore(dataDir) {
  const usersFile = path.join(dataDir, '_users.json')
  const sessionsFile = path.join(dataDir, '_sessions.json')

  /** @type {Map<string, { userId: string, expiresAt: number }>} token -> 会话 */
  const sessions = new Map()

  /** @type {Array<any>} 内存中的用户列表 */
  let users = []

  /** 会话有效期：12 小时 */
  const SESSION_TTL_MS = 12 * 3600 * 1000

  /**
   * 把用户列表写入 _users.json。
   * 走原子写：这个文件损坏等于全站无法登录，不能留下半截内容。
   */
  async function persistUsers() {
    await writeFileAtomic(usersFile, JSON.stringify(users, null, 2), 'utf8')
  }

  /**
   * 会话落盘（尽力而为）。
   * 失败不抛错：内存会话仍可用，只是进程重启后无法恢复登录态。
   */
  async function persistSessions() {
    try {
      await writeFileAtomic(
        sessionsFile,
        JSON.stringify([...sessions.entries()].map(([token, s]) => ({ token, ...s }))),
        'utf8',
      )
    } catch {
      // 会话落盘失败不阻断登录
    }
  }

  /** 剔除已过期会话，避免 Map 无限增长 */
  function pruneSessions() {
    const now = Date.now()
    for (const [token, s] of sessions) {
      if (s.expiresAt < now) sessions.delete(token)
    }
  }

  /**
   * 启动初始化：
   *   1. 读用户文件，损坏则视为空列表
   *   2. 首次运行写入种子账号（admin/engineer/operator/viewer）
   *   3. 恢复未过期会话
   */
  async function init() {
    await fs.mkdir(dataDir, { recursive: true })
    try {
      const raw = await fs.readFile(usersFile, 'utf8')
      users = JSON.parse(raw)
      if (!Array.isArray(users)) users = []
    } catch {
      users = []
    }

    // 种子账号：仅在用户表为空时写入，便于首次部署开箱可用。
    // 初始口令随机生成——写死 admin123 这类弱口令等于对外部署时留了默认凭据，
    //  scanners 和爆破脚本都认这套。需要固定口令时用 SEED_PASSWORD 显式指定。
    if (users.length === 0) {
      const seedPassword = (process.env.SEED_PASSWORD || '').trim() || randomBytes(9).toString('base64url')
      const seeds = [
        ['admin', '管理员', 'admin'],
        ['engineer', '工程师', 'engineer'],
        ['operator', '操作员', 'operator'],
        ['viewer', '观察员', 'viewer'],
      ]
      users = seeds.map(([username, displayName, role], i) => ({
        id: `usr_seed_${i}`,
        username,
        displayName,
        role,
        passwordHash: hashPassword(seedPassword),
        createdAt: Date.now(),
      }))
      await persistUsers()
      console.log('[scada-server] 已创建种子账号（首次运行，四个账号共用同一初始口令）')
      console.log(`[scada-server]   用户名: ${seeds.map(s => s[0]).join(' / ')}`)
      console.log(`[scada-server]   初始口令: ${seedPassword}`)
      console.log('[scada-server]   口令只以 scrypt 哈希落盘、不再回显，请登录后立即修改')
    }

    // 恢复会话文件（只认未过期的）
    try {
      const raw = await fs.readFile(sessionsFile, 'utf8')
      const list = JSON.parse(raw)
      if (Array.isArray(list)) {
        for (const s of list) {
          if (s?.token && s?.userId && s?.expiresAt > Date.now()) {
            sessions.set(s.token, { userId: s.userId, expiresAt: s.expiresAt })
          }
        }
      }
    } catch {
      // 无会话文件或损坏：忽略
    }
    pruneSessions()
  }

  /**
   * 登录失败限流。
   *
   * 登录接口不区分「用户名不存在」与「口令错误」，但不限次数的话仍可无限试。
   * 两个维度各记一份：按用户名（挡针对某账号的定向爆破）、按来源（挡同一来源撞不同账号），
   * 任一维度超限就拒绝。计数只存内存，重启即清零——对本服务的体量足够，
   * 也避免把失败记录写进数据目录。
   */
  const LOGIN_MAX_FAILS = 5
  const LOGIN_LOCK_MS = 5 * 60 * 1000
  const loginFails = new Map() // key -> { count, until }

  function loginLocked(keys) {
    const now = Date.now()
    for (const key of keys) {
      const rec = loginFails.get(key)
      if (rec && rec.until > now) return true
    }
    return false
  }

  function noteLoginFail(keys) {
    const now = Date.now()
    for (const key of keys) {
      const rec = loginFails.get(key)
      // 只在「曾经锁定且锁已过期」时清零，否则早期失败会永久压住该账号。
      // 注意 until=0 表示从未锁定，不能参与这个判断——否则每次失败都会把计数重置回 1，
      // 永远攒不到阈值，限流形同虚设。
      const count = rec && rec.until > 0 && rec.until <= now ? 0 : (rec?.count || 0)
      loginFails.set(key, {
        count: count + 1,
        until: count + 1 >= LOGIN_MAX_FAILS ? now + LOGIN_LOCK_MS : 0,
      })
    }
  }

  /**
   * 登录。成功签发随机 token；失败返回 null（不区分用户名/口令错误，避免枚举）。
   * 连续失败超过阈值后锁定一段时间，此时即使口令正确也拒绝。
   * @param {string} username
   * @param {string} password
   * @param {string} [clientKey] 来源标识（由路由层传 IP），与用户名一起作为限流维度
   * @returns {Promise<{ token: string, expiresAt: number, user: object } | null>}
   */
  async function login(username, password, clientKey = '') {
    pruneSessions()
    const keys = [`u:${username}`, `i:${clientKey || '-'}`]
    if (loginLocked(keys)) return null

    const user = users.find(u => u.username === username)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      noteLoginFail(keys)
      return null
    }
    loginFails.delete(`u:${username}`)

    const token = randomBytes(24).toString('hex')
    const expiresAt = Date.now() + SESSION_TTL_MS
    sessions.set(token, { userId: user.id, expiresAt })
    await persistSessions()
    return { token, expiresAt, user: publicUser(user) }
  }

  /** 注销：删除指定 token 的会话 */
  async function logout(token) {
    if (!token) return false
    const ok = sessions.delete(token)
    if (ok) await persistSessions()
    return ok
  }

  /**
   * 校验 token 并返回公开用户信息。
   * @returns {object | null} 无效/过期返回 null
   */
  function resolveToken(token) {
    if (!token) return null
    const s = sessions.get(token)
    if (!s) return null
    if (s.expiresAt < Date.now()) {
      sessions.delete(token)
      return null
    }
    const user = users.find(u => u.id === s.userId)
    return user ? publicUser(user) : null
  }

  /** 按 id 取用户（含敏感字段，仅服务端内部使用） */
  function getUser(id) {
    return users.find(u => u.id === id) || null
  }

  /** 按用户名取用户（仅服务端内部使用） */
  function findByUsername(username) {
    return users.find(u => u.username === username) || null
  }

  /**
   * 新建用户。用户名重复或参数非法时返回 { error }。
   * @returns {Promise<{ user?: object, error?: string }>}
   */
  async function createUser({ username, displayName, role, password }) {
    // 用户名先去空格再查重：查重用原始值、落库用 trim 后的值，
    // 等于让「 admin」绕过重名检查建出第二个 admin——后者的登录名会被前者抢占，账号不可达。
    const name = String(username ?? '').trim()
    if (!name || !password || String(password).length < 4) {
      return { error: 'username/password invalid' }
    }
    if (ROLE_RANK[role] === undefined) return { error: 'invalid role' }
    if (users.some(u => u.username === name)) return { error: 'username exists' }

    const user = {
      id: `usr_${randomUUID().slice(0, 8)}`,
      username: name,
      displayName: String(displayName || name).trim(),
      role,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    }
    users.push(user)
    await persistUsers()
    return { user: publicUser(user) }
  }

  /**
   * 更新用户资料/角色/口令。
   * 角色降级时保护：不能把最后一名 admin 降掉。
   */
  async function updateUser(id, { displayName, role, password }) {
    const user = users.find(u => u.id === id)
    if (!user) return { error: 'not found' }

    if (displayName !== undefined) {
      user.displayName = String(displayName).trim() || user.displayName
    }
    if (role !== undefined) {
      if (ROLE_RANK[role] === undefined) return { error: 'invalid role' }
      if (user.role === 'admin' && role !== 'admin') {
        const admins = users.filter(u => u.role === 'admin' && u.id !== id)
        if (admins.length === 0) return { error: 'cannot demote last admin' }
      }
      user.role = role
    }
    if (password !== undefined) {
      if (String(password).length < 4) return { error: 'password too short' }
      user.passwordHash = hashPassword(password)
    }
    await persistUsers()
    return { user: publicUser(user) }
  }

  /** 删除用户；至少保留一名 admin；同时踢掉该用户全部会话 */
  async function removeUser(id) {
    const user = users.find(u => u.id === id)
    if (!user) return { error: 'not found' }
    if (user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      return { error: 'cannot remove last admin' }
    }
    users = users.filter(u => u.id !== id)
    for (const [token, s] of sessions) {
      if (s.userId === id) sessions.delete(token)
    }
    await persistUsers()
    await persistSessions()
    return { ok: true }
  }

  /**
   * 用户自助改口令（需提供旧口令）。
   * 管理员重置他人口令请走 updateUser({ password })，无需旧口令。
   */
  async function changeOwnPassword(userId, oldPassword, newPassword) {
    const user = users.find(u => u.id === userId)
    if (!user) return { error: 'not found' }
    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return { error: 'old password incorrect' }
    }
    if (String(newPassword).length < 4) return { error: 'password too short' }
    user.passwordHash = hashPassword(newPassword)
    await persistUsers()
    return { ok: true }
  }

  /** 列出全部用户（已脱敏，不含口令字段） */
  function listUsers() {
    return users.map(publicUser)
  }

  return {
    init,
    login,
    logout,
    resolveToken,
    getUser,
    findByUsername,
    createUser,
    updateUser,
    removeUser,
    changeOwnPassword,
    listUsers,
  }
}
