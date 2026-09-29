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
  })
  .catch(() => {})
  .finally(() => {
    app.mount('#app')
  })
