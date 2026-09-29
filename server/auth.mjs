// 账号 / 会话 / 角色（零依赖，Node crypto.scrypt 口令哈希）
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto'

export const ROLE_RANK = { viewer: 0, operator: 1, engineer: 2, admin: 3 }

export function roleAtLeast(role, min) {
  return (ROLE_RANK[role] ?? -1) >= (ROLE_RANK[min] ?? 99)
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 32).toString('hex')
  return `${salt}:${hash}`
}

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

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    createdAt: u.createdAt,
  }
}

export function createAuthStore(dataDir) {
  const usersFile = path.join(dataDir, '_users.json')
  const sessionsFile = path.join(dataDir, '_sessions.json')
  /** token -> { userId, expiresAt } */
  const sessions = new Map()
  let users = []
  const SESSION_TTL_MS = 12 * 3600 * 1000

  async function persistUsers() {
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8')
  }

  async function persistSessions() {
    try {
      await fs.mkdir(dataDir, { recursive: true })
      await fs.writeFile(
        sessionsFile,
        JSON.stringify([...sessions.entries()].map(([token, s]) => ({ token, ...s }))),
        'utf8',
      )
    } catch {
      // 会话落盘失败不阻断登录（内存会话仍有效）
    }
  }

  function pruneSessions() {
    const now = Date.now()
    for (const [token, s] of sessions) {
      if (s.expiresAt < now) sessions.delete(token)
    }
  }

  async function init() {
    await fs.mkdir(dataDir, { recursive: true })
    try {
      const raw = await fs.readFile(usersFile, 'utf8')
      users = JSON.parse(raw)
      if (!Array.isArray(users)) users = []
    } catch {
      users = []
    }

    if (users.length === 0) {
      const seeds = [
        ['admin', '管理员', 'admin', 'admin123'],
        ['engineer', '工程师', 'engineer', 'engineer123'],
        ['operator', '操作员', 'operator', 'operator123'],
        ['viewer', '观察员', 'viewer', 'viewer123'],
      ]
      users = seeds.map(([username, displayName, role, password], i) => ({
        id: `usr_seed_${i}`,
        username,
        displayName,
        role,
        passwordHash: hashPassword(password),
        createdAt: Date.now(),
      }))
      await persistUsers()
      console.log('[scada-server] 已创建种子账号 admin/engineer/operator/viewer（请尽快改口令）')
    }

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
      // 无会话文件
    }
    pruneSessions()
  }

  async function login(username, password) {
    pruneSessions()
    const user = users.find(u => u.username === username)
    if (!user || !verifyPassword(password, user.passwordHash)) return null
    const token = randomBytes(24).toString('hex')
    const expiresAt = Date.now() + SESSION_TTL_MS
    sessions.set(token, { userId: user.id, expiresAt })
    await persistSessions()
    return { token, expiresAt, user: publicUser(user) }
  }

  async function logout(token) {
    if (!token) return false
    const ok = sessions.delete(token)
    if (ok) await persistSessions()
    return ok
  }

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

  function getUser(id) {
    return users.find(u => u.id === id) || null
  }

  function findByUsername(username) {
    return users.find(u => u.username === username) || null
  }

  async function createUser({ username, displayName, role, password }) {
    if (!username || !password || String(password).length < 4) return { error: 'username/password invalid' }
    if (!ROLE_RANK[role] && role !== 'viewer') return { error: 'invalid role' }
    if (users.some(u => u.username === username)) return { error: 'username exists' }
    const user = {
      id: `usr_${randomUUID().slice(0, 8)}`,
      username: String(username).trim(),
      displayName: String(displayName || username).trim(),
      role,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    }
    users.push(user)
    await persistUsers()
    return { user: publicUser(user) }
  }

  async function updateUser(id, { displayName, role, password }) {
    const user = users.find(u => u.id === id)
    if (!user) return { error: 'not found' }
    if (displayName !== undefined) user.displayName = String(displayName).trim() || user.displayName
    if (role !== undefined) {
      if (!ROLE_RANK[role] && role !== 'viewer') return { error: 'invalid role' }
      // 不能取消最后一名管理员
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

  async function changeOwnPassword(userId, oldPassword, newPassword) {
    const user = users.find(u => u.id === userId)
    if (!user) return { error: 'not found' }
    if (!verifyPassword(oldPassword, user.passwordHash)) return { error: 'old password incorrect' }
    if (String(newPassword).length < 4) return { error: 'password too short' }
    user.passwordHash = hashPassword(newPassword)
    await persistUsers()
    return { ok: true }
  }

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
