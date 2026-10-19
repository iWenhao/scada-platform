import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { roleAtLeast, type LoginUser, type Role } from '@/types/auth'
import { syncLocalNamespace } from '@/storage'
import { resetCustomComponentsCache } from '@/industrial/customLibrary'
import {
  readSessionCache,
  writeSessionCache,
  clearSessionCache,
} from '@/storage/sessionKey'
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
    // saved 提升到 try 外：catch 分支（后端不可达）也要靠它还原登录态。
    // JSON.parse 仍留在 try 内——缓存损坏时抛错被这里接住，saved 保持 null。
    let saved: SessionPayload | null = null
    try {
      // 会话固定读 localStorage（不走命名空间存储），刷新后才能在鉴权前恢复
      const raw = readSessionCache()
      if (!raw) return
      saved = JSON.parse(raw) as SessionPayload
      if (!saved?.token || !saved?.user?.id) return
      setSessionToken(saved.token)
      const res = await fetch(`${resolveApiBase()}/auth/me`, {
        headers: authHeaders(),
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) {
        setSessionToken(null)
        clearSessionCache()
        resetCustomComponentsCache()
        syncLocalNamespace(null)
        return
      }
      const body = await res.json()
      user.value = body.user
      resetCustomComponentsCache()
      syncLocalNamespace(user.value?.id)
    } catch {
      // 后端不可用时保留本地用户缓存，便于内网离线演示（写接口会 401）。
      // token 在 fetch 之前已置位；此处把缓存里的 user 还原到 store，
      // 并同步到该用户的键空间——若落到匿名命名空间，看到的会是别人的数据
      if (saved?.user?.id) {
        user.value = saved.user
        resetCustomComponentsCache()
        syncLocalNamespace(saved.user.id)
      }
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
      writeSessionCache(JSON.stringify({ user: body.user, token: body.token }))
      resetCustomComponentsCache()
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
    clearSessionCache()
    resetCustomComponentsCache()
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
