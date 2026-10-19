/**
 * 键值存储路由（按用户隔离）+ 站点品牌写入。
 * 品牌读取在 routes/public.mjs（未鉴权也要能读）。
 *
 * 并发相关的两种 409 用 code 区分（key_exists / version_stale），前端只比 code——
 * 改造前它比对的是 body.error 的文本，改一句中文提示就能把「版本冲突」判成「撞名」。
 */
import { readBody } from '../lib/http.mjs'
import { conflict } from '../lib/apiError.mjs'
import {
  listKeys,
  readValueWithEtag,
  writeValue,
  writeValueIfAbsent,
  writeValueIfMatch,
  removeValue,
  statEtag,
  assertKey,
  GLOBAL_SCOPE,
  SITE_BRANDING_KEY,
} from '../lib/kv.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleStorage(ctx) {
  const { req, url, send, guard, dataDir, scope, maxBodyBytes } = ctx

  if ((url.pathname === '/api/keys' || url.pathname === '/api/storage/keys') && req.method === 'GET') {
    send(200, await listKeys(dataDir, scope))
    return true
  }

  if (url.pathname === '/api/storage/get' && req.method === 'GET') {
    const key = url.searchParams.get('key')
    assertKey(key)
    // 带上 etag（文件 mtimeMs）：前端保存时回传做乐观并发的版本比对，避免两标签后写覆盖先写
    const { value, etag } = await readValueWithEtag(dataDir, key, scope)
    send(200, value, { etag })
    return true
  }

  if (url.pathname === '/api/storage/set' && req.method === 'PUT') {
    guard('engineer')
    const key = url.searchParams.get('key')
    assertKey(key)
    const body = await readBody(req, maxBodyBytes)
    // mode=create：把「判重」从客户端挪到服务端一次原子写，消掉 read-check-write 竞态。
    // 目标已存在时 writeValueIfAbsent 抛 EEXIST → 409 key_exists，前端据此走改名提示。
    if (url.searchParams.get('mode') === 'create') {
      try {
        await writeValueIfAbsent(dataDir, key, scope, body)
      } catch (e) {
        if (e?.code === 'EEXIST') throw conflict('key_exists', '该名称已存在，未覆盖')
        throw e
      }
    } else if (url.searchParams.has('ifMatch')) {
      // 乐观并发：仅当文件当前 etag 与客户端读到的版本一致时才写；
      // 不一致说明这份工程在别处被改过，回 409 version_stale，前端提示刷新后再继续。
      try {
        await writeValueIfMatch(dataDir, key, scope, body, url.searchParams.get('ifMatch'))
      } catch (e) {
        if (e?.code === 'EVERSION') {
          throw conflict('version_stale', '该工程在别处已被修改，请刷新载入最新版本后再保存')
        }
        throw e
      }
    } else {
      await writeValue(dataDir, key, scope, body)
    }
    // 写入成功后把新版本 etag 放在 meta 回给前端，推进其 loadedEtag，下次保存仍通过乐观并发检查
    send(200, null, { etag: await statEtag(dataDir, key, scope) })
    return true
  }

  if (url.pathname === '/api/storage/remove' && req.method === 'DELETE') {
    guard('engineer')
    const key = url.searchParams.get('key')
    assertKey(key)
    await removeValue(dataDir, key, scope)
    send(200, null)
    return true
  }

  // 站点品牌写入影响整个部署，权限提高到 admin（普通 KV 键 engineer 即可写）。
  // 品牌负载含图标 data URL（前端已缩放为 256×256 PNG），512KB 上限足够。
  if (url.pathname === '/api/branding' && req.method === 'PUT') {
    guard('admin')
    await writeValue(dataDir, SITE_BRANDING_KEY, GLOBAL_SCOPE, await readBody(req, 512 * 1024))
    send(200, null)
    return true
  }

  return false
}
