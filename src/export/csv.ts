import type { AlarmRecord } from '@/stores/alarmStore'
import type { SamplePoint } from '@/history/historian'

/**
 * CSV 导出工具：历史采样与报警记录。
 * 统一带 UTF-8 BOM——没有它 Excel 打开中文会乱码，这是给业务人员看的文件。
 */

/** 本地时区可读时间，带毫秒（聚合窗口可能落在同一秒内） */
function formatTime(t: number): string {
  const d = new Date(t)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  )
}

/** CSV 字段转义：含逗号/引号/换行的值用引号包裹，内部引号翻倍 */
function escapeField(v: string): string {
  if (!/[",\n]/.test(v)) return v
  return `"${v.replace(/"/g, '""')}"`
}

function toCsvString(header: string[], rows: string[][]): string {
  const lines = [header.join(','), ...rows.map(r => r.map(escapeField).join(','))]
  return `\uFEFF${lines.join('\r\n')}`
}

/** 历史采样导出：time,value 两列（毫秒精度保证同秒多点不丢） */
export function historyToCsv(points: SamplePoint[]): string {
  const rows = points.map(p => [formatTime(p.t), String(p.v)])
  return toCsvString(['time', 'value'], rows)
}

const SEVERITY_TEXT: Record<string, string> = { critical: '报警', warning: '预警' }

/** 报警记录导出：中文表头，业务人员可直接阅读 */
export function alarmsToCsv(entries: AlarmRecord[]): string {
  const rows = entries.map(e => [
    formatTime(e.since),
    e.clearedAt ? formatTime(e.clearedAt) : '',
    e.elementName,
    e.ruleName,
    SEVERITY_TEXT[e.severity] ?? e.severity,
    e.value,
    e.lastValue,
    e.acknowledged ? '是' : '否',
  ])
  return toCsvString(
    ['触发时间', '恢复时间', '点位/对象', '报警名称', '级别', '触发值', '最近值', '已确认'],
    rows,
  )
}

/** 触发浏览器下载（带 BOM 的 CSV） */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
