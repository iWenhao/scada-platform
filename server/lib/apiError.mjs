/**
 * 服务端统一的 API 错误类型。
 *
 * 存在的理由：改造前失败信息只有一条自由文本（`{ error: 'exists' }` / `'用户名或口令错误'`），
 * 客户端要判断「是撞名还是版本旧」只能比对文案——改一句提示语就改了并发语义，
 * 而这类改动不会被类型检查或单测拦下。这里把机器可读的 code 与给人读的 message 拆开：
 * 客户端只比对 code，message 随便改文案都不影响逻辑。
 *
 * 约定：
 *   - status：HTTP 状态码，成败的唯一判据（响应体里不再重复放 ok 字段）
 *   - code：稳定英文小写下划线码，前端按它分支，新增码要同时更新前端 ApiRequestError
 *   - message：中文，直接展示给用户；不参与任何逻辑判断
 *   - meta：可选的补充上下文（如失败的通道 id/name），原样放进响应的 error.meta
 *
 * 服务层（auth.mjs 等）也抛这个类型，由 index.mjs 的顶层 catch 统一翻译成响应体，
 * 路由里不再各自判断返回值里有没有 error 字段。
 */
export class ApiError extends Error {
  /**
   * @param {number} status  HTTP 状态码
   * @param {string} code    机器可读错误码
   * @param {string} message 给人看的中文说明
   * @param {object} [meta]  附加上下文
   */
  constructor(status, code, message, meta) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.meta = meta
  }
}

/** 400 参数/负载不合法 */
export function badRequest(code, message, meta) {
  return new ApiError(400, code, message, meta)
}

/** 401 未鉴权（登录失败与无 token 共用，不区分原因以免枚举账号） */
export function unauthorized(message = '请先登录') {
  return new ApiError(401, 'unauthorized', message)
}

/** 403 角色不足 */
export function forbidden(message = '当前角色无权执行该操作') {
  return new ApiError(403, 'forbidden', message)
}

/** 404 路由或资源不存在 */
export function notFound(message = '接口不存在') {
  return new ApiError(404, 'not_found', message)
}

/** 409 与已有状态冲突（重名、版本已旧） */
export function conflict(code, message, meta) {
  return new ApiError(409, code, message, meta)
}
