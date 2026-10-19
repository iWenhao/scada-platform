import { resolveApiBase } from '@/storage/config'
import { authHeaders } from '@/auth/session'

/**
 * 后端 API 统一客户端。
 *
 * 服务端所有接口的响应体只有两种形状（见 server/lib/http.mjs）：
 *   成功 2xx → { data, meta? }
 *   失败     → { error: { code, message, meta? } }
 * 这里把「拼 URL + 带鉴权头 + 拆信封 + 把非 2xx 变成异常」收成一处，
 * 调用方只关心 data 与 code。
 *
 * 为什么按 code 而不是按 message 分支：message 是给人看的中文，改措辞不该改逻辑。
 * 改造前 RemoteStorageAdapter 判的是 `body.error === 'stale'`，一句文案改动就能把
 * 「版本冲突」误判成「撞名」，而类型检查和单测都拦不住。
 */

/** 与 server/lib/apiError.mjs 对齐的失败码；服务端新增码时同步补这里 */
export type ApiErrorCode =
  | 'unauthorized'
  | 'login_failed'
  | 'forbidden'
  | 'not_found'
  | 'invalid_json'
  | 'invalid_key'
  | 'invalid_payload'
  | 'invalid_user'
  | 'invalid_role'
  | 'username_exists'
  | 'user_not_found'
  | 'last_admin'
  | 'password_too_short'
  | 'old_password_incorrect'
  | 'master_no_password'
  | 'missing_id'
  | 'key_exists'
  | 'version_stale'
  | 'channel_not_found'
  | 'channel_send_failed'
  | 'payload_too_large'
  | 'internal_error'
  | 'bad_request'
  /** 非本服务形状的失败（代理返回的 HTML、后端未启动等） */
  | 'http_error'

/** 服务端一次成功响应的拆解结果 */
export interface ApiResult<T> {
  /** 负载本体；服务端保证该键存在（可能是 null） */
  data: T
  /** 附属信息：etag、分页统计、写入条数等 */
  meta: Record<string, unknown>
}

/** 非 2xx 响应对应的异常：调用方按 code 分支，message 可直接展示给用户 */
export class ApiRequestError extends Error {
  status: number
  code: ApiErrorCode
  meta?: Record<string, unknown>

  constructor(status: number, code: ApiErrorCode, message: string, meta?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.meta = meta
  }

  /** 是否为指定失败码（比 code 字符串散在各处好核对，也让服务端加码时这里唯一一处要改） */
  static is(err: unknown, code: ApiErrorCode): err is ApiRequestError {
    return err instanceof ApiRequestError && err.code === code
  }
}

export interface ApiFetchInit extends RequestInit {
  /** API 根路径覆盖（RemoteStorageAdapter 允许注入自定义 base 时使用），默认 resolveApiBase() */
  base?: string
}

/**
 * 请求并按统一形状拆解响应。
 * 失败（非 2xx 或响应体不是合法信封）抛 ApiRequestError；网络不可达仍抛原生 TypeError，
 * 调用方据此区分「后端挂了」与「服务端明确拒绝」。
 */
export async function apiFetch<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<ApiResult<T>> {
  const { base, ...requestInit } = init
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(requestInit.body ? { 'content-type': 'application/json' } : {}),
  }

  const res = await fetch(`${base ?? resolveApiBase()}${path}`, {
    ...requestInit,
    headers: { ...headers, ...(requestInit.headers as Record<string, string> | undefined) },
  })

  const body = (await res.json().catch(() => null)) as {
    data?: unknown
    meta?: Record<string, unknown>
    error?: { code?: string; message?: string; meta?: Record<string, unknown> }
  } | null

  if (!res.ok) {
    const error = body?.error
    throw new ApiRequestError(
      res.status,
      (error?.code as ApiErrorCode) ?? 'http_error',
      // 没有信封时（反向代页返回 HTML、进程刚崩）回落状态码，至少用户看得出出了什么
      error?.message || `请求失败（HTTP ${res.status}）`,
      error?.meta,
    )
  }

  return { data: (body?.data ?? null) as T, meta: body?.meta ?? {} }
}

/** 只要 data 的简写：调用方不关心 meta 时用，省一层解构 */
export async function apiData<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<T> {
  return (await apiFetch<T>(path, init)).data
}
