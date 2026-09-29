/** 多画面导航辅助：返回上一画面的特殊 navigateTo 值 */
export const NAV_BACK = '__back__'

/** 导航栈：记录「从哪来」，用于返回 */
export class PageNavStack {
  private stack: string[] = []
  private readonly maxDepth: number

  constructor(maxDepth = 50) {
    this.maxDepth = maxDepth
  }

  /** 跳转前压入来源页；去重连续相同页 */
  push(fromPageId: string) {
    if (!fromPageId) return
    if (this.stack[this.stack.length - 1] === fromPageId) return
    this.stack.push(fromPageId)
    if (this.stack.length > this.maxDepth) {
      this.stack.shift()
    }
  }

  pop(): string | null {
    return this.stack.pop() ?? null
  }

  peek(): string | null {
    return this.stack[this.stack.length - 1] ?? null
  }

  get canBack(): boolean {
    return this.stack.length > 0
  }

  get depth(): number {
    return this.stack.length
  }

  clear() {
    this.stack = []
  }
}
