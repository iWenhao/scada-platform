import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

export default defineConfig({
  plugins: [
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
