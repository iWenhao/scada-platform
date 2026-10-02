/**
 * JSONL（按行 JSON）文件读写共用工具。
 * 审计日志（lib/audit.mjs）与通知日志（notify/common.mjs）是同一格式，
 * 读/追加/截断逻辑集中在这里，避免两套逐字相同的实现。
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * 读取 JSONL 文件的最近 limit 条记录（新→旧）。
 * 单行损坏静默跳过；文件不存在或不可读时返回空数组。
 */
export async function readJsonl(filePath, limit = 100) {
  try {
    const text = await fs.readFile(filePath, 'utf8')
    const rows = []
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        rows.push(JSON.parse(line))
      } catch {
        // 单行损坏不影响整体读取
      }
    }
    return rows.slice(-Math.max(1, limit)).reverse()
  } catch {
    return []
  }
}

/**
 * 追加一条 JSON 记录；cap > 0 时追加后把文件截断到最近 cap 条，
 * 防止日志文件随运行无限膨胀（审计日志不传 cap 即不截断）。
 */
export async function appendJsonl(filePath, entry, { cap = 0 } = {}) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.appendFile(filePath, JSON.stringify(entry) + '\n', 'utf8')
  if (cap > 0) {
    try {
      const text = await fs.readFile(filePath, 'utf8')
      const rows = text.split('\n').filter(Boolean)
      if (rows.length > cap) {
        await fs.writeFile(filePath, rows.slice(-cap).join('\n') + '\n', 'utf8')
      }
    } catch {
      // 截断失败不影响追加结果，下条记录写入时会再尝试
    }
  }
}
