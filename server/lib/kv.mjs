/**
 * 键值存储路径辅助（按用户隔离）。
 * 命名空间：`u/<userId>/` 或服务主密钥的 `u/service/`。
 */
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { ApiError } from './apiError.mjs'
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
 * 键名问题归类（纯函数，不抛错）：返回机器码 `'missing' | 'invalid' | 'too_long'`，可用时返回 null。
 * 返回码而不是文案：文案是给客户端读的，判据留在服务端内部，改措辞不会改语义。
 */
export function keyProblem(key) {
  const k = String(key ?? '')
  if (!k) return 'missing'
  if (k.includes('\0')) return 'invalid'
  if (encodeURIComponent(k).length > MAX_KEY_LENGTH) return 'too_long'
  return null
}

/** 键名问题的中文说明（进 error.message，供用户直接看） */
const KEY_PROBLEM_MESSAGES = {
  missing: '缺少 key 参数',
  invalid: 'key 含非法字符',
  too_long: `key 过长（URL 编码后最多 ${MAX_KEY_LENGTH} 字符）`,
}

/**
 * 键名校验，不合法抛 400 ApiError（code=invalid_key），由顶层 catch 出统一失败形状。
 * 超长键必须在这里拦：不拦的话 fs 抛 ENAMETOOLONG，客户端只看到一条无意义的 500，
 * 而这明明是客户端传错参数。
 */
export function assertKey(key) {
  const problem = keyProblem(key)
  if (problem) throw new ApiError(400, 'invalid_key', KEY_PROBLEM_MESSAGES[problem])
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

/**
 * 读值并附带版本指纹（etag）。etag 取文件 mtimeMs 的字符串：
 * 内容相同则文件相同、写入会刷新 mtime，两标签同时读到同一版本时 etag 相同，
 * 其中一个写完后另一个再写就会拿到不同的 etag——正好做乐观并发的比对依据。
 * 文件不存在时返回 `{ value: null, etag: null }`。
 */
export async function readValueWithEtag(dataDir, key, scope) {
  const p = fileFor(dataDir, key, scope)
  try {
    const [value, stat] = await Promise.all([fs.readFile(p, 'utf8'), fs.stat(p)])
    return { value, etag: String(stat.mtimeMs) }
  } catch {
    return { value: null, etag: null }
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

/**
 * 带乐观并发版本检查的写入：仅当当前文件的 etag（mtimeMs）与传入 expectedEtag 一致时才写。
 * 不一致说明这份工程在别处被改过，抛 `code='EVERSION'` 错误，由路由层映射为 409 + reason='stale'。
 * expectedEtag 为 null/空串时跳过检查（等同普通 writeValue，向后兼容发布/草稿等不需版本检查的路径）。
 * 目标不存在而 expectedEtag 非空：也视为版本不匹配（客户端以为存在，实际已被删），同样抛 EVERSION。
 */
export async function writeValueIfMatch(dataDir, key, scope, value, expectedEtag) {
  if (!expectedEtag) {
    await writeFileAtomic(fileFor(dataDir, key, scope), value, 'utf8')
    return
  }
  const p = fileFor(dataDir, key, scope)
  let currentEtag
  try {
    const stat = await fs.stat(p)
    currentEtag = String(stat.mtimeMs)
  } catch (e) {
    if (e?.code === 'ENOENT') {
      /** @type {Error & { code?: string }} */
      const err = new Error('version mismatch: target missing')
      err.code = 'EVERSION'
      throw err
    }
    throw e
  }
  if (currentEtag !== String(expectedEtag)) {
    /** @type {Error & { code?: string }} */
    const err = new Error(`version mismatch: expected ${expectedEtag}, current ${currentEtag}`)
    err.code = 'EVERSION'
    throw err
  }
  await writeFileAtomic(p, value, 'utf8')
}

export async function removeValue(dataDir, key, scope) {
  // 自动草稿每 30 秒重写一次，正式保存后紧接着删最容易撞上 Windows 的句柄未释放（EPERM/EBUSY）；
  // force 只吞 ENOENT，不重试就是一条 500 打到前端
  await withTransientRetry(() => fs.rm(fileFor(dataDir, key, scope), { force: true }))
}

/**
 * 取当前文件的 etag（mtimeMs 字符串）。写入成功后调用，把新版本号回给前端，
 * 让前端 loadedEtag 推进到最新版本，下次保存仍能通过乐观并发检查。
 * 文件刚被并发删掉时返回 null。
 */
export async function statEtag(dataDir, key, scope) {
  try {
    const stat = await fs.stat(fileFor(dataDir, key, scope))
    return String(stat.mtimeMs)
  } catch {
    return null
  }
}
