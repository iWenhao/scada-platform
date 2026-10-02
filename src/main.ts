import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueKonva from 'vue-konva'
import 'element-plus/dist/index.css'
// Element Plus 官方暗色变量: html.dark 时所有组件(含 teleport 弹层/表格行)整体转暗
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/index.scss'
import App from './App.vue'
import router from './router'
import { getStorage, initStorage, resolveLocalNamespace } from '@/storage'
import { useBrandingStore } from '@/stores/brandingStore'

// 启动时在浏览器控制台打印项目名称与版本，便于确认当前页面加载的前端构建。
// 名称/版本由 vite.config.ts 的 define 从 package.json 注入，无需重复维护。
console.log(
  `%c ${__APP_NAME__} v${__APP_VERSION__} %c 开源工业组态可视化编辑平台 `,
  'background:#2563eb;color:#fff;font-weight:bold;border-radius:3px 0 0 3px;padding:2px 8px;',
  'background:#e8f0fe;color:#2563eb;border-radius:0 3px 3px 0;padding:2px 8px;',
)

// 挂载前探测存储后端并应用保存的主题, 保证所有页面(含首页)一致并避免闪屏
const applyTheme = (t: 'light' | 'dark') => {
  document.documentElement.dataset.theme = t
  document.documentElement.classList.toggle('dark', t === 'dark')
}
applyTheme('dark')

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(VueKonva)

// 本地回落模式按用户命名空间隔离（远程模式由服务端 scope 决定）
initStorage(undefined, resolveLocalNamespace())
  .then(async () => {
    const saved = await getStorage().get('scada_theme')
    if (saved === 'light' || saved === 'dark') applyTheme(saved)
    // 挂载前加载站点品牌并同步标题/favicon：登录页等未鉴权页面也能显示部署品牌
    await useBrandingStore().init()
  })
  .catch(() => {})
  .finally(() => {
    app.mount('#app')
  })
