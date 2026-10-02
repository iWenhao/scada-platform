import type { Role } from '@/types/auth'

/**
 * 演示种子账号：与 server/auth.mjs 首次启动写入的账号一致，
 * 仅供登录页展示「点击填入」的提示，实际校验走服务端 /api/auth/*。
 */
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
