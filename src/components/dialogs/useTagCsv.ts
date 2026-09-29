import { parseTagCsv, tagsToCsv, tagKey, type TagDef } from '@/types/tag'

/**
 * 点表 CSV 导入导出：合并策略为同 key 覆盖。
 */
export function mergeTags(current: TagDef[], incoming: TagDef[]): TagDef[] {
  const map = new Map<string, TagDef>()
  for (const t of current) map.set(tagKey(t), t)
  for (const t of incoming) map.set(tagKey(t), t)
  return [...map.values()]
}

export function parseTagsFromCsv(text: string): TagDef[] {
  return parseTagCsv(text)
}

export function exportTagsCsv(tags: TagDef[], projectName: string): void {
  const csv = tagsToCsv(tags)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName}-点表.csv`
  a.click()
  URL.revokeObjectURL(url)
}
