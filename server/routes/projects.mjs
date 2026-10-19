/**
 * 工程列表摘要路由：GET /api/storage/projects?limit=&offset=&keyword=。
 *
 * 与 /api/storage/keys 同级权限——请求已在 index.mjs 的鉴权之后分发，命名空间隔离由
 * scope 决定，这里只列出「当前用户自己的工程」，不额外要求 engineer 角色（读列表不需要写权限）。
 * 分页/搜索/统计口径都在服务端算，见 lib/projectIndex.mjs 的 queryProjectIndex。
 */
import { queryProjectIndex, clampProjectLimit } from '../lib/projectIndex.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleProjects(ctx) {
  const { req, res, url, ok, dataDir, scope } = ctx

  if (url.pathname === '/api/storage/projects' && req.method === 'GET') {
    const keyword = url.searchParams.get('keyword') || ''
    const limit = clampProjectLimit(url.searchParams.get('limit'))
    const offsetParam = Number(url.searchParams.get('offset'))
    const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? Math.floor(offsetParam) : 0
    ok(res, req, 200, await queryProjectIndex(dataDir, scope, { keyword, limit, offset }))
    return true
  }

  return false
}
