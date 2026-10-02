/**
 * 键值存储路径辅助（按用户隔离）。
 * 命名空间：`u/<userId>/` 或服务主密钥的 `u/service/`。
 */
import path from 'node:path'
import { promises as fs } from 'node:fs'

/**
 * 当前请求的存储命名空间。
 */
export function scopeOf(authn) {
  if (!authn) return 'u/anonymous/'
  if (authn.master) return 'u/service/'
  return `u/${encodeURIComponent(authn.user.id)}/`
}

/**
 * 全局命名空间：部署级设置（站点品牌等）统一存放于此，不按用户隔离。
 * 读取不要求登录（登录页也要展示品牌），写入在路由层另行校验 admin 角色。
 * 注意：全局键不并入 listKeys() 枚举——keys() 仍只返回用户自己的数据，
 * 前端按固定键名显式读写（与前端 SITE_BRANDING_KEY 保持一致的命名约定）。
 */
export const GLOBAL_SCOPE = 'u/global/'

/** 键名 → 安全文件路径（含用户命名空间） */
export function fileFor(dataDir, key, scope) {
  return path.join(dataDir, scope, encodeURIComponent(key) + '.json')
}

/** 某用户的 KV 数据子目录 */
export function scopeDir(dataDir, scope) {
  return path.join(dataDir, scope)
}

/** 列出该命名空间下的全部 key */
export async function listKeys(dataDir, scope) {
  const dir = scopeDir(dataDir, scope)
  await fs.mkdir(dir, { recursive: true })
  let files = []
  try {
    files = await fs.readdir(dir)
  } catch {
    files = []
  }
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => decodeURIComponent(f.slice(0, -5)))
}

export async function readValue(dataDir, key, scope) {
  try {
    return await fs.readFile(fileFor(dataDir, key, scope), 'utf8')
  } catch {
    return null
  }
}

export async function writeValue(dataDir, key, scope, value) {
  await fs.mkdir(scopeDir(dataDir, scope), { recursive: true })
  await fs.writeFile(fileFor(dataDir, key, scope), value, 'utf8')
}

export async function removeValue(dataDir, key, scope) {
  await fs.rm(fileFor(dataDir, key, scope), { force: true })
}
