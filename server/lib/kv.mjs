/**
 * 键值存储路径辅助（按用户隔离）。
 * 命名空间：`u/<userId>/` 或服务主密钥的 `u/service/`。
 */
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { writeFileAtomic, withTransientRetry } from './atomicWrite.mjs'

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

/** 站点品牌存储键（部署级全局设置），与前端 src/stores/brandingStore.ts 保持一致 */
export const SITE_BRANDING_KEY = 'site:branding'

/**
 * 键名长度上限（按 `encodeURIComponent` 之后的长度算）。
 *
 * 只看原始长度挡不住长文件名：中文等字符编码后会膨胀到 9 倍（`泵` → `%E6%B3%B5`）。
 * 超长键会让 fs 抛 `ENAMETOOLONG`，在路由层就是一条 500——而这是客户端传错参数导致的，
 * 应当是 400。这里提前拦掉。
 */
export const MAX_KEY_LENGTH = 200

/**
 * 键名是否可用。不可用返回英文错误文案（路由层直接作为 `error` 返回），可用返回 null。
 */
export function keyError(key) {
  const k = String(key ?? '')
  if (!k) return 'missing key'
  if (k.includes('\0')) return 'invalid key'
  if (encodeURIComponent(k).length > MAX_KEY_LENGTH) {
    return `key too long (max ${MAX_KEY_LENGTH} after encoding)`
  }
  return null
}

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
  await writeFileAtomic(fileFor(dataDir, key, scope), value, 'utf8')
}

/**
 * 仅当键不存在时写入（乐观并发里的「创建」语义）。
 * 存在性检查在同路径串行槽内、rename 之前完成，所以两个并发 create 只有一个能成功。
 * 目标已存在时抛出 `code='EEXIST'` 的错误，由路由层映射为 409；其余错误原样抛出。
 * 注意：只在单进程下成立——多进程共享同一 DATA_DIR 时 access 与 rename 之间仍有窗口，
 * 真要跨进程防需要把 'wx' 落到正式文件名或引入锁/DB（当前部署形态为单进程）。
 */
export async function writeValueIfAbsent(dataDir, key, scope, value) {
  await writeFileAtomic(fileFor(dataDir, key, scope), value, 'utf8', { ifAbsent: true })
}

export async function removeValue(dataDir, key, scope) {
  // 自动草稿每 30 秒重写一次，正式保存后紧接着删最容易撞上 Windows 的句柄未释放（EPERM/EBUSY）；
  // force 只吞 ENOENT，不重试就是一条 500 打到前端
  await withTransientRetry(() => fs.rm(fileFor(dataDir, key, scope), { force: true }))
}
