/**
 * 键值存储路由（按用户隔离）+ 站点品牌写入。
 * 品牌读取在 routes/public.mjs（未鉴权也要能读）。
 */
import { readBody, requireRole } from '../lib/http.mjs'
import { roleAtLeast } from '../auth.mjs'
import {
  listKeys,
  readValueWithEtag,
  writeValue,
  writeValueIfAbsent,
  writeValueIfMatch,
  removeValue,
  statEtag,
  keyError,
  GLOBAL_SCOPE,
  SITE_BRANDING_KEY,
} from '../lib/kv.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleStorage(ctx) {
  const { req, res, url, ok, authn, dataDir, scope, maxBodyBytes } = ctx

  if ((url.pathname === '/api/keys' || url.pathname === '/api/storage/keys') && req.method === 'GET') {
    ok(res, req, 200, { keys: await listKeys(dataDir, scope) })
    return true
  }

  if (url.pathname === '/api/storage/get' && req.method === 'GET') {
    const key = url.searchParams.get('key')
    // 一并挡住超长键：不拦的话 fs 会抛 ENAMETOOLONG，客户端只看到一条无意义的 500
    const bad = keyError(key)
    if (bad) {
      ok(res, req, 400, { error: bad })
      return true
    }
    // 带上 etag（文件 mtimeMs）：前端保存时回传做乐观并发的版本比对，避免两标签后写覆盖先写
    const { value, etag } = await readValueWithEtag(dataDir, key, scope)
    ok(res, req, 200, { value, etag })
    return true
  }

  if (url.pathname === '/api/storage/set' && req.method === 'PUT') {
    if (!requireRole(authn, 'engineer', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    const key = url.searchParams.get('key')
    // 一并挡住超长键：不拦的话 fs 会抛 ENAMETOOLONG，客户端只看到一条无意义的 500
    const bad = keyError(key)
    if (bad) {
      ok(res, req, 400, { error: bad })
      return true
    }
    const body = await readBody(req, maxBodyBytes)
    // mode=create：把「判重」从客户端挪到服务端一次原子写，消掉 read-check-write 竞态。
    // 目标已存在时 writeValueIfAbsent 抛 EEXIST → 回 409，前端据此走改名提示。
    if (url.searchParams.get('mode') === 'create') {
      try {
        await writeValueIfAbsent(dataDir, key, scope, body)
      } catch (e) {
        if (e?.code === 'EEXIST') {
          ok(res, req, 409, { error: 'exists' })
          return true
        }
        throw e
      }
    } else if (url.searchParams.has('ifMatch')) {
      // 乐观并发：仅当文件当前 etag 与客户端读到的版本一致时才写；
      // 不一致说明这份工程在别处被改过，回 409 + reason=stale，前端提示刷新后再继续。
      try {
        await writeValueIfMatch(dataDir, key, scope, body, url.searchParams.get('ifMatch'))
      } catch (e) {
        if (e?.code === 'EVERSION') {
          ok(res, req, 409, { error: 'stale' })
          return true
        }
        throw e
      }
    } else {
      await writeValue(dataDir, key, scope, body)
    }
    // 写入成功后把新版本 etag 回给前端，推进其 loadedEtag，下次保存仍通过乐观并发检查
    ok(res, req, 200, { ok: true, etag: await statEtag(dataDir, key, scope) })
    return true
  }

  if (url.pathname === '/api/storage/remove' && req.method === 'DELETE') {
    if (!requireRole(authn, 'engineer', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    const key = url.searchParams.get('key')
    // 一并挡住超长键：不拦的话 fs 会抛 ENAMETOOLONG，客户端只看到一条无意义的 500
    const bad = keyError(key)
    if (bad) {
      ok(res, req, 400, { error: bad })
      return true
    }
    await removeValue(dataDir, key, scope)
    ok(res, req, 200, { ok: true })
    return true
  }

  // 站点品牌写入影响整个部署，权限提高到 admin（普通 KV 键 engineer 即可写）。
  // 品牌负载含图标 data URL（前端已缩放为 256×256 PNG），512KB 上限足够。
  if (url.pathname === '/api/branding' && req.method === 'PUT') {
    if (!requireRole(authn, 'admin', roleAtLeast)) {
      ok(res, req, 403, { error: 'forbidden' })
      return true
    }
    await writeValue(dataDir, SITE_BRANDING_KEY, GLOBAL_SCOPE, await readBody(req, 512 * 1024))
    ok(res, req, 200, { ok: true })
    return true
  }

  return false
}
