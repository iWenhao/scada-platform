/**
 * 写值/系统审计（JSONL 追加，操作者由路由层从会话注入）。
 */
import path from 'node:path'
import { promises as fs } from 'node:fs'

export function auditFilePath(dataDir) {
  return path.join(dataDir, '_audit.jsonl')
}

/** 追加一条审计记录 */
export async function appendAudit(dataDir, entry) {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.appendFile(auditFilePath(dataDir), JSON.stringify(entry) + '\n', 'utf8')
}

/**
 * 读取最近 limit 条审计（新→旧）。
 */
export async function readAudit(dataDir, limit = 100) {
  try {
    const text = await fs.readFile(auditFilePath(dataDir), 'utf8')
    const rows = []
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        rows.push(JSON.parse(line))
      } catch {
        // skip
      }
    }
    return rows.slice(-limit).reverse()
  } catch {
    return []
  }
}
