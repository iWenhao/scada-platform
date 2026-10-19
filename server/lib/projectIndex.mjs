/**
 * 工程列表索引：把首页「最近项目」所需的摘要在服务端一次算好。
 *
 * 存在的理由：远程存储下前端原先对每个工程发 3 次 GET，且每次都拉回**整份**工作副本 /
 * 发布快照 JSON，只为读一个时间戳和画面数——项目一多就是 3N 个网络往返 + 全量配置传输。
 * 这里改成一次请求返回全部摘要：磁盘读与解析放在服务端（本地、几乎零成本），
 * 网络上只走紧凑的 { name, timestamp, pageCount, publishedAt, hasThumbnail }。
 *
 * 这是存储层里唯一「懂工程 JSON 结构」的地方——只抽 timestamp 与 pages.length 两个字段，
 * 不做校验、不解释其余内容。三个前缀常量与前端保持一致（改动需两边同步）：
 *   projectStorage.ts(projectKey) / projectPublish.ts(publishedKey) / thumbnail.ts(thumbKey)。
 */
import { listKeys, readValue } from './kv.mjs'

/** 工作副本键前缀（与前端 projectKey 对齐） */
export const PROJECT_PREFIX = 'scada_project_'
/** 发布快照键前缀（与前端 publishedKey 对齐） */
export const PUBLISHED_PREFIX = 'scada_published_'
/** 缩略图键前缀（与前端 thumbKey 对齐） */
export const THUMB_PREFIX = 'scada_thumb_'

/** 安全解析成对象：缺失、坏 JSON、非对象都返回 null，不让单个坏文件把整张列表打成 500 */
function parseObj(raw) {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

/**
 * 构建某命名空间下的工程摘要列表，按修改时间倒序。
 * 只统计有工作副本键的工程（与前端 listSavedProjects 口径一致）；草稿/缩略图/发布快照
 * 不单独成项，仅作为对应工程的一个字段。
 *
 * @param {string} dataDir 数据根目录
 * @param {string} scope   当前请求的命名空间（多用户隔离由调用方 scopeOf 得出）
 * @returns {Promise<Array<{name: string, timestamp: number, pageCount: number, publishedAt: number|null, hasThumbnail: boolean}>>}
 */
export async function buildProjectIndex(dataDir, scope) {
  const keys = await listKeys(dataDir, scope)
  // hasThumbnail 只做「键是否存在」判断，用集合命中，避免为每张卡片再读一次文件内容
  const keySet = new Set(keys)
  const names = keys
    .filter(k => k.startsWith(PROJECT_PREFIX))
    .map(k => k.slice(PROJECT_PREFIX.length))

  const rows = await Promise.all(
    names.map(async name => {
      const data = parseObj(await readValue(dataDir, PROJECT_PREFIX + name, scope))
      const pub = parseObj(await readValue(dataDir, PUBLISHED_PREFIX + name, scope))
      return {
        name,
        timestamp: Number(data?.timestamp) || 0,
        pageCount: Array.isArray(data?.pages) ? data.pages.length : 1,
        // 与前端 parsePublishedAt 同口径：优先 publishedAt，回落工作副本时间戳，都没有则未发布
        publishedAt: pub ? Number(pub.publishedAt) || Number(pub.timestamp) || null : null,
        hasThumbnail: keySet.has(THUMB_PREFIX + name),
      }
    }),
  )

  rows.sort((a, b) => b.timestamp - a.timestamp)
  return rows
}

/** 首页每页条数默认值与上限（上限挡住客户端传超大 limit 变相拉全量） */
export const DEFAULT_PROJECT_PAGE_SIZE = 12
export const MAX_PROJECT_PAGE_SIZE = 100

/** 把客户端传来的 limit 夹到 [1, MAX]；非法/缺省回落默认值 */
export function clampProjectLimit(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PROJECT_PAGE_SIZE
  return Math.min(Math.floor(n), MAX_PROJECT_PAGE_SIZE)
}

/** 关键词匹配：大小写不敏感的子串命中项目名（与前端原客户端过滤同口径，改名搬到服务端后行为不变） */
function matchesKeyword(name, kw) {
  return name.toLowerCase().includes(kw.toLowerCase())
}

/**
 * 分页 + 搜索查询：一次返回某一页的工程摘要，以及**全量准确**的统计口径。
 *
 * 服务端仍要读遍全部工作副本才能算出总数、发布数并按时间排序（磁盘读、本地、几乎零成本），
 * 但网络上只下发当前页；total / publishedTotal / matchedTotal 让前端的统计卡与
 * 「匹配 N / M」在有/无关键词时都精确，不受分页影响。
 *
 * @param {string} dataDir
 * @param {string} scope
 * @param {{ keyword?: string, limit?: number, offset?: number }} [opts]
 * @returns {Promise<{ projects: Array, total: number, publishedTotal: number, matchedTotal: number }>}
 */
export async function queryProjectIndex(dataDir, scope, opts = {}) {
  const { keyword = '', limit = DEFAULT_PROJECT_PAGE_SIZE, offset = 0 } = opts
  const all = await buildProjectIndex(dataDir, scope)
  const kw = String(keyword).trim()
  // 统计始终基于全量（total/publishedTotal 不随关键词变，是「我一共有多少」）
  const total = all.length
  const publishedTotal = all.reduce((n, r) => (r.publishedAt ? n + 1 : n), 0)
  const matched = kw ? all.filter(r => matchesKeyword(r.name, kw)) : all
  const start = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0
  return {
    projects: matched.slice(start, start + limit),
    total,
    publishedTotal,
    matchedTotal: matched.length,
  }
}
