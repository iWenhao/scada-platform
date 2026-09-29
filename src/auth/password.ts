/**
 * 口令哈希：Web Crypto SHA-256 + 随机盐。
 * 仅用于本应用的界面级账号，不存明文；生产多租户仍应接服务端鉴权。
 */

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const hash = await hashPassword(password, salt)
  // 定长比较，避免时序侧信道（短口令场景影响有限）
  if (hash.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  }
  return diff === 0
}
