#!/usr/bin/env node
/**
 * 统计 src/** 与 server/** 下源码文件行数，列出超过各自阈值的文件。
 *
 * 用途：AGENTS.md「收尾硬性检查」要求的自检脚本；由 scripts/pre-push-check.mjs 在推送前调用。
 * 阈值按文件类型区分（与 AGENTS.md 约定一致）：
 *   *.vue / *.ts / *.mjs : 400 行
 *   *.scss              : 500 行
 * 数据/图标定义类长文件（src/industrial/** 组件目录）属例外——命中例外的文件不参与门槛，
 * 只在末尾报出跳过数量：例外必须可见，不能变成静默豁免。
 *
 * 跨平台：本脚本是 Node 实现（原 check-long-files.ps1 只在装了 PowerShell 的 Windows 上能跑，
 * Mac/Linux 的 pre-push 会 spawn `powershell` 拿 ENOENT 中止推送）。
 *
 * 计数口径（与原 .ps1 的 [System.IO.File]::ReadAllLines().Count 严格对齐）：
 *   按 \n 切分后计数；文件末尾的换号符不产生额外空行。CRLF 文件里行尾的 \r 留在行内容里，
 *   不影响行数——本仓库行尾本就混用（industrial/** 是 CRLF、新写的画布文件是 LF），
 *   两种都必须算准。不要换成 `wc -l`：它数的是换行符个数，末行无换行时少算 1，
 *   且对空行/LF 文件的失真实测可达 3~25 行，会让贴近阈值的文件静默通过。
 *
 * 用法（在仓库根目录执行）：
 *   node scripts/check-long-files.mjs
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 钩子的 cwd 不保证是仓库根，按自身位置解析（scripts/ 的上一级）
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 扩展名 -> 行数阈值 */
const LIMITS = { '.vue': 400, '.ts': 400, '.mjs': 400, '.scss': 500 }
/** 要统计的根目录（相对仓库根） */
const ROOTS = ['src', 'server']
/** 例外前缀（相对仓库根、正斜杠）：数据/图标定义类长文件不按逻辑文件处理 */
const EXEMPT_PREFIXES = ['src/industrial/']

/** 递归收集目录下所有匹配扩展名的文件，返回相对仓库根的正斜杠路径 */
function walk(dirRoot, relBase = '') {
  const out = []
  for (const name of readdirSync(dirRoot)) {
    const abs = path.join(dirRoot, name)
    const rel = (relBase ? relBase + '/' : '') + name
    const st = statSync(abs)
    if (st.isDirectory()) {
      out.push(...walk(abs, rel))
    } else if (LIMITS[path.extname(name)]) {
      out.push(rel)
    }
  }
  return out
}

/** 与行尾风格无关的行数统计：CRLF 与 LF 算出来一致，末尾换行不增行 */
function countLines(fileAbs) {
  const content = readFileSync(fileAbs, 'utf8')
  // 以换行结尾时 split 会多出一个末尾空串，不计入行数（与 ReadAllLines 同口径）
  return content.endsWith('\n') ? content.split('\n').length - 1 : content.split('\n').length
}

let skipped = 0
const overLimit = []

for (const rel of ROOTS) {
  const absRoot = path.join(repoRoot, rel)
  if (!existsSync(absRoot)) continue
  for (const relPath of walk(absRoot, rel)) {
    if (EXEMPT_PREFIXES.some(p => relPath.startsWith(p))) {
      skipped++
      continue
    }
    const lines = countLines(path.join(repoRoot, relPath))
    const limit = LIMITS[path.extname(relPath)]
    if (lines > limit) overLimit.push({ lines, limit, path: relPath })
  }
}

overLimit.sort((a, b) => b.lines - a.lines)

if (overLimit.length) {
  console.log('以下文件超过行数阈值（AGENTS.md 要求：属本次改动新增或触及的当次拆完再提交）：')
  for (const f of overLimit) {
    console.log(`  ${String(f.lines).padStart(5)} / ${f.limit}  ${f.path}`)
  }
  process.exitCode = 1
} else {
  console.log('OK: 所有文件均在阈值以内。')
}

if (skipped > 0) {
  console.log(`（已按例外跳过 ${skipped} 个文件：${EXEMPT_PREFIXES.map(p => p.endsWith('/') ? p + '*' : p).join(', ')}）`)
}
