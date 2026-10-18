// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { watchEffect } from 'vue'
import type { ComponentInstance } from '@/types/scada'
import { useElementVisuals } from './useElementVisuals'
import { registerComponents } from '@/industrial/registry'
import { generalComponents } from '@/industrial/general'

// 让组件定义进入注册表，getIconImageConfig 才能按 type 取到 icon
registerComponents(generalComponents)

/**
 * 假 Image：data: URI 同样要异步解码，用微任务模拟「本帧之后才就绪」。
 * 这正是线上故障的形状——首次求值 image 还没 ready，必须靠重绘补上。
 */
class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  crossOrigin: string | null = null
  complete = false
  naturalWidth = 0
  naturalHeight = 0
  private _src = ''
  set src(value: string) {
    this._src = value
    void Promise.resolve().then(() => {
      this.complete = true
      this.naturalWidth = 512
      this.naturalHeight = 512
      this.onload?.()
    })
  }
  get src() {
    return this._src
  }
}

const deviceStore = {
  getDeviceData: () => ({}),
  isDataUsable: () => false,
} as any

const layerStore = {
  getLayer: () => undefined,
} as any

function makeElement(overrides: Partial<ComponentInstance> = {}): ComponentInstance {
  return {
    id: 'el_test',
    type: 'gen_pump1',
    x: 0,
    y: 0,
    width: 110,
    height: 80,
    rotation: 0,
    name: '泵1',
    layerId: 'layer_default',
    showName: false,
    showValue: false,
    properties: {},
    statusRules: [],
    dataBindings: [],
    ...overrides,
  }
}

/** 把一个读函数包进同步 watchEffect，返回它被求值的次数与停止函数 */
function trackReads(read: () => unknown) {
  let runs = 0
  const stop = watchEffect(
    () => {
      read()
      runs++
    },
    { flush: 'sync' },
  )
  return {
    get runs() {
      return runs
    },
    stop,
  }
}

describe('useElementVisuals · 图标异步加载的重绘链路', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', FakeImage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getIconImageConfig 订阅 iconVersion：解码完成后会重跑', () => {
    const { getIconImageConfig, iconVersion } = useElementVisuals({ deviceStore, layerStore })
    const tracked = trackReads(() => getIconImageConfig(makeElement()))

    expect(tracked.runs).toBe(1)
    // 若漏了 `void iconVersion.value`，这一递增不会触发任何重跑，下面断言会失败
    iconVersion.value++
    expect(tracked.runs).toBe(2)

    tracked.stop()
  })

  it('位图就绪后 getIconImageConfig 返回可绘配置，而不是 null', async () => {
    const { getIconImageConfig } = useElementVisuals({ deviceStore, layerStore })
    const element = makeElement({ id: 'el_loaded', type: 'gen_pump2' })

    // 首次：图还在解码，拿不到 image，只能返回 null（节点尚未创建）
    expect(getIconImageConfig(element)).toBeNull()

    await Promise.resolve()
    await Promise.resolve()

    const config = getIconImageConfig(element)
    expect(config).not.toBeNull()
    expect(config?.image).toBeTruthy()
    expect(config?.width).toBeGreaterThan(0)
    expect(config?.height).toBeGreaterThan(0)
  })

  it('getUserImageConfig 同样订阅 iconVersion', () => {
    const { getUserImageConfig, iconVersion } = useElementVisuals({ deviceStore, layerStore })
    const tracked = trackReads(() =>
      getUserImageConfig(
        makeElement({
          id: 'el_user_img',
          type: 'image',
          properties: { imageUrl: 'data:image/svg+xml,%3Csvg%20/%3E' },
        }),
      ),
    )

    expect(tracked.runs).toBe(1)
    iconVersion.value++
    expect(tracked.runs).toBe(2)

    tracked.stop()
  })
})
