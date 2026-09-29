import { resolveApiToken } from '@/storage/config'

/**
 * 会话 Token：登录后由 authStore 注入。
 * 各 API 客户端统一用 resolveBearer() 取鉴权头。
 */
let sessionToken: string | null = null

export function setSessionToken(token: string | null) {
  sessionToken = token || null
}

export function getSessionToken(): string | null {
  return sessionToken
}

/** 优先用户会话；否则回落构建期的 VITE_API_TOKEN（服务主密钥） */
export function resolveBearer(): string | null {
  return sessionToken || resolveApiToken()
}

export function authHeaders(): Record<string, string> {
  const token = resolveBearer()
  return token ? { authorization: `Bearer ${token}` } : {}
}
