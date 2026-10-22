import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    // examples/ 下的测试用于校验示例工程文件的结构没和实现漂移；
    // shared/ 是前后端共用的纯逻辑模块（启动横幅），单测与被测文件同目录；
    // scripts/ 是工具脚本目录（提交信息校验），同样测试与被测文件同目录；
    // server/ 是零依赖存储后端，被测文件是 .mjs、测试沿用仓库约定写成 .test.ts，
    // 且刻意不进 tsconfig.server.json 的 include（那里只收 .mjs，见其「为什么单独一份」注释）
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'shared/**/*.{test,spec}.{js,ts}',
      'scripts/**/*.{test,spec}.ts',
      'examples/**/*.test.ts',
      'server/**/*.{test,spec}.{js,ts}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
    // vue-konva / konva 必须内联给 vite 处理：外部化时是 Node 自己 require，
    // 既不看下面的 konva 别名、也不认 jsdom，会去取 lib/index-node.js 然后要 `canvas` 原生包。
    server: {
      deps: {
        inline: ['konva', 'vue-konva'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // konva 的 package.json 里 main 指向 lib/index-node.js，那份 headless 依赖原生包 `canvas`
      // （仓库没装），jsdom 下一 import 就 MODULE_NOT_FOUND；browser 字段那份才是浏览器构建。
      // 内联让别名生效，二者缺一不可（只加 inline 不加别名实测仍报同一个错）。
      // 目前只有 src/router/lazyKonvaRegistration.test.ts 真需要载入 vue-konva 本体——
      // 它只验「全局组件注册到了 app 上」，不建 Stage，所以不需要 canvas。
      konva: resolve(__dirname, 'node_modules/konva/lib/index.js'),
    },
  },
})
