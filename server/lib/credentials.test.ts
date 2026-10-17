// @vitest-environment node
/**
 * 口令哈希与会话令牌摘要。
 * 这两个函数决定了「磁盘上留下的东西能不能反推出可用凭证」，值得单独钉住。
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashPassword, sessionKey, verifyPassword } from './credentials.mjs'

describe('hashPassword / verifyPassword', () => {
  it('落库格式是 salt:hash 两段，且不含明文口令', () => {
    const stored = hashPassword('Seed-Pass-2026')
    const [salt, hash] = stored.split(':')
    expect(stored.split(':')).toHaveLength(2)
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(stored).not.toContain('Seed-Pass-2026')
  })

  it('同一口令两次哈希不同（每次一个新盐）', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'))
  })

  it('正确口令通过，错误口令与畸形存储一律 false', () => {
    const stored = hashPassword('right-pw')
    expect(verifyPassword('right-pw', stored)).toBe(true)
    expect(verifyPassword('wrong-pw', stored)).toBe(false)
    // 缺盐、缺哈希、空串都不能抛错，只能判死
    expect(verifyPassword('x', 'noseparator')).toBe(false)
    expect(verifyPassword('x', ':')).toBe(false)
    expect(verifyPassword('x', '')).toBe(false)
    expect(verifyPassword('', stored)).toBe(false)
  })

  it('哈希段长度不符时不误判为通过', () => {
    const salt = 'a'.repeat(32)
    expect(verifyPassword('x', `${salt}:${'b'.repeat(30)}`)).toBe(false)
    expect(verifyPassword('x', `${salt}:${'b'.repeat(64)}`)).toBe(false)
  })
})

describe('sessionKey', () => {
  it('是令牌的 SHA-256 摘要：稳定、64 位十六进制、不含原文', () => {
    const token = 'f'.repeat(48)
    const key = sessionKey(token)
    expect(key).toBe(createHash('sha256').update(token).digest('hex'))
    expect(key).toBe(sessionKey(token))
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).not.toContain('ffffffff')
  })

  it('不同令牌得到不同摘要，空串不会与任何真实令牌撞键', () => {
    expect(sessionKey('a')).not.toBe(sessionKey('b'))
    expect(sessionKey('')).not.toBe(sessionKey('a'))
  })
})
