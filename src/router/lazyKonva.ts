import type { App } from 'vue'
import type { Router } from 'vue-router'

/**
 * vue-konva（连带 konva 本体，188 kB raw / 56 kB gzip）只有编辑器和预览两页用得到。
 *
 * 为什么不在 main.ts 里静态 `app.use(VueKonva)`：那会让入口 chunk 静态依赖 konva，
 * 构建出的 index.html 给它挂 modulepreload，登录页与项目管理页白付这份流量
 * （实测首屏 1429 kB → 274 kB raw）。
 *
 * 时机契约：守卫 await 结束后才把 `<v-*>` 全局组件注册进 app，而路由组件此刻还没开始
 * 渲染，模板解析全局组件发生在 render 时，所以 `<v-stage>` 照常命中。
 * 用 beforeResolve 而不是 beforeEach：beforeEach 可能把无编辑权限的用户改派到 /preview，
 * 重定向后的目标同样需要 konva。
 */
const CANVAS_ROUTES = new Set(['Editor', 'Preview'])

export function installLazyKonva(app: App, router: Router) {
  let loading: Promise<void> | null = null
  router.beforeResolve(async (to) => {
    if (!CANVAS_ROUTES.has(String(to.name ?? ''))) return
    loading ??= import('vue-konva').then(({ default: VueKonva }) => {
      app.use(VueKonva)
    })
    await loading
  })
}
