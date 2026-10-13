import { onScopeDispose, ref, type Ref } from 'vue'

// Canvas 2D 组件（缩略图 / 标尺）无法直接消费 CSS 变量，需要 JS 侧读取 + 主题切换信号。
// 主题的唯一权威是 documentElement 的 data-theme（main.ts 启动应用、uiStore 切换改写），
// 故用 MutationObserver 监听该属性即可覆盖全部切换路径，不必侵入 uiStore。

const themeTick = ref(0)
let observer: MutationObserver | null = null
let consumers = 0

function ensureObserver() {
  if (observer || typeof MutationObserver === 'undefined') return
  observer = new MutationObserver(() => {
    themeTick.value += 1
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}

/** 读取 :root 上某个 CSS 变量的当前计算值；变量未定义时回退 fallback */
export function readThemeVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/**
 * 主题切换信号：data-theme 变化时 tick +1。
 * Canvas 2D 组件 watch 该返回值，在回调里重新 readThemeVar 并重绘。
 * 观察器为模块级单例，最后一个消费者卸载后断开。
 */
export function useThemeTick(): Ref<number> {
  ensureObserver()
  consumers += 1
  onScopeDispose(() => {
    consumers -= 1
    if (consumers <= 0) {
      observer?.disconnect()
      observer = null
      consumers = 0
    }
  })
  return themeTick
}
