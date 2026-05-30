/// <reference types="vite/client" />

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
