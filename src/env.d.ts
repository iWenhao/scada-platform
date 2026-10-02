/// <reference types="vite/client" />

/** vite.config.ts define 注入：package.json 的项目名称 */
declare const __APP_NAME__: string
/** vite.config.ts define 注入：package.json 的项目版本 */
declare const __APP_VERSION__: string

declare module '*?raw' {
  const content: string
  export default content
}

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

declare module '../../server/notify.mjs' {
  export function renderTemplate(tpl: string, vars: Record<string, unknown>): string
  export function loadNotifyConfig(dataDir: string): Promise<{
    channels: Array<Record<string, unknown>>
    minIntervalMs: number
  }>
  export function saveNotifyConfig(
    dataDir: string,
    config: { channels: unknown[]; minIntervalMs?: number },
  ): Promise<{ channels: unknown[]; minIntervalMs: number }>
  export function sendToChannel(
    channel: Record<string, unknown>,
    event: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }>
  export function dispatchNotification(
    dataDir: string,
    event: Record<string, unknown>,
    lastSentAt?: Map<string, number>,
  ): Promise<Array<{ ok: boolean; error?: string; id?: string; name?: string }>>
}
