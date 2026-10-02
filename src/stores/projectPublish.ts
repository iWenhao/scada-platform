/**
 * 发布快照键与时间解析（与工程 KV 同存储）。
 * 工作副本键 projectKey 统一定义在 projectStorage.ts，这里只管发布侧。
 */
export function publishedKey(name: string): string {
  return `scada_published_${name}`
}

export function parsePublishedAt(raw: string | null): number | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    return data.publishedAt || data.timestamp || null
  } catch {
    return null
  }
}
