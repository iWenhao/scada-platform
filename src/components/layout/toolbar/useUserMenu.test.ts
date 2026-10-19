import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { useUserMenu } from './useUserMenu'

describe('useUserMenu', () => {
  const originalLocation = window.location

  beforeEach(() => {
    setActivePinia(createPinia())
    // jsdom 里给 location 赋值会走真导航并报错，换成哑对象只断言目标路径
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
    vi.restoreAllMocks()
  })

  it('用户在管理项时打开用户管理对话框，不碰会话', async () => {
    const { showUserManage, handleUserCommand } = useUserMenu()
    await handleUserCommand('users')
    expect(showUserManage.value).toBe(true)
    expect(window.location.href).toBe('')
  })

  it('取消确认后留在原页，不调用登出接口', async () => {
    const authStore = useAuthStore()
    const logout = vi.spyOn(authStore, 'logout').mockResolvedValue()
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
    const { handleUserCommand } = useUserMenu()

    await handleUserCommand('logout')
    expect(logout).not.toHaveBeenCalled()
    expect(window.location.href).toBe('')
  })

  it('确认后登出并跳转登录页', async () => {
    const authStore = useAuthStore()
    const logout = vi.spyOn(authStore, 'logout').mockResolvedValue()
    // 被测代码只 await 确认结果、不读返回值，所以给个占位值即可（MessageBoxData 是联合类型，直接构造会被收窄拒绝）
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    const { handleUserCommand } = useUserMenu()

    await handleUserCommand('logout')
    expect(confirm).toHaveBeenCalledWith('退出登录？', '退出登录', expect.anything())
    expect(logout).toHaveBeenCalledOnce()
    expect(window.location.href).toBe('/login')
  })

  it('有未保存改动时确认文案带出丢失警告', async () => {
    useProjectStore().hasUnsavedChanges = true
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
    const { handleUserCommand } = useUserMenu()

    await handleUserCommand('logout')
    expect(confirm.mock.calls[0]?.[0]).toContain('未保存的更改')
  })
})
