/** 角色：由低到高，权限包含关系（admin 含全部） */
export type Role = 'viewer' | 'operator' | 'engineer' | 'admin'

export const ROLE_LABELS: Record<Role, string> = {
  viewer: '观察员',
  operator: '操作员',
  engineer: '工程师',
  admin: '管理员',
}

export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: Role
  /** 盐 */
  salt: string
  /** SHA-256(salt + password) 的十六进制 */
  passwordHash: string
  createdAt: number
}

/** 入库存储的用户（不含明文密码） */
export type AuthUserRecord = AuthUser

export interface LoginUser {
  id: string
  username: string
  displayName: string
  role: Role
}

/** 角色等级：数字越大权限越高 */
const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  operator: 1,
  engineer: 2,
  admin: 3,
}

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}
