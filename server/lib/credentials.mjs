/**
 * 口令与会话令牌的密码学原语（零依赖）。
 *
 * 从 auth.mjs 拆出：这两类「怎么算哈希」的决策各自都有非显然的取舍，
 * 集中一处便于单独验证，也让 auth.mjs 只管账号与会话的生命周期。
 */
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto'

/**
 * 口令哈希：scrypt(password, salt, 32) → "salt:hash_hex"
 * 存储格式固定两段，便于 verify 时拆开。
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 32).toString('hex')
  return `${salt}:${hash}`
}

/**
 * 校验口令。使用常数时间比较，失败（格式错/长度不一致）一律 false。
 */
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  try {
    const calc = scryptSync(String(password), salt, 32)
    const expected = Buffer.from(hash, 'hex')
    return calc.length === expected.length && timingSafeEqual(calc, expected)
  } catch {
    return false
  }
}

/**
 * 会话令牌的存储键：SHA-256(令牌) 的十六进制。
 * 内存 Map 与磁盘文件都用它做键，因此全程不持有明文令牌；请求带来的明文令牌现算现查（一次哈希，微秒级）。
 * 不用 scrypt：口令要抗爆破所以慢，令牌是 192 位随机值、搜索空间足够大，摘要只需抗原像。
 * @param {string} token 客户端持有的原始令牌
 */
export function sessionKey(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}
