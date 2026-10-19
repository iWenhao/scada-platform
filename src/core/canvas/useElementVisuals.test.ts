// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { watchEffect } from 'vue'
import type { ComponentInstance } from '@/types/scada'
import { useElementVisuals } from './useElementVisuals'
import { DEFAULT_ELEMENT_COLOR, UNBOUND_ELEMENT_COLOR } from './elementStatus'
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

/** 带可动件的测试图元：只有它是没法测「状态接管动效」的 */
const MOTOR_TYPE = 'test_motor'
registerComponents([
  {
    type: MOTOR_TYPE,
    name: '测试电机',
    group: 'general',
    icon: '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"/></svg>',
    defaultWidth: 10,
    defaultHeight: 10,
    defaultConfig: {},
    statusRules: [],
    dataBindings: [],
    properties: [],
    motion: { rotors: [{ svg: '<circle cx="5" cy="5" r="2"/>', cx: 5, cy: 5 }] },
  },
])

/** 按给定的「数据可信性 / 数据内容」造一组 visuals */
function makeVisuals(opts: { usable?: boolean; data?: Record<string, any> } = {}) {
  return useElementVisuals({
    deviceStore: {
      getDeviceData: () => opts.data ?? {},
      isDataUsable: () => opts.usable ?? false,
    } as any,
    layerStore,
  })
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

describe('useElementVisuals · 未绑定与故障停转', () => {
  const RULES = [
    {
      id: 'fault',
      name: '故障',
      color: '#ff4d4f',
      severity: 'critical' as const,
      stopMotion: true,
      condition: { type: 'compare' as const, variable: 'state', operator: '=' as const, value: 2 },
      priority: 1,
    },
  ]

  it('有状态组件接不到可信数据时显示未绑定灰', () => {
    const { getIconStrokeColor } = makeVisuals({ usable: false })
    const el = makeElement({ type: MOTOR_TYPE, statusRules: RULES, dataBindings: [{ property: 'state', variable: 'state' }] })
    expect(getIconStrokeColor(el)).toBe(UNBOUND_ELEMENT_COLOR)
  })

  it('无状态组件不参与未绑定，恒为默认色', () => {
    const { getIconStrokeColor } = makeVisuals({ usable: false })
    expect(getIconStrokeColor(makeElement({ type: MOTOR_TYPE }))).toBe(DEFAULT_ELEMENT_COLOR)
  })

  it('无状态组件的装饰动效未绑定也照转（装饰风车一类的用途）', () => {
    const { getElementMotion } = makeVisuals({ usable: false })
    expect(getElementMotion(makeElement({ type: MOTOR_TYPE }))?.running).toBe(true)
  })

  it('有状态组件未绑定时停转：画面上不该有灰着还在转的设备', () => {
    const { getElementMotion } = makeVisuals({ usable: false })
    const el = makeElement({ type: MOTOR_TYPE, statusRules: RULES, dataBindings: [{ property: 'state', variable: 'state' }] })
    expect(getElementMotion(el)).toEqual({ running: false, speed: 0 })
  })

  it('命中故障规则时停转——动效原本只看阈值，state=2 照样过 0.1', () => {
    const { getElementMotion } = makeVisuals({ usable: true, data: { state: 2 } })
    const el = makeElement({ type: MOTOR_TYPE, statusRules: RULES, dataBindings: [{ property: 'state', variable: 'state' }] })
    expect(getElementMotion(el)).toEqual({ running: false, speed: 0 })
  })

  it('未命中停机类规则时按阈值照常运转', () => {
    const { getElementMotion } = makeVisuals({
      usable: true,
      data: { state: 1 },
    })
    const el = makeElement({
      type: MOTOR_TYPE,
      statusRules: [{ ...RULES[0], stopMotion: false }],
      dataBindings: [{ property: 'state', variable: 'state' }],
    })
    expect(getElementMotion(el)?.running).toBe(true)
  })
})
