/**
 * 实体 ID 统一工厂：前缀 + 毫秒时间戳 + 随机后缀。
 * 随机后缀保证同毫秒内批量创建（拖放/粘贴/复制画面）也不会撞 ID。
 */

/** 通用生成器：`<prefix>_<毫秒>_<随机串>` */
export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const createElementId = (): string => createId('el')

export const createConnectionId = (): string => createId('conn')

export const createLayerId = (): string => createId('layer')

export const createPageId = (): string => createId('page')

export const createTagId = (): string => createId('tag')
