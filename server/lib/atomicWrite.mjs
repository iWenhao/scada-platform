/**
 * 原子写文件。
 *
 * 为什么不能直接 writeFile：写大文件时进程被杀（OOM / 容器重启 / 断电）会留下半截内容，
 * 而这里存的是账号表 `_users.json`、通知配置 `_notify.json` 这类文件——一旦损坏，
 * 整站无法登录或通知全停，且故障现场看起来只是「JSON 解析失败」。
 * 两个请求并发写同一个 key 时，直写同样会互相覆盖出半截内容。
 *
 * 做法：先写同目录下的临时文件，再 rename 覆盖。rename 在同一文件系统内是原子操作，
 * 读者只会看到旧内容或新内容，不会看到中间状态。
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

let tmpSeq = 0

/**
 * 临时文件名必须每次调用都唯一。
 * 只按「pid + 毫秒」拼会在同一毫秒的两次写之间撞名（Date.now() 是毫秒分辨率，
 * 两次并发登录落会话几乎必然同一毫秒），先 rename 走临时文件的那次让另一次报 ENOENT。
 * 前缀用点号开头，避免被 listKeys()（只认 .json 后缀）当成正式数据枚举出来。
 */
function tmpPathFor(filePath) {
  const dir = path.dirname(filePath)
  const base = path.basename(filePath)
  return path.join(dir, `.${base}.${process.pid}.${Date.now()}.${++tmpSeq}.tmp`)
}

/** 「写临时文件 + rename 覆盖」；rename 遇瞬时占用时重试 */
async function writeOnce(filePath, data, encoding) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmp = tmpPathFor(filePath)
  try {
    await fs.writeFile(tmp, data, encoding)
    // 同目录内 rename：POSIX 与 Windows（MoveFileEx + REPLACE_EXISTING）都能覆盖已存在的目标
    await withTransientRetry(() => fs.rename(tmp, filePath))
  } catch (e) {
    // 临时文件残留不影响正确性（下次写入会另起名字），但会污染目录，尽量清掉
    await fs.rm(tmp, { force: true }).catch(() => {})
    throw e
  }
}

/**
 * Windows 瞬时占用：文件刚被写完（或被读走）时，杀软与索引服务的句柄还没释放，
 * 此时 rename 覆盖它、或 rm 删它都会拿到 EPERM/EBUSY。这不是代码能避免的状态，
 * 只能等句柄释放，所以两处都用这套有界退避。
 * 实测本机：写完立刻读再写的循环里，约每 2~4 次全文件测试命中一回。
 */
const TRANSIENT_DELAYS_MS = [10, 40, 120, 300]

function isTransientFsError(e) {
  return e?.code === 'EPERM' || e?.code === 'EBUSY'
}

/**
 * 执行一次 fs 操作，遇瞬时占用按 delays 退避重试；重试仍失败则抛出原始错误。
 * 不重试的代价是静默丢写：调用方普遍把落盘失败当尽力而为（会话、审计都是 catch 掉的）。
 * `fs.rm({ force: true })` 只吞 ENOENT，EPERM 照抛，所以删除也要包一层。
 *
 * @template T
 * @param {() => Promise<T>} action 需要重试的 fs 操作
 * @param {number[]} [delays] 每次重试前的等待毫秒数，长度即最大重试次数
 */
export async function withTransientRetry(action, delays = TRANSIENT_DELAYS_MS) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await action()
    } catch (e) {
      if (!isTransientFsError(e) || attempt >= delays.length) throw e
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }
}

/**
 * 同一目标路径的写排队串行执行。
 *
 * 光有唯一临时名还不够：Windows 上两个 rename 同时替换同一个目标，后到的那个会拿到
 * EPERM（实测 2 路并发 × 25 轮就命中约 16%）。而本仓库的调用方大多把落盘失败当
 * 「尽力而为」吞掉——会话落盘 catch 掉、审计 catch 掉，于是丢的不是一次报错，
 * 是一次没人知道的写入。排队后同路径的 rename 不再互相顶撞，不同路径仍然并发。
 *
 * @type {Map<string, Promise<void>>} 目标绝对路径 -> 队尾（吞掉异常，只用于串接）
 */
const tails = new Map()

/**
 * @param {string} filePath
 * @param {string|Buffer} data
 * @param {BufferEncoding} [encoding]
 */
export function writeFileAtomic(filePath, data, encoding = 'utf8') {
  const key = path.resolve(filePath)
  // 队尾恒为已 settle 的 tail（异常被吞），所以一次写失败不会让后续写排队中断
  const run = (tails.get(key) ?? Promise.resolve()).then(() => writeOnce(filePath, data, encoding))
  const tail = run.then(
    () => {},
    () => {},
  )
  tails.set(key, tail)
  // 排空且后面没人排队时释放条目，避免长命进程里 Map 随历史写过的 key 无限增长
  tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key)
  })
  return run
}
