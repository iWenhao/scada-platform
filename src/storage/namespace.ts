import { LOCAL_SESSION_KEY } from './sessionKey'

/**
 * 本地（localStorage）模式下的用户命名空间。
 *
 * 服务端在线时，隔离由后端 `u/<userId>/` 目录完成（见 server/index.mjs）；
 * 但后端不可用时前端会回落到 localStorage，过去那里没有命名空间概念——
 * 同一浏览器切换账号仍能看到彼此的工程，与"工程隔离"的产品承诺不一致。
 * 这里让本地模式沿用同一套前缀语义，两种模式行为对齐。
 */

/** 未登录/未识别用户时使用的命名空间（与服务端 anonymous scope 对齐） */
export const ANONYMOUS_NAMESPACE = 'u/anonymous/'

export function namespaceForUser(userId?: string | null): string {
  return userId ? `u/${userId}/` : ANONYMOUS_NAMESPACE
}

/**
 * 从本地会话缓存解析当前用户命名空间。
 * 挂载前 pinia 尚未恢复会话，只能直接读缓存；缓存缺失/损坏时按匿名处理。
 */
export function resolveLocalNamespace(): string {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY)
    if (!raw) return ANONYMOUS_NAMESPACE
    const saved = JSON.parse(raw) as { user?: { id?: string } }
    return namespaceForUser(saved?.user?.id)
  } catch {
    return ANONYMOUS_NAMESPACE
  }
}
