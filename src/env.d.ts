/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 存储 API 根路径，默认 '/api' */
  readonly VITE_API_BASE?: string
  /** 访问存储后端的 Bearer Token（可选，与后端 AUTH_TOKEN 对应） */
  readonly VITE_API_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue-konva' {
  import type { Plugin } from 'vue'
  const VueKonva: Plugin
  export default VueKonva
}
