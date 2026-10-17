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
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
