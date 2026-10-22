/**
 * 用**真实**的 vue-konva 验注册结果（`lazyKonva.test.ts` 打的是 install 桩，只管「何时装载」）。
 *
 * 守的是最容易悄悄坏掉的性质：懒装载之后 `<v-stage>` 还解析得到组件吗。
 * vue-konva 的 install 逐个 `app.component('V' + 组件名)`，模板里的 `<v-stage>` 经
 * camelize + capitalize 正好命中 `VStage`。哪天装载时机落到渲染之后、或 app 实例传错了，
 * 画布直接空白而 vue-tsc 全绿——只有这条会红。
 */
import { describe, expect, it } from 'vitest'
import { createApp, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { installLazyKonva } from './lazyKonva'

const Empty = { render: () => h('div') }

function setup() {
  const app = createApp(Empty)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Dashboard', component: Empty },
      { path: '/editor', name: 'Editor', component: Empty },
      { path: '/preview', name: 'Preview', component: Empty },
    ],
  })
  installLazyKonva(app, router)
  return { app, router }
}

describe('懒装载后画布组件确实注册进了当前 app', () => {
  it('进 /editor 前一个都没有，进完后画布用到的全都在', async () => {
    const { app, router } = setup()
    await router.push('/')
    expect(app.component('VStage')).toBeUndefined()

    await router.push('/editor')
    // 名单取自画布与预览页模板里实际出现的 `<v-*>`，少一个就是那类图元画不出来
    for (const name of ['VStage', 'VLayer', 'VGroup', 'VRect', 'VLine', 'VImage', 'VText', 'VCircle', 'VTransformer']) {
      expect(app.component(name), name).toBeTruthy()
    }
  })

  it('装载发生在导航 resolve 之前（不是渲染之后补救）', async () => {
    const { app, router } = setup()
    await router.push('/preview')
    expect(app.component('VStage')).toBeTruthy()
  })
})
