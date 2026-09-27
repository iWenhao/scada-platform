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

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(VueKonva)

app.mount('#app')
