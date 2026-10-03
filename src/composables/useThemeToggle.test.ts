import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useThemeToggle } from './useThemeToggle'

describe('useThemeToggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.classList.add('dark')
  })

  it('暗色下图标表示当前主题、提示指向切换后的目标', () => {
    const { isDark, icon, tip, label, emoji } = useThemeToggle()
    expect(isDark.value).toBe(true)
    expect(icon.value).toBe('theme-dark')
    expect(tip.value).toBe('切换亮色主题')
    expect(label.value).toBe('暗色')
    expect(emoji.value).toBe('🌙')
  })

  it('切换后主题反转，并同步 html 的 data-theme 与 dark 类', () => {
    const { isDark, icon, toggle } = useThemeToggle()
    toggle()
    expect(isDark.value).toBe(false)
    expect(icon.value).toBe('theme-light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('多个调用点共享同一个 store 状态', () => {
    const a = useThemeToggle()
    const b = useThemeToggle()
    a.toggle()
    expect(b.isDark.value).toBe(false)
  })
})
