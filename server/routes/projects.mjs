/**
 * 工程列表摘要路由：GET /api/storage/projects?limit=&offset=&keyword=。
 *
 * 与 /api/storage/keys 同级权限——请求已在 index.mjs 的鉴权之后分发，命名空间隔离由
 * scope 决定，这里只列出「当前用户自己的工程」，不额外要求 engineer 角色（读列表不需要写权限）。
 * 分页/搜索/统计口径都在服务端算，见 lib/projectIndex.mjs 的 queryProjectIndex。
 *
 * 形状：当前页摘要列表进 data，全量统计（total/publishedTotal/matchedTotal）进 meta——
 * 统计描述的是「一共有多少」而非这一页，属于响应元信息。
 */
import { queryProjectIndex, clampProjectLimit } from '../lib/projectIndex.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleProjects(ctx) {
  const { req, url, send, dataDir, scope } = ctx

  if (url.pathname === '/api/storage/projects' && req.method === 'GET') {
    const keyword = url.searchParams.get('keyword') || ''
    const limit = clampProjectLimit(url.searchParams.get('limit'))
    const offsetParam = Number(url.searchParams.get('offset'))
    const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? Math.floor(offsetParam) : 0
    const { projects, total, publishedTotal, matchedTotal } = await queryProjectIndex(dataDir, scope, {
      keyword,
      limit,
      offset,
    })
    send(200, projects, { total, publishedTotal, matchedTotal })
    return true
  }

  return false
}
