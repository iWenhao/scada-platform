import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { roleAtLeast, type LoginUser, type Role } from '@/types/auth'
import { getStorage, syncLocalNamespace } from '@/storage'
import { LOCAL_SESSION_KEY as SESSION_KEY } from '@/storage/sessionKey'
import { resolveApiBase } from '@/storage/config'
import { setSessionToken, authHeaders } from '@/auth/session'

interface SessionPayload {
  user: LoginUser
  token: string
}

/**
 * 会话与角色鉴权：登录走后端 /api/auth/login，角色以服务端会话为准。
 * 存储/历史/审计请求通过 session.ts 注入 Bearer。
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

  const canEdit = computed(() => can('engineer'))
  const canWrite = computed(() => can('operator'))
  const canManageUsers = computed(() => can('admin'))

  async function restoreSession(): Promise<void> {
    try {
      const raw = await getStorage().get(SESSION_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as SessionPayload
      if (!saved?.token || !saved?.user?.id) return
      setSessionToken(saved.token)
      const res = await fetch(`${resolveApiBase()}/auth/me`, {
        headers: authHeaders(),
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) {
        setSessionToken(null)
        await getStorage().remove(SESSION_KEY)
        syncLocalNamespace(null)
        return
      }
      const body = await res.json()
      user.value = body.user
      // 本地回落模式下切到该用户的键空间，保持"工程隔离"语义一致
      syncLocalNamespace(user.value?.id)
    } catch {
      // 后端不可用时保留本地用户缓存，便于内网离线演示（写接口会 401）
      syncLocalNamespace(undefined)
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true
    loginError.value = ''
    try {
      const res = await fetch(`${resolveApiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.token) {
        loginError.value = body.error || '登录失败'
        return false
      }
      user.value = body.user
      setSessionToken(body.token)
      await getStorage().set(SESSION_KEY, JSON.stringify({ user: body.user, token: body.token }))
      syncLocalNamespace(user.value?.id)
      return true
    } catch (e) {
      loginError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`${resolveApiBase()}/auth/logout`, {
        method: 'POST',
        headers: authHeaders(),
      })
    } catch {
      // ignore
    }
    setSessionToken(null)
    user.value = null
    await getStorage().remove(SESSION_KEY)
    syncLocalNamespace(null)
  }

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
