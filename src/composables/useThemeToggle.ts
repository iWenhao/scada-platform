import { computed, type ComputedRef } from 'vue'
import { useUiStore, type ThemeName } from '@/stores/uiStore'

export interface ThemeToggleView {
  /** 当前主题名 */
  theme: ComputedRef<ThemeName>
  isDark: ComputedRef<boolean>
  /** 当前主题对应的图标名（图标表示"现在是什么"，提示表示"点了会变成什么"） */
  icon: ComputedRef<string>
  tip: ComputedRef<string>
  label: ComputedRef<string>
  /** HUD / 玻璃风格页面用 emoji，与各自按钮群里的其它图标保持同一套语汇 */
  emoji: ComputedRef<string>
  toggle: () => void
}

/**
 * 主题切换的展示语义与动作，全站单一来源。
 * 首页顶栏、预览 HUD、登录页、编辑器工具栏共用，避免每处各写一份三元表达式。
 */
export function useThemeToggle(): ThemeToggleView {
  const uiStore = useUiStore()

  const theme = computed(() => uiStore.theme)
  const isDark = computed(() => uiStore.theme === 'dark')

  const icon = computed(() => (isDark.value ? 'theme-dark' : 'theme-light'))
  const tip = computed(() => (isDark.value ? '切换亮色主题' : '切换暗色主题'))
  const label = computed(() => (isDark.value ? '暗色' : '亮色'))
  const emoji = computed(() => (isDark.value ? '🌙' : '☀️'))

  function toggle() {
    uiStore.toggleTheme()
  }

  return { theme, isDark, icon, tip, label, emoji, toggle }
}
