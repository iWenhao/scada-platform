import { describe, it, expect } from 'vitest'
import { roleAtLeast } from '@/types/auth'

describe('roleAtLeast', () => {
  it('角色等级包含关系', () => {
    expect(roleAtLeast('admin', 'engineer')).toBe(true)
    expect(roleAtLeast('engineer', 'operator')).toBe(true)
    expect(roleAtLeast('viewer', 'operator')).toBe(false)
    expect(roleAtLeast('operator', 'operator')).toBe(true)
  })
})
