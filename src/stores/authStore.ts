import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authenticate } from '@/auth/userLibrary'
import { roleAtLeast, type LoginUser, type Role } from '@/types/auth'
import { getStorage } from '@/storage'

const SESSION_KEY = 'scada_session'

/**
 * 会话与角色鉴权。
 * 界面级 RBAC：登录后按角色限制编辑/写值/用户管理。
 * 存储 API 仍使用独立的共享 AUTH_TOKEN（见 .env.example）。
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<LoginUser | null>(null)
  const loginError = ref('')
  const loading = ref(false)

  const isLoggedIn = computed(() => user.value !== null)
  const role = computed<Role | null>(() => user.value?.role ?? null)
  const displayName = computed(() => user.value?.displayName || user.value?.username || '')

  function can(min: Role): boolean {
    return user.value ? roleAtLeast(user.value.role, min) : false
  }

  /** 可进编辑器 */
  const canEdit = computed(() => can('engineer'))
  /** 可写值 / 确认报警 */
  const canWrite = computed(() => can('operator'))
  /** 可管用户 */
  const canManageUsers = computed(() => can('admin'))

  async function restoreSession(): Promise<void> {
    try {
      const raw = await getStorage().get(SESSION_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as LoginUser
      if (saved && saved.id && saved.username && saved.role) {
        user.value = saved
      }
    } catch {
      // 忽略坏会话
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true
    loginError.value = ''
    try {
      const found = await authenticate(username, password)
      if (!found) {
        loginError.value = '用户名或口令错误'
        return false
      }
      user.value = {
        id: found.id,
        username: found.username,
        displayName: found.displayName,
        role: found.role,
      }
      await getStorage().set(SESSION_KEY, JSON.stringify(user.value))
      return true
    } catch (e) {
      loginError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    user.value = null
    await getStorage().remove(SESSION_KEY)
  }

  /** 审计用操作者名 */
  function operatorName(): string {
    return user.value ? `${user.value.displayName}(${user.value.username})` : '匿名'
  }

  return {
    user,
    loginError,
    loading,
    isLoggedIn,
    role,
    displayName,
    canEdit,
    canWrite,
    canManageUsers,
    can,
    restoreSession,
    login,
    logout,
    operatorName,
  }
})
