/**
 * 流动动画控制器
 */
export class FlowAnimation {
  private animations = new Map<string, AnimationState>()

  /**
   * 启动流动动画
   */
  start(
    id: string,
    callback: (offset: number) => void,
    speed: number = 1,
    direction: 'forward' | 'reverse' = 'forward'
  ): void {
    // 停止现有动画
    this.stop(id)

    const state: AnimationState = {
      id,
      callback,
      speed,
      direction,
      offset: 0,
      running: true,
      animationId: null,
    }

    this.animations.set(id, state)
    this.animate(state)
  }

  /**
   * 停止动画
   */
  stop(id: string): void {
    const state = this.animations.get(id)
    if (state) {
      state.running = false
      if (state.animationId) {
        cancelAnimationFrame(state.animationId)
      }
      this.animations.delete(id)
    }
  }

  /**
   * 停止所有动画
   */
  stopAll(): void {
    for (const [id] of this.animations) {
      this.stop(id)
    }
  }

  /**
   * 更新动画参数
   */
  update(id: string, params: Partial<Pick<AnimationState, 'speed' | 'direction'>>): void {
    const state = this.animations.get(id)
    if (state) {
      if (params.speed !== undefined) state.speed = params.speed
      if (params.direction !== undefined) state.direction = params.direction
    }
  }

  /**
   * 检查动画是否运行中
   */
  isRunning(id: string): boolean {
    return this.animations.has(id)
  }

  /**
   * 动画循环
   */
  private animate(state: AnimationState): void {
    if (!state.running) return

    const directionMultiplier = state.direction === 'reverse' ? -1 : 1
    state.offset += state.speed * directionMultiplier

    // 重置偏移量以保持循环
    if (state.offset > 100) state.offset -= 100
    if (state.offset < -100) state.offset += 100

    state.callback(state.offset)

    state.animationId = requestAnimationFrame(() => this.animate(state))
  }
}

interface AnimationState {
  id: string
  callback: (offset: number) => void
  speed: number
  direction: 'forward' | 'reverse'
  offset: number
  running: boolean
  animationId: number | null
}

// 单例导出
export const flowAnimation = new FlowAnimation()
