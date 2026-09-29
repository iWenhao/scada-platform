import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorageAdapter, setStorage } from '@/storage'
import { hashPassword, verifyPassword, randomSalt } from './password'
import {
  loadUsers,
  addUser,
  authenticate,
  changePassword,
  removeUser,
  updateUserProfile,
} from './userLibrary'
import { roleAtLeast } from '@/types/auth'

describe('password', () => {
  it('相同口令与盐应得到相同哈希', async () => {
    const salt = randomSalt()
    const a = await hashPassword('secret', salt)
    const b = await hashPassword('secret', salt)
    expect(a).toBe(b)
    expect(a).not.toContain('secret')
  })

  it('verifyPassword 应校验正确/错误口令', async () => {
    const salt = randomSalt()
    const hash = await hashPassword('secret', salt)
    expect(await verifyPassword('secret', salt, hash)).toBe(true)
    expect(await verifyPassword('bad', salt, hash)).toBe(false)
  })
})

describe('roleAtLeast', () => {
  it('角色等级包含关系', () => {
    expect(roleAtLeast('admin', 'engineer')).toBe(true)
    expect(roleAtLeast('engineer', 'operator')).toBe(true)
    expect(roleAtLeast('viewer', 'operator')).toBe(false)
    expect(roleAtLeast('operator', 'operator')).toBe(true)
  })
})

describe('userLibrary', () => {
  beforeEach(() => {
    setStorage(new MemoryStorageAdapter())
  })

  it('首次启动应种子 admin/engineer/operator', async () => {
    const users = await loadUsers()
    const names = users.map(u => u.username).sort()
    expect(names).toEqual(['admin', 'engineer', 'operator'])
  })

  it('登录成功/失败', async () => {
    expect(await authenticate('admin', 'admin123')).not.toBeNull()
    expect(await authenticate('admin', 'wrong')).toBeNull()
    expect(await authenticate('nobody', 'x')).toBeNull()
  })

  it('创建用户与用户名去重', async () => {
    const created = await addUser('alice', 'Alice', 'operator', 'pass1234')
    expect(created).not.toBeNull()
    expect(await addUser('alice', 'Alice2', 'operator', 'pass1234')).toBeNull()
  })

  it('改口令需校验旧口令（除非管理员重置跳过）', async () => {
    await addUser('bob', 'Bob', 'operator', 'oldpass1')
    expect(await changePassword('bob', 'newpass1', 'wrong')).toBe(false)
    const users = await loadUsers()
    const bob = users.find(u => u.username === 'bob')!
    expect(await changePassword(bob.id, 'newpass1', 'oldpass1')).toBe(true)
    expect(await authenticate('bob', 'newpass1')).not.toBeNull()
  })

  it('不能删除最后一名管理员', async () => {
    const users = await loadUsers()
    const admin = users.find(u => u.role === 'admin')!
    const others = users.filter(u => u.role !== 'admin')
    for (const u of others) {
      expect(await removeUser(u.id)).toBe(true)
    }
    expect(await removeUser(admin.id)).toBe(false)
  })

  it('更新角色与显示名', async () => {
    const users = await loadUsers()
    const op = users.find(u => u.username === 'operator')!
    await updateUserProfile(op.id, { role: 'engineer', displayName: '值班长' })
    const after = (await loadUsers()).find(u => u.id === op.id)!
    expect(after.role).toBe('engineer')
    expect(after.displayName).toBe('值班长')
  })
})
