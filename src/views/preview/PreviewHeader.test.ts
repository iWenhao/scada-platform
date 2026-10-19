import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createPinia } from 'pinia'
import PreviewHeader from './PreviewHeader.vue'

/**
 * 守「灰掉的按钮也要有说明」这条交互：气泡挂在外层 span 上，
 * 一旦有人把它挪回 button 本身，disabled 的按钮不派发鼠标事件，提示会静默失效——
 * 这种回归只有挂载测试抓得到，类型检查和构建全是绿的。
 */
async function mountHeader(canGoBack: boolean) {
  // 上一个用例的浮层 teleport 在 body 上，wrapper 不卸载就还在，先清干净再读
  document.querySelectorAll('.el-popper').forEach(node => node.remove())
  const wrapper = mount(PreviewHeader, {
    props: {
      projectName: '测试工程',
      pages: [],
      activePageId: '',
      writeLocked: false,
      unackedCount: 0,
      activeAlarmCount: 0,
      connectionStatus: 'connected',
      lastUpdateTime: '',
      canGoBack,
    },
    global: { plugins: [ElementPlus, createPinia()] },
  })
  const host = wrapper.find('.hud-btn-host')
  await host.trigger('mouseenter')
  // el-tooltip 的显示走延时器，等一拍再读 teleport 到 body 的浮层
  await new Promise(resolve => setTimeout(resolve, 50))
  return { wrapper, host, popper: document.querySelector<HTMLElement>('.el-popper') }
}

describe('预览页 HUD 返回上一画面', () => {
  it('没有跳转记录时按钮禁用，但悬停仍给出原因', async () => {
    const { host, popper } = await mountHeader(false)
    expect(host.classes()).toContain('is-disabled')
    expect(host.find('button').attributes('disabled')).toBeDefined()
    expect(popper?.textContent).toContain('还没有画面跳转记录')
  })

  it('有跳转记录时提示改成「能回到哪」，且气泡用随主题的 light 档', async () => {
    const { wrapper, host, popper } = await mountHeader(true)
    expect(host.classes()).not.toContain('is-disabled')
    expect(wrapper.text()).toContain('返回上一画面')
    expect(popper?.textContent).toContain('回到刚才看的那张画面')
    // dark 档在暗色主题下会被 EP 变量反转成白底，HUD 上突兀
    expect(popper?.classList.contains('is-light')).toBe(true)
  })
})
