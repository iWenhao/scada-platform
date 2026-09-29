import { getStorage } from '@/storage'
import { hashPassword, randomSalt, verifyPassword } from './password'
import type { AuthUser, Role } from '@/types/auth'

const STORAGE_KEY = 'scada_users'

/** 默认管理员（首次启动种子；请在用户管理中改口令） */
export const SEED_USERS: Array<{
  username: string
  displayName: string
  role: Role
  password: string
}> = [
  { username: 'admin', displayName: '管理员', role: 'admin', password: 'admin123' },
  { username: 'engineer', displayName: '工程师', role: 'engineer', password: 'engineer123' },
  { username: 'operator', displayName: '操作员', role: 'operator', password: 'operator123' },
]

function isValidUser(u: any): u is AuthUser {
  return u && typeof u.id === 'string' && typeof u.username === 'string' && u.role
}

/** 读取全部用户 */
export async function loadUsers(): Promise<AuthUser[]> {
  const raw = await getStorage().get(STORAGE_KEY)
  if (!raw) {
    // 首次启动写入种子账号
    const seeded = await Promise.all(
      SEED_USERS.map(async s => createUserRecord(s.username, s.displayName, s.role, s.password)),
    )
    await persistUsers(seeded)
    return seeded
  }
  try {
    const list = JSON.parse(raw) as AuthUser[]
    return Array.isArray(list) ? list.filter(isValidUser) : []
  } catch {
    return []
  }
}

async function persistUsers(list: AuthUser[]): Promise<void> {
  await getStorage().set(STORAGE_KEY, JSON.stringify(list))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('scada-users-changed'))
  }
}

async function createUserRecord(
  username: string,
  displayName: string,
  role: Role,
  password: string,
): Promise<AuthUser> {
  const salt = randomSalt()
  const passwordHash = await hashPassword(password, salt)
  return {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username,
    displayName,
    role,
    salt,
    passwordHash,
    createdAt: Date.now(),
  }
}

/** 创建用户；用户名重复返回 null */
export async function addUser(
  username: string,
  displayName: string,
  role: Role,
  password: string,
): Promise<AuthUser | null> {
  const list = await loadUsers()
  if (list.some(u => u.username === username)) return null
  const user = await createUserRecord(username, displayName || username, role, password)
  list.push(user)
  await persistUsers(list)
  return user
}

/** 改角色 / 显示名 */
export async function updateUserProfile(
  id: string,
  patch: { displayName?: string; role?: Role },
): Promise<boolean> {
  const list = await loadUsers()
  const user = list.find(u => u.id === id)
  if (!user) return false
  if (patch.displayName !== undefined) user.displayName = patch.displayName
  if (patch.role !== undefined) user.role = patch.role
  await persistUsers(list)
  return true
}

/** 改口令；校验旧口令（管理员重置可传 skipOld） */
export async function changePassword(
  id: string,
  newPassword: string,
  oldPassword?: string,
): Promise<boolean> {
  const list = await loadUsers()
  const user = list.find(u => u.id === id)
  if (!user) return false
  if (oldPassword !== undefined) {
    const ok = await verifyPassword(oldPassword, user.salt, user.passwordHash)
    if (!ok) return false
  }
  const salt = randomSalt()
  user.salt = salt
  user.passwordHash = await hashPassword(newPassword, salt)
  await persistUsers(list)
  return true
}

/** 删除用户（至少保留一名 admin） */
export async function removeUser(id: string): Promise<boolean> {
  const list = await loadUsers()
  const target = list.find(u => u.id === id)
  if (!target) return false
  const admins = list.filter(u => u.role === 'admin' && u.id !== id)
  if (target.role === 'admin' && admins.length === 0) return false
  await persistUsers(list.filter(u => u.id !== id))
  return true
}

/** 校验登录 */
export async function authenticate(
  username: string,
  password: string,
): Promise<AuthUser | null> {
  const list = await loadUsers()
  const user = list.find(u => u.username === username)
  if (!user) return null
  const ok = await verifyPassword(password, user.salt, user.passwordHash)
  return ok ? user : null
}
