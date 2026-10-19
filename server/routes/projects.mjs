/**
 * 工程列表摘要路由：GET /api/storage/projects。
 *
 * 与 /api/storage/keys 同级权限——请求已在 index.mjs 的鉴权之后分发，命名空间隔离由
 * scope 决定，这里只列出「当前用户自己的工程」，不额外要求 engineer 角色（读列表不需要写权限）。
 * 实现放在 lib/projectIndex.mjs，路由只做 HTTP 分发。
 */
import { buildProjectIndex } from '../lib/projectIndex.mjs'

/**
 * @returns {Promise<boolean>} 已响应为 true，未匹配为 false
 */
export async function handleProjects(ctx) {
  const { req, res, url, ok, dataDir, scope } = ctx

  if (url.pathname === '/api/storage/projects' && req.method === 'GET') {
    ok(res, req, 200, { projects: await buildProjectIndex(dataDir, scope) })
    return true
  }

  return false
}
