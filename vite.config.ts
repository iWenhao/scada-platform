import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { readFileSync } from 'node:fs'
import path from 'path'
import { FRONTEND_DETAILS, buildBannerModel, renderAnsi, renderPlain, supportsColor } from './shared/consoleBanner.mjs'

// 读取 package.json 的名称/版本/描述：终端启动横幅与浏览器控制台横幅共用。
// 用 readFileSync 而非 JSON import，避免为 resolveJsonModule 单独调 tsconfig.node.json。
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { name: string; version: string; description: string }

/**
 * 启动横幅：与浏览器控制台、后端存储服务共用同一份布局（shared/consoleBanner.mjs），
 * 此处只负责「dev server 展示什么」——标明这是前端，与 `pnpm server` 的后端横幅区分。
 * Node 侧取不到站点品牌配置（品牌存在运行时的存储里），名称/描述用 package.json。
 */
function startupBanner(): string {
  const model = buildBannerModel({
    title: pkg.name,
    subtitle: `${pkg.description} · 前端 Frontend`,
    version: pkg.version,
    details: FRONTEND_DETAILS,
    prompt: 'visitor',
  })
  return supportsColor() ? renderAnsi(model) : renderPlain(model)
}

// 启动横幅插件：dev server 启动时在终端打印项目 LOGO 与信息。
// configureServer 早于 Vite 自身的地址输出执行，横幅会显示在「Local:」之上。
function startupBannerPlugin(): Plugin {
  return {
    name: 'scada-startup-banner',
    configureServer() {
      console.log(`\n${startupBanner()}\n`)
    },
  }
}

export default defineConfig({
  define: {
    // 注入 package.json 版本，供 main.ts 在浏览器控制台打印启动横幅
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    startupBannerPlugin(),
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 只钉 vue 全家（ESM），其余交给 rollup 按路由动态切。三条都是实测出来的：
          // 1) 不要钉 element-plus：`vendor-element` 是入口的**静态**依赖，整库 909 kB 会被
          //    登录页/首页一起预加载，其中大半只有编辑器用得到。只去掉这一条，首屏 1429 → 466 kB raw。
          // 2) 不要钉 konva：rollup 会把 CJS/UMD 互操作 helper（globalThis 兜底、
          //    getDefaultExportFromCjs）放在「第一个含 CJS 模块的块」顶部，而 element-plus 依赖的
          //    dayjs 也是 UMD——入口于是静态 import 了 vendor-konva 里那两个 helper，
          //    188 kB 的 konva 又被拖回首屏（modulepreload 里看得到）。连同 main.ts 的静态
          //    app.use(VueKonva) 一起摘掉后，首屏 466 → 274 kB raw。
          // 3) 匹配 vue 时要用 `node_modules/vue/` 这种「目录级」形式：`includes('node_modules/vue')`
          //    会连带命中 vue-konva、vue-router，等价于把画布依赖钉进 eager 块。
          if (/node_modules[\\/](vue|@vue|vue-router|pinia)[\\/]/.test(id)) return 'vendor-vue'
          return undefined
        },
      },
    },
  },
  server: {
    // 显式绑定 IPv4 回环地址(127.0.0.1)，不用默认的 localhost。
    // 问题背景：本机 Clash Verge(mihomo) 开 TUN 模式时，所有连往 IPv6 回环 ::1 的
    // TCP 连接都被拦截(EACCES)；而 Node 17+ 解析 localhost 优先返回 ::1，导致 Vite
    // 默认只监听 [::1]:5173——浏览器走 IPv6 被 TUN 拦、走 IPv4 又无人监听，页面报
    // 「无法访问此网站」。绑 127.0.0.1 即可绕开：TUN 不劫持 IPv4 回环流量。
    // 注意：绑 127.0.0.1 后局域网设备无法访问 dev server；需手机联调时临时改用
    // `pnpm dev --host` 或在此处改为 true(绑全部地址，IPv4 也在其中)。
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // 存储后端(见 server/index.mjs): 前端 /api 请求转发到存储服务。
      // 目标同样写 127.0.0.1 而非 localhost：避免 Node 解析 localhost 先试 ::1 被 TUN 拦截。
      '/api': 'http://127.0.0.1:5174',
    },
  },
})
