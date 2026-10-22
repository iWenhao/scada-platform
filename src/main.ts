import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ArrowDown, Bottom, Box, Check, Close, Collection, Connection, CopyDocument, Delete, Download,
  Edit, FolderOpened, Hide, Loading, Lock, MoreFilled, Plus, Refresh, Search, Select, Setting,
  Top, TrendCharts, Unlock, Upload, UploadFilled, View,
} from '@element-plus/icons-vue'
import VueKonva from 'vue-konva'
// Element Plus 组件本体与样式由 unplugin-vue-components/auto-import 的
// ElementPlusResolver 按需注入，不再全量 app.use + 全量 CSS（两份并存时按需配置失效）。
// 官方暗色变量仍须保留: html.dark 时所有组件(含 teleport 弹层/表格行)整体转暗
import 'element-plus/theme-chalk/dark/css-vars.css'
// 编程式组件(函数调用而非 <el-xxx> 标签)resolver 不识别，样式须手动补——
// 否则 ElMessageBox/ElMessage 弹出的是无样式裸 DOM(恢复草稿弹窗踩过坑)。
// 在此全局引入一次，覆盖全仓 16 处调用点；新增编程式组件(如 ElNotification)照此补充。
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './styles/index.scss'
import App from './App.vue'
import router from './router'
import { getStorage, initStorage, resolveLocalNamespace } from '@/storage'
import { useBrandingStore } from '@/stores/brandingStore'
import { useAuthStore } from '@/stores/authStore'
import { setUnauthorizedHandler } from '@/api/client'
import { printConsoleBanner } from '@/utils/consoleBanner'
import { ElMessage } from 'element-plus'

// 启动时在浏览器控制台打印终端风横幅（LOGO 像素画 + 系统名称 + 项目信息），便于确认当前加载的前端构建
printConsoleBanner()

// 挂载前探测存储后端并应用保存的主题, 保证所有页面(含首页)一致并避免闪屏
const applyTheme = (t: 'light' | 'dark') => {
  document.documentElement.dataset.theme = t
  document.documentElement.classList.toggle('dark', t === 'dark')
}
applyTheme('dark')

const app = createApp(App)

// 只注册模板与右键菜单(:is 字符串)中实际用到的图标——
// 全量注册会把 294 个图标全部打进 bundle；新增图标时在此补充
const usedIcons = {
  ArrowDown, Bottom, Box, Check, Close, Collection, Connection, CopyDocument, Delete, Download,
  Edit, FolderOpened, Hide, Loading, Lock, MoreFilled, Plus, Refresh, Search, Select, Setting,
  Top, TrendCharts, Unlock, Upload, UploadFilled, View,
}
for (const [key, component] of Object.entries(usedIcons)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(VueKonva)

// 使用中会话失效（token 12 小时过期、账号被管理员删除）统一退回登录页。
// 放在组合根而不是 api/client：client 反向 import authStore 会形成循环依赖。
// 登录失败同样是 401，但 code 为 login_failed，不会走到这里。
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  if (!auth.handleSessionExpired()) return
  ElMessage.warning('登录已过期，请重新登录')
  // 带上当前地址，重新登录后能回到原来的页面（编辑器里的工程仍在 Pinia 内存中）
  void router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
})

// 本地回落模式按用户命名空间隔离（远程模式由服务端 scope 决定）
initStorage(undefined, resolveLocalNamespace())
  .then(async () => {
    const saved = await getStorage().get('scada_theme')
    if (saved === 'light' || saved === 'dark') applyTheme(saved)
    // 挂载前加载站点品牌并同步标题/favicon：登录页等未鉴权页面也能显示部署品牌
    await useBrandingStore().init()
    // 自定义组件不在这里加载：远程存储的隔离靠登录 token，挂载前还没登录，
    // 读回来只会是空数组。入口在 customLibrary.ensureCustomComponentsLoaded()，
    // 由组件库面板与预览页的 onMounted 触发（登录之后才发生）
  })
  .catch(() => {})
  .finally(() => {
    app.mount('#app')
  })
