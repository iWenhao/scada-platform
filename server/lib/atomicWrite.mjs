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

/** 临时文件前缀用点号开头，避免被 listKeys()（只认 .json 后缀）当成正式数据枚举出来 */
function tmpPathFor(filePath) {
  const dir = path.dirname(filePath)
  const base = path.basename(filePath)
  return path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`)
}

/**
 * @param {string} filePath
 * @param {string|Buffer} data
 * @param {BufferEncoding} [encoding]
 */
export async function writeFileAtomic(filePath, data, encoding = 'utf8') {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmp = tmpPathFor(filePath)
  try {
    await fs.writeFile(tmp, data, encoding)
    // 同目录内 rename：POSIX 与 Windows（MoveFileEx + REPLACE_EXISTING）都能覆盖已存在的目标
    await fs.rename(tmp, filePath)
  } catch (e) {
    // 临时文件残留不影响正确性（下次写入会另起名字），但会污染目录，尽量清掉
    await fs.rm(tmp, { force: true }).catch(() => {})
    throw e
  }
}
