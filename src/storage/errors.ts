/**
 * 存储层错误类型（单独成文件，避免 index.ts ↔ remote.ts 之间的值循环依赖）。
 */

/**
 * 存储冲突原因：
 *  - `exists`：仅在不存在时创建却发现目标已存在（撞名，前端走改名提示）
 *  - `stale`：保存时带的版本号与服务端当前版本不一致（乐观并发失败，
 *    说明这份工程在别处被改过，前端应提示用户刷新后再继续）
 */
export type StorageConflictReason = 'exists' | 'stale'

/**
 * 「写入冲突」信号。与网络/配额等普通存储故障区分开：上层据此
 * 判定撞名或并发冲突并走对应提示，而不是把异常冒出去当保存失败。
 */
export class StorageConflictError extends Error {
  reason: StorageConflictReason
  constructor(reason: StorageConflictReason = 'exists', message?: string) {
    super(message || (reason === 'stale' ? '工程版本已过期' : '存储目标已存在'))
    this.name = 'StorageConflictError'
    this.reason = reason
  }
}
