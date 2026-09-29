/**
 * 会话缓存：必须放在「用户命名空间之外」。
 * 无论本地还是远程存储，刷新后恢复登录都要在鉴权之前能读到它；
 * 一旦走带命名空间的 getStorage()，匿名态会读到 u/anonymous/ 下的空值。
 */
export const LOCAL_SESSION_KEY = 'scada_session'

export function readSessionCache(): string | null {
  try {
    return localStorage.getItem(LOCAL_SESSION_KEY)
  } catch {
    return null
  }
}

export function writeSessionCache(raw: string): void {
  try {
    localStorage.setItem(LOCAL_SESSION_KEY, raw)
  } catch {
    // 隐私模式等不可写场景：会话仅存于内存（刷新需重登）
  }
}

export function clearSessionCache(): void {
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY)
  } catch {
    // ignore
  }
}
