/**
 * 写值/系统审计（JSONL 追加，操作者由路由层从会话注入）。
 * 读写复用 lib/jsonl.mjs，与通知日志同格式。
 */
import path from 'node:path'
import { appendJsonl, readJsonl } from './jsonl.mjs'

export function auditFilePath(dataDir) {
  return path.join(dataDir, '_audit.jsonl')
}

/** 追加一条审计记录（审计不截断，保留完整追溯链） */
export async function appendAudit(dataDir, entry) {
  await appendJsonl(auditFilePath(dataDir), entry)
}

/**
 * 读取最近 limit 条审计（新→旧）。
 */
export async function readAudit(dataDir, limit = 100) {
  return readJsonl(auditFilePath(dataDir), limit)
}
