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
import { ApiRequestError, apiData, apiFetch } from '@/api/client'
import { setSessionToken } from '@/auth/session'

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

  // 主动登出进行中：登出请求本身也可能收到 401（token 早已失效），
  // 那不是「会话在使用中过期」，不能再弹一次过期提示
  let loggingOut = false

  /** 清本地登录态（token、缓存、用户命名空间），不碰服务端会话 */
  function clearLocalSession(): void {
    setSessionToken(null)
    user.value = null
    clearSessionCache()
    resetCustomComponentsCache()
    syncLocalNamespace(null)
  }

  /**
   * 全局会话失效入口，由 main.ts 注册到 api/client 的 unauthorized 回调。
   * 返回 false 表示不该当成「使用中过期」处理：尚未登录（启动恢复期、登录失败）
   * 或正在主动登出。调用方据此决定是否提示与跳转登录页。
   */
  function handleSessionExpired(): boolean {
    if (loggingOut || !user.value) return false
    clearLocalSession()
    return true
  }

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
      const me = await apiData<LoginUser>('/auth/me', { signal: AbortSignal.timeout(3000) })
      user.value = me
      resetCustomComponentsCache()
      syncLocalNamespace(user.value?.id)
    } catch (e) {
      // 只有「会话明确失效」才清缓存：超时（code=timeout）与 5xx 都可能只是后端临时
      // 不可用，此时要保住登录态走下面的离线还原，否则内网演示会被一次抖动踢回登录页
      if (e instanceof ApiRequestError && e.code === 'unauthorized') {
        clearLocalSession()
        return
      }
      // 后端不可用时保留本地用户缓存，便于内网离线演示（写接口会 401）。
      // token 在请求之前已置位；此处把缓存里的 user 还原到 store，
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
      const session = await apiData<SessionPayload>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      if (!session?.token) {
        loginError.value = '登录失败'
        return false
      }
      user.value = session.user
      setSessionToken(session.token)
      writeSessionCache(JSON.stringify({ user: session.user, token: session.token }))
      resetCustomComponentsCache()
      syncLocalNamespace(user.value?.id)
      return true
    } catch (e) {
      // ApiRequestError.message 就是服务端给的中文说明（用户名或口令错误 / 尝试过于频繁…）
      loginError.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loggingOut = true
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
      // ignore：登出失败也要把本地登录态清掉
    } finally {
      loggingOut = false
    }
    clearLocalSession()
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
    handleSessionExpired,
    operatorName,
  }
})
