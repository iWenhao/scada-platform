/**
 * 点表（Tag）定义：工程级的「设备.变量」档案。
 * 与数据源实时值解耦——点表描述点位元数据（单位/量程/可写），
 * 实时值仍由 deviceStore 按 deviceId.variable 取数。
 */
import type { Condition } from './scada'
import { createTagId } from '@/utils/id'

export type { Condition }
export interface TagDef {
  id: string
  /** 设备 ID，如 motor_1 */
  deviceId: string
  /** 变量名，如 speed */
  name: string
  /** 描述（可选） */
  description?: string
  /** 工程单位 */
  unit?: string
  dataType: 'number' | 'string' | 'boolean'
  /** 量程下限（数值点） */
  min?: number
  /** 量程上限（数值点） */
  max?: number
  /** 是否允许写值下发 */
  writable?: boolean
  /**
   * 历史入库死区（数值点）：变化幅度小于该值的采样不写历史，
   * 显著减少慢变量的存储量。0/undefined = 每个采样都记录。
   * 实时画面不受影响（实时值始终更新）。
   */
  deadband?: number
  /** 备注 */
  note?: string
}

/** 点位完整键：deviceId.name */
export function tagKey(tag: Pick<TagDef, 'deviceId' | 'name'>): string {
  return `${tag.deviceId}.${tag.name}`
}

/**
 * 在点表中查找点位。variable 可以是 `deviceId.name` 或纯变量名。
 * @returns 命中的 TagDef；未登记返回 null（表示「未约束」，默认允许写）
 */
export function findTag(
  tags: TagDef[],
  deviceId: string,
  variable: string,
): TagDef | null {
  const short = variable.includes('.') ? variable.split('.').pop()! : variable
  return (
    tags.find(t => t.deviceId === deviceId && (t.name === variable || t.name === short)) ||
    null
  )
}

/**
 * 未登记点位的写值策略（工程级配置）：
 *   allow 未登记也允许写（默认，兼容旧行为）
 *   warn  允许写但提示并留痕"未登记"
 *   deny  未登记一律拒绝
 */
export type WritePolicy = 'allow' | 'warn' | 'deny'

export const WRITE_POLICY_TEXT: Record<WritePolicy, string> = {
  allow: '允许',
  warn: '提示后允许',
  deny: '禁止',
}

/**
 * 未登记点位的策略判定。
 * @returns null 表示放行；否则为拒绝原因（deny 时）
 */
export function checkUnregisteredPolicy(
  policy: WritePolicy,
  tag: TagDef | null,
): string | null {
  if (tag) return null
  if (policy === 'deny') {
    return '该点位未在点表中登记，当前策略禁止写值'
  }
  return null
}

/**
 * 校验写值是否合法（只读 / 类型一致 / 量程）。
 * @returns null 表示允许；否则为拒绝原因
 */
export function checkWriteAllowed(
  tag: TagDef | null,
  value: number | string | boolean,
): string | null {
  if (!tag) return null
  if (tag.writable === false) {
    return '该点位在点表中为只读，禁止写值'
  }
  if (tag.dataType === 'number') {
    if (typeof value !== 'number') {
      return '该点位为数值类型，请输入数字'
    }
    if (tag.min !== undefined && value < tag.min) {
      return `超出量程下限 ${tag.min}`
    }
    if (tag.max !== undefined && value > tag.max) {
      return `超出量程上限 ${tag.max}`
    }
  } else if (tag.dataType === 'string') {
    if (typeof value !== 'string' || value.trim() === '') {
      return '该点位为字符串类型，请输入非空文本'
    }
  } else if (tag.dataType === 'boolean') {
    if (typeof value !== 'boolean') {
      return '该点位为开关类型，请选择开或关'
    }
  }
  return null
}

/** CSV 表头（导入/导出共用） */
export const TAG_CSV_HEADERS = [
  'deviceId',
  'name',
  'description',
  'unit',
  'dataType',
  'min',
  'max',
  'writable',
  'deadband',
  'note',
] as const

/** 一行 Tag → CSV 字段数组 */
export function tagToCsvRow(tag: TagDef): string[] {
  return [
    tag.deviceId,
    tag.name,
    tag.description ?? '',
    tag.unit ?? '',
    tag.dataType,
    tag.min !== undefined ? String(tag.min) : '',
    tag.max !== undefined ? String(tag.max) : '',
    tag.writable === undefined ? '' : tag.writable ? '1' : '0',
    tag.deadband !== undefined ? String(tag.deadband) : '',
    tag.note ?? '',
  ]
}

/**
 * 解析 CSV 文本为 Tag 列表。
 * 约定：首行表头（大小写不敏感，支持 deviceId/device 等别名）；
 * 空行跳过；非法 dataType 回落 number；deviceId.name 为空的行丢弃。
 */
export function parseTagCsv(text: string): TagDef[] {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const headerCells = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase())
  const col = (names: string[]): number => {
    for (const n of names) {
      const i = headerCells.indexOf(n)
      if (i >= 0) return i
    }
    return -1
  }

  const iDevice = col(['deviceid', 'device', '设备'])
  const iName = col(['name', 'variable', 'tag', '变量'])
  const iDesc = col(['description', 'desc', '描述'])
  const iUnit = col(['unit', '单位'])
  const iType = col(['datatype', 'type', '类型'])
  const iMin = col(['min', '最小'])
  const iMax = col(['max', '最大'])
  const iWrite = col(['writable', 'write', '可写'])
  const iDeadband = col(['deadband', '死区'])
  const iNote = col(['note', 'remark', '备注'])

  // 无表头时假定：deviceId,name,unit
  const hasHeader = iDevice >= 0 && iName >= 0
  const start = hasHeader ? 1 : 0

  const out: TagDef[] = []
  for (let r = start; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r])
    const deviceId = (hasHeader ? cells[iDevice] : cells[0])?.trim()
    const name = (hasHeader ? cells[iName] : cells[1])?.trim()
    if (!deviceId || !name) continue

    const pick = (idx: number, fallback?: string) =>
      hasHeader && idx >= 0 ? cells[idx]?.trim() : fallback
    const rawType = (pick(iType) || 'number').toLowerCase()
    const dataType: TagDef['dataType'] =
      rawType === 'string' || rawType === 'text' || rawType === 's' || rawType === 'str'
        ? 'string'
        : rawType === 'boolean' || rawType === 'bool' || rawType === 'b'
          ? 'boolean'
          : 'number'

    const rawWrite = pick(iWrite)?.toLowerCase()
    const writable =
      rawWrite === undefined || rawWrite === ''
        ? undefined
        : rawWrite === '1' || rawWrite === 'true' || rawWrite === 'yes' || rawWrite === 'y'

    const min = pick(iMin)
    const max = pick(iMax)
    const deadband = pick(iDeadband)

    out.push({
      id: createTagId(),
      deviceId,
      name,
      description: pick(iDesc) || undefined,
      unit: pick(iUnit) || undefined,
      dataType,
      min: min && !Number.isNaN(Number(min)) ? Number(min) : undefined,
      max: max && !Number.isNaN(Number(max)) ? Number(max) : undefined,
      writable,
      deadband: deadband && !Number.isNaN(Number(deadband)) && Number(deadband) > 0
        ? Number(deadband)
        : undefined,
      note: pick(iNote) || undefined,
    })
  }
  return out
}

/** 生成完整 CSV 文本（含表头） */
export function tagsToCsv(tags: TagDef[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const rows = [TAG_CSV_HEADERS.join(','), ...tags.map(t => tagToCsvRow(t).map(esc).join(','))]
  return rows.join('\n') + '\n'
}

/**
 * 提取条件中引用的全部变量名（递归 and/or）。
 * 绑定反查用：状态规则/报警定义引用了哪些点位。
 * expression 条件是自由文本，无法可靠解析，跳过。
 */
export function collectConditionVariables(condition: Condition): string[] {
  switch (condition.type) {
    case 'compare':
    case 'range':
      return [condition.variable]
    case 'and':
    case 'or':
      return condition.conditions.flatMap(c => collectConditionVariables(c))
    default:
      return []
  }
}

/**
 * 计算 CSV 导入与现有点表的差异摘要（按 deviceId.name 对齐）。
 * id 不参与比较（导入会重新生成），内容由其余字段决定。
 */
export function computeImportSummary(
  existing: TagDef[],
  incoming: TagDef[],
): { added: TagDef[]; updated: number; unchanged: number } {
  const existingByKey = new Map(existing.map(t => [tagKey(t), t]))

  const added: TagDef[] = []
  let updated = 0
  let unchanged = 0

  for (const tag of incoming) {
    const old = existingByKey.get(tagKey(tag))
    if (!old) {
      added.push(tag)
      continue
    }
    // 比较 id 之外的所有字段
    const { id: _oldId, ...oldFields } = old
    const { id: _newId, ...newFields } = tag
    if (JSON.stringify(oldFields) === JSON.stringify(newFields)) {
      unchanged++
    } else {
      updated++
    }
  }
  return { added, updated, unchanged }
}

/** 轻量 CSV 切分（支持引号包裹与转义） */
function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells
}
