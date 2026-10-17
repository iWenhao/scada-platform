/**
 * 登录失败限流（内存计数，进程重启即清零）。
 *
 * 从 auth.mjs 拆出：登录接口不区分「用户名不存在」与「口令错误」，但不限次数的话
 * 仍可无限试。两个维度各记一份：按用户名（挡针对某账号的定向爆破）、按来源
 * （挡同一来源撞不同账号），任一维度超限就拒绝。
 * 计数只存内存，避免把失败记录写进数据目录。
 */

/** 触发锁定的连续失败次数 */
const DEFAULT_MAX_FAILS = 5
/** 锁定时长 */
const DEFAULT_LOCK_MS = 5 * 60 * 1000

/**
 * @param {{ maxFails?: number, lockMs?: number }} [options] 便于测试用短窗口
 */
export function createLoginGuard(options = {}) {
  const maxFails = options.maxFails ?? DEFAULT_MAX_FAILS
  const lockMs = options.lockMs ?? DEFAULT_LOCK_MS
  /** @type {Map<string, { count: number, until: number }>} key -> 失败记录 */
  const fails = new Map()

  /**
   * 任一 key 处于锁定期即为 true。
   * @param {string[]} keys 同一请求的多个限流维度，如 ['u:admin', 'i:10.0.0.1']
   */
  function isLocked(keys) {
    const now = Date.now()
    for (const key of keys) {
      const rec = fails.get(key)
      if (rec && rec.until > now) return true
    }
    return false
  }

  /** 记一次失败（各维度同时计数） */
  function noteFail(keys) {
    const now = Date.now()
    for (const key of keys) {
      const rec = fails.get(key)
      // 只在「曾经锁定且锁已过期」时清零，否则早期失败会永久压住该账号。
      // 注意 until=0 表示从未锁定，不能参与这个判断——否则每次失败都会把计数重置回 1，
      // 永远攒不到阈值，限流形同虚设。
      const count = rec && rec.until > 0 && rec.until <= now ? 0 : (rec?.count || 0)
      fails.set(key, {
        count: count + 1,
        until: count + 1 >= maxFails ? now + lockMs : 0,
      })
    }
  }

  /** 登录成功后清掉该维度，之前的失败不该继续压住账号 */
  function clear(keys) {
    for (const key of keys) fails.delete(key)
  }

  return { isLocked, noteFail, clear }
}
