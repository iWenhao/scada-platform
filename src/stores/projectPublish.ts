/**
 * 发布快照键与时间解析（与工程 KV 同存储）。
 * 工作副本: scada_project_<name>  发布版: scada_published_<name>
 */
export function publishedKey(name: string): string {
  return `scada_published_${name}`
}

export function projectKey(name: string): string {
  return `scada_project_${name}`
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
