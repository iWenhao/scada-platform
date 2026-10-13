import { describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { readThemeVar, useThemeTick } from './useThemeCssVars'

const flushObserver = () => new Promise(resolve => setTimeout(resolve, 0))

describe('readThemeVar', () => {
  it('变量存在时返回当前计算值', () => {
    document.documentElement.style.setProperty('--test-theme-var', '#123456')
    expect(readThemeVar('--test-theme-var', '#ffffff')).toBe('#123456')
    document.documentElement.style.removeProperty('--test-theme-var')
  })

  it('变量未定义时回退 fallback', () => {
    expect(readThemeVar('--test-theme-var-missing', '#ffffff')).toBe('#ffffff')
  })
})

describe('useThemeTick', () => {
  it('data-theme 变化时 tick 递增，卸载最后一个消费者后断开观察器', async () => {
    const scope = effectScope()
    let tick!: ReturnType<typeof useThemeTick>
    scope.run(() => {
      tick = useThemeTick()
    })
    const before = tick.value
    document.documentElement.dataset.theme = 'light'
    await flushObserver()
    expect(tick.value).toBe(before + 1)

    scope.stop()
    document.documentElement.dataset.theme = 'dark'
    await flushObserver()
    expect(tick.value).toBe(before + 1) // 观察器已断开，不再递增
  })
})
