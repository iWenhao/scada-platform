/**
 * 单实例文件锁（`DATA_DIR/.lock`）。
 *
 * 为什么需要：本服务的写入串行化是**进程内**的——`atomicWrite` 的同路径队列是一张 `Map`，
 * 账号表与会话表在 `auth.init()` 读进内存、之后整份回写。这些都只在「一个进程管一份
 * DATA_DIR」时成立。跑两个实例（或多副本共用一个挂卷）时，结果是 A 登录的会话 B 不认、
 * 两份内存账号表互相覆盖、`access` 与 `rename` 之间出现注释里承认过的竞态窗口——
 * 而且全程不报错，看起来只是「偶尔丢一次保存」。本模块把这条隐性前提换成启动时的显式拒绝。
 *
 * 判活用的是「心跳新鲜 + 同机能验 pid」两条正向证据：
 *   - 心跳：持锁进程按 `HEARTBEAT_INTERVAL_MS` 续期 `updatedAt`；超过 `STALE_AFTER_MS`
 *     没续期即判失效。这是跨主机（共享卷）下唯一可用的信号——对方的 pid 在本机毫无意义。
 *   - pid：仅在与本机 hostname 相同时参与判断，进程已退出可**立刻**接管，
 *     不必等陈旧窗口，避免机器重启后被 crash 残留的锁挡死。
 * pid 存活但心跳超期同样判可接管：真实进程被挂起 60 秒以上本就不可用，
 * 而机器长期运行后 pid 会被复用，「死实例的锁文件 + 恰好复用了该 pid 的无关进程」
 * 若一律拒绝，等于让安全检自己制造一次起不来的故障。
 *
 * 它是**启动门禁**，不是 fencing token：抢锁成功后若被挂起超过陈旧窗口、另一实例接管，
 * 本进程只停止续期并大声报错，不做数据写入熔断（文件系统层给不出真正的隔离手段）。
 * 确实需要多实例并发时请换数据库，不要指望把这里的窗口调小。
 */
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFileAtomic, withTransientRetry } from './atomicWrite.mjs'

/** 锁文件名；点号开头 + 无 .json 后缀，不会被 listKeys() 当成业务数据枚举出来 */
export const LOCK_FILE_NAME = '.lock'
/** 持锁进程续期心跳的间隔 */
export const HEARTBEAT_INTERVAL_MS = 15_000
/** 心跳超过这个时长没更新即判为陈旧、可被接管。须明显大于续期间隔，容忍几次续期失败 */
export const STALE_AFTER_MS = 60_000

export function lockFilePath(dataDir) {
  return path.join(dataDir, LOCK_FILE_NAME)
}

/**
 * 进程是否存在。
 * EPERM 表示「进程在、只是没权限给它发信号」（别的用户起的实例），按存活处理；
 * 只有 ESRCH 才是真的没有这个 pid。
 */
function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e?.code !== 'ESRCH'
  }
}

/** 读锁文件内容；文件不存在或 JSON 半截（续期时被杀）都返回 null，交由调用方判可接管 */
async function readHolder(dataDir) {
  try {
    const parsed = JSON.parse(await fs.readFile(lockFilePath(dataDir), 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/** 持锁方是否还活着：见文件头的判活规则 */
export function isHolderAlive(holder, now = Date.now()) {
  const updatedAt = Number(holder?.updatedAt)
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return false
  if (now - updatedAt > STALE_AFTER_MS) return false
  // hostname 缺失或不同 → 无法在本机验 pid，只认心跳
  if (holder?.hostname === os.hostname()) return isPidAlive(Number(holder?.pid))
  return true
}

/** 把持锁方渲染成一行人话，供启动被拒时打印与单测核对 */
export function describeHolder(holder, now = Date.now()) {
  if (!holder) return '锁文件已存在但内容无法解析'
  const since = (ms) => {
    const sec = Math.max(0, Math.round((now - Number(ms)) / 1000))
    return Number.isFinite(sec) ? `${sec} 秒前` : '时间未知'
  }
  const sameHost = holder.hostname === os.hostname()
  return [
    `pid ${holder.pid ?? '?'} @ ${holder.hostname ?? '未知主机'}${sameHost ? '（本机）' : ''}`,
    `启动于 ${since(holder.createdAt)}`,
    `心跳更新于 ${since(holder.updatedAt)}`,
  ].join(' · ')
}

/**
 * 抢锁。
 *
 * 返回对象**两种结果同构**（都带 `holder` 与可调用的 `release`），而不是靠 `acquired` 做判别式收窄：
 * 本仓库的服务端类型检查刻意不开 strict（见 tsconfig.server.json），而没有 strictNullChecks 时
 * TS 不会按 `true`/`false` 字面量收窄联合类型，调用方读 `reason` / `release` 会直接报 TS2339。
 * 同构返回让调用方拿到什么形状都能安全读，未持锁时 `release()` 是 no-op。
 *
 * @param {string} dataDir 数据目录（不存在会先建出来）
 * @param {{ now?: () => number, intervalMs?: number }} [opts] 测试注入时钟与心跳间隔
 * @returns {Promise<{
 *   acquired: boolean,
 *   reason: 'acquired' | 'held' | 'raced',
 *   holder: object | null,
 *   release: () => Promise<boolean>,
 * }>}
 */
export async function acquireInstanceLock(dataDir, opts = {}) {
  const now = opts.now ?? (() => Date.now())
  const intervalMs = opts.intervalMs ?? HEARTBEAT_INTERVAL_MS
  const file = lockFilePath(dataDir)
  /** 本次进程的唯一标识：release 与接管判断都靠它分辨「这锁还是不是我那把」 */
  const owner = randomUUID()
  /** 抢锁成功那一刻，整个持锁期不变 */
  const startedAt = now()
  await fs.mkdir(dataDir, { recursive: true })

  const record = (t) => ({
    owner,
    pid: process.pid,
    hostname: os.hostname(),
    // createdAt 只在创建时定一次：日志里要区分「这个实例起了多久」与「它多久没续期了」，
    // 两者混成一个数就看不出差别了（心跳曾经直接复用 record，导致启动时间跟着续期一起跳）
    createdAt: startedAt,
    updatedAt: t,
  })

  let holder = null
  // 最多两轮：第一轮撞上陈旧锁时删掉重来；第二轮仍撞说明有别的实例也在同一时刻抢
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // 'wx' = O_CREAT|O_EXCL，POSIX 与 Windows 上都保证「创建即独占」，
      // 两个进程同时 open 只有一个成功——这才是跨进程互斥的根据，读文件判断只是辅助
      const handle = await fs.open(file, 'wx')
      holder = record(now())
      await handle.writeFile(JSON.stringify(holder), 'utf8')
      await handle.close()

      let timer = null
      const stop = () => {
        if (timer) clearInterval(timer)
        timer = null
      }
      timer = setInterval(() => {
        void (async () => {
          const current = await readHolder(dataDir)
          if (current && current.owner !== owner) {
            // 锁已被接管（多半是本进程被挂起超过陈旧窗口）。再写就把接管者顶掉了，
            // 所以停掉续期、把冲突打到日志里，交给人看——启动门禁不承担熔断职责
            stop()
            console.error(
              '[scada-server] 单实例锁已被其它进程接管，本进程已停止续期。' +
                '请确认没有两个实例共用同一 DATA_DIR：' + describeHolder(current, now()),
            )
            return
          }
          // 走原子写：心跳被读成半截 JSON 会让活锁看起来是可接管的陈旧锁
          await writeFileAtomic(file, JSON.stringify(record(now())), 'utf8').catch((e) => {
            console.warn('[scada-server] 单实例锁续期失败', e?.message || e)
          })
        })()
      }, intervalMs)
      // 不因锁心跳而让进程多活一秒
      timer.unref()

      return {
        acquired: true,
        reason: 'acquired',
        holder,
        release: async () => {
          stop()
          const current = await readHolder(dataDir)
          if (current && current.owner !== owner) return false
          // force 只吞 ENOENT，Windows 上杀软占用产生的 EPERM 要退避重试
          await withTransientRetry(() => fs.rm(file, { force: true })).catch(() => {})
          return true
        },
      }
    } catch (e) {
      if (e?.code !== 'EEXIST') throw e
      const existing = await readHolder(dataDir)
      if (isHolderAlive(existing, now())) {
        return { acquired: false, reason: 'held', holder: existing, release: async () => false }
      }
      // 接管残留锁：删除可能与另一个接管者交错，故删完回到循环再试一次 'wx'，
      // 而不是假设「我删掉了所以归我」
      await withTransientRetry(() => fs.rm(file, { force: true })).catch(() => {})
    }
  }

  return { acquired: false, reason: 'raced', holder: await readHolder(dataDir), release: async () => false }
}
