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
