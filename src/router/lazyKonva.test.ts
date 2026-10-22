// @vitest-environment node
/**
 * installLazyKonva 的时机契约测试。
 *
 * 这里打的桩是 vue-konva 的 install，测的是「我们什么时候装载」而不是 konva 本身：
 * 装载必须①只在画布路由触发、②在路由导航 resolve 之前完成（否则 <v-stage> 解析不到、
 * 画布直接空白）、③全生命周期只做一次。纯 node 环境，不引入 konva 的真实体积。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { installLazyKonva } from './lazyKonva'

const { install } = vi.hoisted(() => ({ install: vi.fn() }))
vi.mock('vue-konva', () => ({ default: { install } }))

const Stub = { render: () => h('div') }

function setup() {
  const app = createApp(Stub)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Dashboard', component: Stub },
      { path: '/login', name: 'Login', component: Stub },
      { path: '/editor', name: 'Editor', component: Stub },
      { path: '/preview', name: 'Preview', component: Stub },
    ],
  })
  installLazyKonva(app, router)
  return { app, router }
}

describe('vue-konva 按需装载', () => {
  beforeEach(() => install.mockClear())

  it('非画布路由不装载，首页与登录页不付 konva 的流量', async () => {
    const { router } = setup()
    await router.push('/')
    await router.push('/login')
    expect(install).not.toHaveBeenCalled()
  })

  it('进入编辑器时在导航 resolve 前完成注册', async () => {
    const { router } = setup()
    await router.push('/editor')
    expect(install).toHaveBeenCalledTimes(1)
  })

  it('预览页共用同一份装载，不重复安装', async () => {
    const { router } = setup()
    await router.push('/editor')
    await router.push('/preview')
    await router.push('/')
    await router.push('/preview')
    expect(install).toHaveBeenCalledTimes(1)
  })

  it('装载目标是当前 app 实例（app.use 的首参）', async () => {
    const { app, router } = setup()
    await router.push('/editor')
    expect(install.mock.calls[0]?.[0]).toBe(app)
  })
})
