import { describe, it, expect } from 'vitest'
import type { ComponentInstance } from '@/types/scada'
import { computeElementLayout } from './elementLayout'
import {
  resolveMotionTiming,
  makeIconFrame,
  placeRotor,
  buildBeltConfig,
  getRotorConfigs,
  getBeltConfigs,
} from './elementMotion'
import { registerComponents } from '@/industrial/registry'
import {
  coalComponents,
  RoadheaderDefinition,
  ConveyorDefinition,
} from '@/industrial/coal'

registerComponents(coalComponents)

// —— 坐标换算：图标与可动件必须落在同一套 contain 变换上 ——
// 几何取一条横向双滚筒图元的实测值：图标内容包围盒 x6..94 / y46..80（描边补偿 1.8），
// 左滚筒截齿 x7..33 / y46..74，滚筒圆心 (20,60)。数值写死在此，与组件定义解耦。
const layout = computeElementLayout({ width: 176, height: 96, wantName: false, wantValue: false })
const iconBounds = { x: 4.2, y: 44.2, width: 91.6, height: 37.6 }
const frame = makeIconFrame(iconBounds, layout)
const leftRotorBox = { x: 5.2, y: 44.2, width: 29.6, height: 31.6 }

describe('resolveMotionTiming 速率换算', () => {
  it('速度为 0 就不动（不靠速率下限硬撑出转动）', () => {
    expect(resolveMotionTiming(0)).toEqual({ degPerSec: 0, beltPxPerSec: 0 })
    expect(resolveMotionTiming(Number.NaN).degPerSec).toBe(0)
  })

  it('角速度随速度值增长，并钳在上下限之间', () => {
    // 缺省系数 70 度/秒：速度 1 时低于下限，被抬到 110
    expect(resolveMotionTiming(1).degPerSec).toBe(110)
    expect(resolveMotionTiming(2).degPerSec).toBe(140)
    // 高速时钳到上限，避免截齿转速过高被采样成静止或倒转
    expect(resolveMotionTiming(50).degPerSec).toBe(400)
  })

  it('每组件可调角速度系数', () => {
    expect(resolveMotionTiming(1, 200).degPerSec).toBe(200)
    expect(resolveMotionTiming(1, 0).degPerSec).toBe(110)
  })

  it('带面流速有下限与上限', () => {
    expect(resolveMotionTiming(0.1).beltPxPerSec).toBe(30)
    expect(resolveMotionTiming(50).beltPxPerSec).toBe(120)
  })
})

describe('placeRotor 摆放', () => {
  it('x/y 指向指定圆心，offset 指向圆心相对图片左上角的偏移', () => {
    const cfg = placeRotor(frame, leftRotorBox, { cx: 20, cy: 60 }, 0, 'IMG')!
    expect(cfg.x).toBeCloseTo(frame.mapX(20), 5)
    expect(cfg.y).toBeCloseTo(frame.mapY(60), 5)
    // 图片左上角 = x - offsetX，必须落回包围盒映射出的位置，否则旋转会绕错点
    expect(cfg.x - cfg.offsetX).toBeCloseTo(frame.mapX(leftRotorBox.x), 5)
    expect(cfg.y - cfg.offsetY).toBeCloseTo(frame.mapY(leftRotorBox.y), 5)
    expect(cfg.width).toBeCloseTo(leftRotorBox.width * frame.scale, 5)
    expect(cfg.height).toBeCloseTo(leftRotorBox.height * frame.scale, 5)
    expect(cfg.image).toBe('IMG')
    expect(cfg.listening).toBe(false)
  })

  it('圆心确实落在图片中心线上（offset 与尺寸自洽）', () => {
    const cfg = placeRotor(frame, leftRotorBox, { cx: 20, cy: 60 }, 0, 'IMG')!
    // 圆心到图片左上角的距离 + 圆心到图片右下角的距离 = 图片尺寸
    expect(cfg.offsetX + (cfg.width - cfg.offsetX)).toBeCloseTo(cfg.width, 5)
    expect(cfg.offsetY + (cfg.height - cfg.offsetY)).toBeCloseTo(cfg.height, 5)
  })

  it('可动件落在元素边界内：不会被画到机身外面', () => {
    const rightRotorBox = { x: 65.2, y: 44.2, width: 29.6, height: 31.6 }
    for (const [box, cx] of [[leftRotorBox, 20], [rightRotorBox, 80]] as const) {
      const cfg = placeRotor(frame, box, { cx, cy: 60 }, 0, 'IMG')!
      const left = cfg.x - cfg.offsetX
      const top = cfg.y - cfg.offsetY
      expect(left).toBeGreaterThanOrEqual(0)
      expect(top).toBeGreaterThanOrEqual(0)
      expect(left + cfg.width).toBeLessThanOrEqual(176)
      expect(top + cfg.height).toBeLessThanOrEqual(96)
    }
  })

  it('方向为逆时针时角度取负', () => {
    expect(placeRotor(frame, leftRotorBox, { cx: 20, cy: 60 }, 90, 'IMG')!.rotation).toBe(90)
    expect(
      placeRotor(frame, leftRotorBox, { cx: 20, cy: 60, direction: -1 }, 90, 'IMG')!.rotation,
    ).toBe(-90)
  })

  it('包围盒退化时返回 null（不做除零，也不硬摆一个位置）', () => {
    expect(placeRotor(frame, { x: 0, y: 0, width: 0, height: 10 }, { cx: 0, cy: 0 }, 0, 'IMG')).toBeNull()
    expect(placeRotor(frame, { x: 0, y: 0, width: 10, height: 0 }, { cx: 0, cy: 0 }, 0, 'IMG')).toBeNull()
  })
})

describe('buildBeltConfig 带面流动', () => {
  const belt = { x1: 20, x2: 80, y: 62, bandHeight: 18 }

  it('dashOffset 取负才是沿输送方向推进', () => {
    expect(buildBeltConfig(frame, { ...belt, direction: 1 }, '#0f0', 100).dashOffset).toBe(-100)
    expect(buildBeltConfig(frame, { ...belt, direction: -1 }, '#0f0', 100).dashOffset).toBe(100)
  })

  it('端点映射到元素坐标，与传入顺序无关', () => {
    const forward = buildBeltConfig(frame, belt, '#0f0', 0)
    const flipped = buildBeltConfig(frame, { ...belt, x1: 80, x2: 20 }, '#0f0', 0)
    expect(forward.points).toEqual(flipped.points)
    expect(forward.points[0]).toBeLessThan(forward.points[2])
    expect(forward.points[1]).toBeCloseTo(frame.mapY(62), 5)
    expect(forward.stroke).toBe('#0f0')
    expect(forward.listening).toBe(false)
  })

  it('标记高度取自带面厚度，且不能用圆头线帽（短划被撑长会首尾相连）', () => {
    const cfg = buildBeltConfig(frame, belt, '#0f0', 0)
    // 标记高度 = 带面厚度 × 比例，上下各留出间隙（标记要读作「带面上的件」，不能顶满）
    const band = belt.bandHeight * frame.scale
    expect(cfg.strokeWidth).toBeCloseTo(band * 0.62, 5)
    expect(cfg.strokeWidth).toBeLessThan(band * 0.75)
    // 标记应明显窄于带面厚度，否则就是一整块色带而不是滚动标记
    expect(cfg.dash[0]).toBeLessThan(cfg.strokeWidth)
    expect(cfg.lineCap).toBe('butt')
  })

  it('标记尺寸随图标缩放，且有下限防止细到看不见', () => {
    const smallLayout = computeElementLayout({ width: 60, height: 32, wantName: false, wantValue: false })
    const small = buildBeltConfig(makeIconFrame(iconBounds, smallLayout), belt, '#0f0', 0)
    const big = buildBeltConfig(frame, belt, '#0f0', 0)
    expect(small.strokeWidth).toBeGreaterThanOrEqual(3)
    expect(small.dash[0]).toBeGreaterThanOrEqual(1.5)
    expect(big.strokeWidth).toBeGreaterThan(small.strokeWidth)
    expect(big.dash[0]).toBeGreaterThan(small.dash[0])
  })
})

describe('非浏览器环境的降级', () => {
  // jsdom 没有 SVG 几何能力（getBBox 不可用），测量必然失败。
  // 此时绝不能靠猜坐标画可动件——返回空数组，渲染侧自然什么都不画。
  function makeElement(type: string): ComponentInstance {
    return {
      id: `el_${type}`,
      type,
      x: 0,
      y: 0,
      width: 176,
      height: 96,
      rotation: 0,
      name: type,
      properties: {},
      statusRules: [],
      dataBindings: [],
    }
  }

  it('测量不可用时旋转件与带面都返回空，且不抛错', () => {
    expect(getRotorConfigs(makeElement('roadheader'), layout, '#0f0', '25d', 45)).toEqual([])
    expect(getBeltConfigs(makeElement('conveyor'), layout, '#0f0', 45)).toEqual([])
  })

  it('没有声明动效的组件同样返回空', () => {
    expect(getRotorConfigs(makeElement('gas_sensor'), layout, '#0f0', '25d', 45)).toEqual([])
    expect(getBeltConfigs(makeElement('gas_sensor'), layout, '#0f0', 45)).toEqual([])
  })
})

// —— 定义层自检：动效定义与图形/数据绑定不能漂移 ——
function shapeTags(svg: string): string[] {
  return (svg.match(/<(?:line|circle|rect|polygon|path)\b[^>]*>/g) ?? []).map(t =>
    t.replace(/\s+/g, ' ').trim(),
  )
}

function circleCenters(svg: string): Array<[number, number]> {
  return [...svg.matchAll(/<circle\b[^>]*?cx="([\d.]+)"[^>]*?cy="([\d.]+)"/g)].map(
    m => [parseFloat(m[1]), parseFloat(m[2])] as [number, number],
  )
}

describe('内置组件的动效定义', () => {
  // 采煤机是素材导入的图元，动效由 industrial/assetComponents.ts 挖取生成
  const shearer = coalComponents.find(d => d.type === 'coal_shearer_wide')!
  const animated = [RoadheaderDefinition, ConveyorDefinition, shearer]

  it('只给点名的三个设备加了动效', () => {
    expect(coalComponents.filter(d => d.motion).map(d => d.type).sort()).toEqual([
      'coal_shearer_wide',
      'conveyor',
      'roadheader',
    ])
  })

  it('驱动变量真实存在于 dataBindings，且有表达「运转」的状态规则', () => {
    for (const def of animated) {
      const variable = def.motion?.driveVariable
      expect(variable, `${def.type} 未声明驱动变量`).toBeTruthy()
      expect(
        def.dataBindings.some(b => b.variable === variable),
        `${def.type} 的驱动变量 ${variable} 不在 dataBindings 里，动效永远拿不到速度`,
      ).toBe(true)
      // 线色与转动必须同源：驱动变量得参与状态判定，否则会出现「线是停机的灰、却在转」
      const matched = def.statusRules.some(r => JSON.stringify(r.condition).includes(`"${variable}"`))
      expect(matched, `${def.type} 的状态规则没有用到 ${variable}`).toBe(true)
    }
  })

  it('可动件图形已从静态图标移出，不残留同一条图元', () => {
    // 采煤机的两只滚筒图元完全同形（镜像只写在分组 transform 上），
    // 这条断言顺带抓住「只挖了一只滚筒」——剩下那只的图元还在基图里
    for (const def of [RoadheaderDefinition, shearer]) {
      const iconTags = shapeTags(def.icon)
      const rotorTags = (def.motion?.rotors ?? []).flatMap(r => shapeTags(r.svg))
      expect(rotorTags.length, `${def.type} 的旋转件是空的`).toBeGreaterThan(0)
      for (const tag of rotorTags) {
        expect(iconTags, `${def.type} 的静态图标仍残留可动件图元：${tag}`).not.toContain(tag)
      }
    }
  })

  it('旋转中心与该设备的某个圆同心（滚筒/截割头）', () => {
    for (const def of [RoadheaderDefinition]) {
      const centers = circleCenters(def.icon)
      for (const rotor of def.motion?.rotors ?? []) {
        expect(centers, `${def.type} 的旋转中心 (${rotor.cx},${rotor.cy}) 与任何圆都不同心`).toContainEqual([
          rotor.cx,
          rotor.cy,
        ])
      }
    }
  })

  it('可动件留在元素图形区内，不会溢到图形区之外', () => {
    // 截齿/带面必须落在图标内容包围盒附近，否则旋转时会「飞出机身」
    const userBox = (svg: string) => {
      const xs: number[] = []
      const ys: number[] = []
      for (const m of svg.matchAll(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)) {
        xs.push(parseFloat(m[1]), parseFloat(m[3]))
        ys.push(parseFloat(m[2]), parseFloat(m[4]))
      }
      return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
    }
    for (const def of [RoadheaderDefinition]) {
      for (const rotor of def.motion?.rotors ?? []) {
        const box = userBox(rotor.svg)
        expect(box.minX).toBeGreaterThanOrEqual(0)
        expect(box.maxX).toBeLessThanOrEqual(100)
        expect(box.minY).toBeGreaterThanOrEqual(0)
        expect(box.maxY).toBeLessThanOrEqual(100)
        // 圆心落在截齿包围盒内，转动时齿才会扫过圆心四周
        expect(rotor.cx).toBeGreaterThanOrEqual(box.minX)
        expect(rotor.cx).toBeLessThanOrEqual(box.maxX)
        expect(rotor.cy).toBeGreaterThanOrEqual(box.minY)
        expect(rotor.cy).toBeLessThanOrEqual(box.maxY)
      }
    }
  })

  it('截齿在滚筒外圈之外，转动时齿根不会被机身吃掉', () => {
    // 滚筒与齿圈是两处图形（icon 里的圆 + motion.rotors 里的齿），只有一处改半径
    // 就会出现「齿长在鼓里」——这里用同心的最大圆当鼓身外圈，要求每支齿两端都在其外
    for (const def of [RoadheaderDefinition]) {
      for (const rotor of def.motion?.rotors ?? []) {
        const rim = Math.max(
          ...[...def.icon.matchAll(/<circle\b[^>]*?cx="([\d.]+)"[^>]*?cy="([\d.]+)"[^>]*?r="([\d.]+)"/g)]
            .filter(m => parseFloat(m[1]) === rotor.cx && parseFloat(m[2]) === rotor.cy)
            .map(m => parseFloat(m[3])),
        )
        expect(rim, `${def.type} 的图标里没有与旋转中心同心的圆`).toBeGreaterThan(0)
        for (const m of rotor.svg.matchAll(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)) {
          for (const [x, y] of [
            [parseFloat(m[1]), parseFloat(m[2])],
            [parseFloat(m[3]), parseFloat(m[4])],
          ]) {
            const r = Math.hypot(x - rotor.cx, y - rotor.cy)
            expect(r, `${def.type} 有一支齿落在滚筒外圈（r=${rim}）之内`).toBeGreaterThan(rim)
          }
        }
      }
    }
  })

  it('带面标记落在图标里的带面中线上（斜置带面两端高度都要对）', () => {
    // 滚动标记必须落在真正画出来的带面上；带面在图标里挪了却忘了改配置，
    // 标记就会糊到带面之外——这里把它固化成用例。
    const belt = ConveyorDefinition.motion!.belts![0]
    const top = ConveyorDefinition.icon.match(/<polygon points="([^"]+)" data-face="top"\/>/)
    expect(top).toBeTruthy()
    const pts: number[][] = [...top![1].matchAll(/([\d.]+),([\d.]+)/g)].map(m => [
      parseFloat(m[1]),
      parseFloat(m[2]),
    ])
    expect(pts).toHaveLength(4)
    // 带面是平行四边形：两条短边是端头，中线两端＝端头中点
    const ends = pts
      .map((p, i) => {
        const q = pts[(i + 1) % 4]
        return {
          len: Math.hypot(q[0] - p[0], q[1] - p[1]),
          mid: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2],
        }
      })
      .sort((a, b) => a.len - b.len)
      .slice(0, 2)
      .map(e => e.mid)
    const actual = [
      [belt.x1, belt.y],
      [belt.x2, belt.y2 ?? NaN],
    ]
    for (const [x, y] of actual) {
      const hit = ends.some(([ex, ey]) => Math.abs(ex - x) < 1e-6 && Math.abs(ey - y) < 1e-6)
      expect(hit, `标记端点 (${x},${y}) 不在带面端头的中线上`).toBe(true)
    }
    // 标记高度不能比带面还宽，否则滚动时会糊出带面
    const [a, b, c] = [pts[0], pts[1], pts[2]]
    const stripWidth =
      Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) /
      Math.hypot(b[0] - a[0], b[1] - a[1])
    expect(belt.bandHeight).toBeLessThanOrEqual(stripWidth + 1e-6)
  })

  it('动效作为组件属性暴露，用户可逐元素关闭', () => {
    for (const def of animated) {
      const prop = def.properties.find(p => p.key === 'animate')
      expect(prop, `${def.type} 缺少「运转动效」开关`).toBeTruthy()
      expect(prop?.type).toBe('boolean')
      expect(def.defaultConfig.animate).not.toBe(false)
    }
  })
})
