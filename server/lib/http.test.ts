// @vitest-environment node
/**
 * HTTP 门禁层：CORS、Bearer 解析、请求体上限、角色判定、统一响应体形状。
 * 这些是「谁能进来、能进到哪、回来长什么样」的唯一判口，路由层直接依赖，所以逐条钉死。
 */
import { describe, expect, it } from 'vitest'
import { roleAtLeast } from '../auth.mjs'
import { ApiError } from './apiError.mjs'
import {
  authenticateRequest,
  bearer,
  errorEnvelope,
  makeCorsHeaders,
  readBody,
  requireRole,
  sendData,
  sendFail,
  sendJson,
  successEnvelope,
} from './http.mjs'

/** 造一个记录 headers、体可被 for-await 逐块读出的假请求 */
function fakeReq(headers = {}, chunks = []) {
  return {
    headers,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
}

/** 造一个记录写入参的假响应 */
function fakeRes() {
  const res = { status: 0, headers: {}, body: '', ended: false }
  res.writeHead = (status, headers) => {
    res.status = status
    res.headers = headers
    return res
  }
  res.end = (body) => {
    res.body = body
    res.ended = true
  }
  return res
}

describe('makeCorsHeaders', () => {
  it('CORS_ORIGIN=* 时对任意来源放行，并且不带 Vary', () => {
    const cors = makeCorsHeaders('*')
    const h = cors(fakeReq({ origin: 'https://anywhere.example' }))
    expect(h['access-control-allow-origin']).toBe('*')
    expect(h['access-control-allow-headers']).toContain('authorization')
    expect(h.vary).toBeUndefined()
    expect(cors(fakeReq({})).vary).toBeUndefined()
  })

  it('白名单模式下回显命中的来源并加 Vary: Origin', () => {
    const cors = makeCorsHeaders('https://a.example, https://b.example')
    expect(cors(fakeReq({ origin: 'https://b.example' }))['access-control-allow-origin']).toBe('https://b.example')
    expect(cors(fakeReq({ origin: 'https://b.example' })).vary).toBe('Origin')
  })

  it('未命中的来源拿不到自己的域名，只会得到白名单首项（浏览器据此判定并拦截）', () => {
    const cors = makeCorsHeaders('https://a.example')
    const h = cors(fakeReq({ origin: 'https://evil.example' }))
    expect(h['access-control-allow-origin']).not.toBe('https://evil.example')
    expect(h['access-control-allow-origin']).toBe('https://a.example')
    expect(cors(fakeReq({ origin: 'nope' })).vary).toBe('Origin')
  })

  it('空配置不产出半个来源头', () => {
    expect(makeCorsHeaders('')(fakeReq({ origin: 'https://a.example' }))).toMatchObject({
      'access-control-allow-origin': '',
    })
  })
})

describe('bearer 与 readBody', () => {
  it('只认 Bearer 前缀（大小写敏感），其余一律当未登录', () => {
    expect(bearer(fakeReq({ authorization: 'Bearer tk_1' }))).toBe('tk_1')
    expect(bearer(fakeReq({ authorization: 'Bearer  tk_1  ' }))).toBe('tk_1')
    expect(bearer(fakeReq({ authorization: 'bearer tk_1' }))).toBe('')
    expect(bearer(fakeReq({ authorization: 'Basic tk_1' }))).toBe('')
    expect(bearer(fakeReq({}))).toBe('')
  })

  it('分块请求体先拼接再解码，跨块的中文不会变成乱码', async () => {
    const buf = Buffer.from('{"名称":"水泵"}', 'utf8')
    const chunks = [buf.subarray(0, 12), buf.subarray(12)]
    expect(await readBody(fakeReq({}, chunks), 1024)).toBe('{"名称":"水泵"}')
    expect(await readBody(fakeReq({}, []), 1024)).toBe('')
  })

  it('超过上限抛 413 的 payload_too_large，客户端按 code 分支、按 message 展示', async () => {
    const big = Buffer.alloc(64, 0x61)
    await expect(readBody(fakeReq({}, [big, big]), 100)).rejects.toMatchObject({
      status: 413,
      code: 'payload_too_large',
      message: '请求体超过上限 100 字节',
    })
    // 按上限量级选单位：KB/MB 级的上限不该报成「1048576 字节」这种看不懂的数字
    await expect(readBody(fakeReq({}, [Buffer.alloc(2 * 1024)]), 1024)).rejects.toMatchObject({
      message: '请求体超过上限 1 KB',
    })
    await expect(readBody(fakeReq({}, [Buffer.alloc(2 * 1024 * 1024)]), 1024 * 1024)).rejects.toMatchObject({
      message: '请求体超过上限 1 MB',
    })
    // 恰好等于上限放行：边界是「超过」而不是「达到」
    await expect(readBody(fakeReq({}, [big, big]), 128)).resolves.toHaveLength(128)
  })
})

describe('authenticateRequest', () => {
  const sessionUser = { id: 'usr_1', role: 'engineer' }
  const auth = { resolveToken: (t) => (t === 'tk_session' ? sessionUser : null) }

  it('会话令牌换回用户，主密钥换回 master 标记', () => {
    const opts = { auth, authToken: 'master-key' }
    expect(authenticateRequest(fakeReq({ authorization: 'Bearer tk_session' }), opts)).toEqual({
      user: sessionUser,
      master: false,
    })
    expect(authenticateRequest(fakeReq({ authorization: 'Bearer master-key' }), opts)).toEqual({
      user: null,
      master: true,
    })
  })

  it('无令牌、错令牌一律拒绝；未配置主密钥时不把空串当密钥', () => {
    expect(authenticateRequest(fakeReq({}), { auth, authToken: 'master-key' })).toBeNull()
    expect(authenticateRequest(fakeReq({ authorization: 'Bearer nope' }), { auth, authToken: 'master-key' })).toBeNull()
    expect(authenticateRequest(fakeReq({}), { auth, authToken: '' })).toBeNull()
  })
})

describe('requireRole', () => {
  it('主密钥视为最高权限，未登录直接拒绝', () => {
    expect(requireRole({ master: true, user: null }, 'admin', roleAtLeast)).toBe(true)
    expect(requireRole(null, 'viewer', roleAtLeast)).toBe(false)
  })

  it('按用户角色判定，角色被改小后立刻掉级', () => {
    expect(requireRole({ master: false, user: { role: 'engineer' } }, 'operator', roleAtLeast)).toBe(true)
    expect(requireRole({ master: false, user: { role: 'viewer' } }, 'operator', roleAtLeast)).toBe(false)
  })
})

describe('sendJson', () => {
  it('带上 CORS 头与 UTF-8 content-type，正文一次性序列化', () => {
    const res = fakeRes()
    const req = fakeReq({ origin: 'https://a.example' })
    sendJson(res, req, 201, { ok: true, 名称: '水泵' }, makeCorsHeaders('https://a.example'))
    expect(res.status).toBe(201)
    expect(res.headers['content-type']).toContain('charset=utf-8')
    expect(res.headers['access-control-allow-origin']).toBe('https://a.example')
    expect(res.ended).toBe(true)
    expect(JSON.parse(res.body)).toEqual({ ok: true, 名称: '水泵' })
  })
})

describe('响应体形状（全服务唯一的两种形状）', () => {
  const cors = makeCorsHeaders('https://a.example')

  it('successEnvelope：data 恒为键，空 meta 整个省略', () => {
    expect(successEnvelope(null)).toEqual({ data: null })
    expect(successEnvelope(undefined)).toEqual({ data: null })
    expect(successEnvelope('abc', { etag: null })).toEqual({ data: 'abc', meta: { etag: null } })
    expect(successEnvelope('abc', {})).toEqual({ data: 'abc' })
  })

  it('errorEnvelope：code 与 message 分离，meta 只在有内容时出现', () => {
    expect(errorEnvelope('version_stale', '该工程在别处已被修改')).toEqual({
      error: { code: 'version_stale', message: '该工程在别处已被修改' },
    })
    expect(errorEnvelope('channel_send_failed', '超时', { id: 'ch_1' }).error.meta).toEqual({ id: 'ch_1' })
    expect(errorEnvelope('forbidden', '无权', {}).error.meta).toBeUndefined()
  })

  it('sendData / sendFail 与 sendJson 同一条出口：状态码 + CORS + UTF-8', () => {
    const req = fakeReq({ origin: 'https://a.example' })

    const okRes = fakeRes()
    sendData(okRes, req, 200, { 名称: '水泵' }, { total: 3 }, cors)
    expect(okRes.status).toBe(200)
    expect(JSON.parse(okRes.body)).toEqual({ data: { 名称: '水泵' }, meta: { total: 3 } })

    const failRes = fakeRes()
    sendFail(failRes, req, 401, 'unauthorized', '请先登录', undefined, cors)
    expect(failRes.status).toBe(401)
    expect(JSON.parse(failRes.body)).toEqual({ error: { code: 'unauthorized', message: '请先登录' } })
    expect(failRes.headers['access-control-allow-origin']).toBe('https://a.example')
  })

  it('ApiError 带 status/code/message/meta，顶层 catch 据此出形状（不靠文案判断）', () => {
    const e = new ApiError(409, 'key_exists', '该名称已存在', { key: 'a' })
    expect(e).toBeInstanceOf(Error)
    expect({ status: e.status, code: e.code, message: e.message, meta: e.meta }).toEqual({
      status: 409,
      code: 'key_exists',
      message: '该名称已存在',
      meta: { key: 'a' },
    })
  })
})
