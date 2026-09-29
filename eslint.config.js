import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'

/**
 * ESLint flat config（v9+）。
 *
 * 注意：本项目此前 package.json 里写着 `eslint src --ext .vue,.ts,.tsx`，
 * 但仓库既没有装 eslint 依赖也没有任何配置文件，这条命令一直是坏的；
 * ESLint v9 也已移除 --ext，改为由 config 的 files 模式决定目标文件。
 *
 * 结构说明：.ts/.mjs 与 .vue 必须拆成两个块——
 * 前者的 languageOptions.parser 是 TS parser，会覆盖 flat/recommended
 * 为 .vue 注入的 vue-eslint-parser，导致模板解析失败。
 */
const sharedRules = {
  // 画布事件处理大量使用 Konva 的任意事件对象，逐个声明类型收益不大
  '@typescript-eslint/no-explicit-any': 'off',
  // 单测中有意构造非法输入来覆盖异常分支
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  'vue/multi-word-component-names': 'off',
  'vue/max-attributes-per-line': 'off',
  'vue/singleline-html-element-content-newline': 'off',
}

const sharedLanguageOptions = {
  ecmaVersion: 2022,
  sourceType: 'module',
  globals: {
    ...globals.browser,
    ...globals.node,
  },
}

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'server/data/**', '*.d.ts'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,mjs}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      ...sharedLanguageOptions,
    },
    rules: {
      // 基础规则对 TS 语法（接口参数、类型导入）误报，统一交给 TS 感知版本
      'no-unused-vars': 'off',
      ...sharedRules,
    },
  },
  {
    files: ['**/*.vue'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      // parser 保留 flat/recommended 注入的 vue-eslint-parser，
      // 仅指定 <script> 内容用 TS 解析
      parserOptions: {
        parser: tseslint.parser,
      },
      ...sharedLanguageOptions,
    },
    rules: {
      'no-unused-vars': 'off',
      ...sharedRules,
    },
  },
  {
    files: ['**/*.test.ts', 'src/__tests__/**'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, vi: 'readonly' },
    },
  },
)
