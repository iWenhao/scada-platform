/**
 * 存储层错误类型（单独成文件，避免 index.ts ↔ remote.ts 之间的值循环依赖）。
 */

/**
 * 「仅在不存在时创建」却发现目标已存在的冲突信号。
 * 与网络/配额等普通存储故障区分开：上层（projectPersistence.saveProject）据此
 * 判定「撞名」并走改名提示，而不是把异常冒出去当保存失败。
 */
export class StorageConflictError extends Error {
  constructor(message = '存储目标已存在') {
    super(message)
    this.name = 'StorageConflictError'
  }
}
