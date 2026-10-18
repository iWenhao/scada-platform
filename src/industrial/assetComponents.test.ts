// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildAssetComponents, type AssetMotionSpec } from './assetComponents'
import { coalComponents } from './coal'
import type { ComponentDefinition, MotionRotor } from '@/types/scada'

// —— 结构自检 ——
// 挖取是对素材生成的整幅图标做字符串手术，坏一处就是一部缺部件的设备。
// 用一台两层嵌套的最小图元把「挖得干净、剩下的还能配对」钉成用例，
// 不必依赖浏览器测量（jsdom 也拿不到 getBBox，这里刻意不用）。
const MINI_ICON =
  '<svg viewBox="0 0 100 100"><g stroke="currentColor" fill="none">' +
  '<g transform="translate(20, 20) rotate(-45) translate(-20, -20)"><g fill="currentColor">' +
  '<path d="M1,1 L2,2"></path></g><circle cx="20" cy="20" r="9"></circle></g>' +
  '<rect x="40" y="40" width="10" height="10"></rect></g></svg>'
const MINI_META = { mini: { name: '小型机', width: 100, height: 100 } }
const MINI_MOTION: AssetMotionSpec = {
  driveVariable: 'state',
  rotors: [{ anchor: 'translate(20, 20) rotate(-45)', cx: 20, cy: 20 }],
}

function buildMini(icons: Record<string, string>, motion?: Record<string, AssetMotionSpec>): ComponentDefinition {
  const [def] = buildAssetComponents('coal', icons, MINI_META, motion)
  return def
}

/** `<g>` 与 `</g>` 是否配对：挖错一处就会留下坏 SVG，Konva 拿到整幅不显示 */
function gBalance(svg: string): number {
  return (svg.match(/<g\b/g) ?? []).length - (svg.match(/<\/g>/g) ?? []).length
}

describe('素材图元的可动件挖取', () => {
  it('整组挖出：片段含嵌套子分组，基图分组仍配对', () => {
    const def = buildMini({ mini: MINI_ICON }, { mini: MINI_MOTION })
    expect(def.motion?.rotors).toHaveLength(1)

    const fragment = def.motion!.rotors![0].svg
    // 片段外面包了一层「继承组」：素材把 fill/stroke 挂在根分组上，脱离祖先之后
    // 没写 fill 的圆会被按 SVG 初值涂黑（实测滚筒糊成一坨黑盘）
    expect(fragment.startsWith('<g stroke="currentColor" fill="none">')).toBe(true)
    expect(fragment).toContain('<g transform="translate(20, 20) rotate(-45)')
    expect(fragment.endsWith('</g>')).toBe(true)
    // 圆与齿都在滚筒组内，跟着一起挖走
    expect(fragment).toContain('<circle cx="20" cy="20" r="9">')
    expect(fragment).toContain('<path d="M1,1 L2,2">')

    expect(gBalance(def.icon)).toBe(0)
    expect(def.icon).toContain('<rect x="40" y="40"')
    expect(def.icon).not.toContain('M1,1 L2,2')
  })

  it('补一只不可见定位框，把基图包围盒钉回素材 viewBox', () => {
    const def = buildMini({ mini: MINI_ICON }, { mini: MINI_MOTION })
    // 不填不描：只参与包围盒测量，不画出任何东西
    expect(def.icon).toContain('<rect x="0" y="0" width="100" height="100" fill="none" stroke="none">')
  })

  it('图标没有 viewBox 时不硬造定位框（片段照旧挖出）', () => {
    const noViewBox = MINI_ICON.replace(' viewBox="0 0 100 100"', '')
    const def = buildMini({ mini: noViewBox }, { mini: MINI_MOTION })
    expect(def.motion?.rotors).toHaveLength(1)
    // 定位框是唯一带 x=0/y=0 尺寸 100 的矩形，缺 viewBox 时算不出来就不补
    expect(def.icon).not.toContain('<rect x="0" y="0" width="100" height="100"')
  })

  it('锚点缺失：保持静止、图标原样，不注入半套动效', () => {
    const def = buildMini({ mini: MINI_ICON }, { mini: { rotors: [{ anchor: 'translate(9, 9)', cx: 9, cy: 9 }] } })
    expect(def.motion).toBeUndefined()
    expect(def.icon).toBe(MINI_ICON)
  })

  it('锚点在图标里出现两次以上也不挖（定位不可靠就不能赌一半）', () => {
    const doubled = MINI_ICON + MINI_ICON.replace('<svg viewBox="0 0 100 100">', '')
    const def = buildMini({ mini: doubled }, { mini: MINI_MOTION })
    expect(def.motion).toBeUndefined()
    expect(def.icon).toBe(doubled)
  })

  it('图标自身的分组不配对时不动刀（无从判断边界，切下去必切错）', () => {
    const broken = MINI_ICON.replace('</g><rect x="40"', '<rect x="40"')
    expect(gBalance(broken)).not.toBe(0)
    const def = buildMini({ mini: broken }, { mini: MINI_MOTION })
    expect(def.motion).toBeUndefined()
    expect(def.icon).toBe(broken)
  })

  it('只有被点名的图元带动效：animate 开关跟着动效走', () => {
    const withMotion = buildMini({ mini: MINI_ICON }, { mini: MINI_MOTION })
    const withoutMotion = buildMini({ mini: MINI_ICON })
    expect(withMotion.properties.some(p => p.key === 'animate')).toBe(true)
    expect(withMotion.defaultConfig.animate).toBe(true)
    // 静止图元挂个开关等于多一个无效选项
    expect(withoutMotion.properties.some(p => p.key === 'animate')).toBe(false)
    expect(withoutMotion.defaultConfig).toEqual({ state: 0 })
  })
})

// —— 真实数据：综采采煤机的两只截割滚筒 ——
const shearer = coalComponents.find(d => d.type === 'coal_shearer_wide')!

describe('采煤机的两只滚筒', () => {
  it('两只滚筒都挖成了旋转件，右滚筒镜像故反向转', () => {
    const rotors = shearer.motion?.rotors ?? []
    expect(rotors).toHaveLength(2)
    expect(rotors[1].direction).toBe(-1)
  })

  it('旋转中心取自片段 transform 的不动点（写错一位就转偏心）', () => {
    for (const rotor of shearer.motion!.rotors!) {
      // 只取滚筒自己那个分组：包装组没有 rotate/scale，不会被匹配到
      const groupTag = rotor.svg.match(/<g transform="translate\([^>]*?(?:rotate|scale)[^>]*>/)![0]
      const translates = [...groupTag.matchAll(/translate\((-?[\d.]+), (-?[\d.]+)\)/g)].map(
        m => [parseFloat(m[1]), parseFloat(m[2])] as [number, number],
      )
      // 素材的部件分组一律写成 translate(cx,cy) 旋转/镜像 translate(-cx,-cy) 内部平移
      expect(translates[0]).toEqual([rotor.cx, rotor.cy])
      expect(translates[1]).toEqual([-rotor.cx, -rotor.cy])
    }
  })

  it('包装组补齐继承，且祖先平移自相抵消', () => {
    for (const rotor of shearer.motion!.rotors!) {
      const wrapper = rotor.svg.slice(0, rotor.svg.indexOf('>') + 1)
      // 素材把 fill/stroke 挂在根分组上，片段必须把这层继承带上
      expect(wrapper).toContain('fill="none"')
      expect(wrapper).toContain('stroke="none"')
      // 渲染侧按基图的 viewBox 坐标定位旋转中心，所以 motion.rotors 的 cx/cy 必须是
      // 基图坐标；Sketch 导出的那对互相抵消的 translate 若净位移不为 0，就得从片段里扣掉
      const net = [...wrapper.matchAll(/translate\((-?[\d.]+), (-?[\d.]+)\)/g)].reduce<[number, number]>(
        (acc, m) => [acc[0] + parseFloat(m[1]), acc[1] + parseFloat(m[2])],
        [0, 0],
      )
      expect(net).toEqual([0, 0])
    }
  })

  it('机身留在基图里：中心定位点与底框没被误挖', () => {
    expect(shearer.icon).toContain('<circle fill="currentColor" cx="78.5" cy="78.5" r="4.5">')
    expect(shearer.icon).toContain('<path d="M198.219914,180')
    expect(gBalance(shearer.icon)).toBe(0)
    expect(shearer.motion!.rotors!.every(r => gBalance(r.svg) === 0)).toBe(true)
  })

  it('基图按 viewBox 补了定位框，滚筒挖走后机身不放大', () => {
    expect(shearer.icon).toContain('<rect x="0" y="0" width="610" height="232" fill="none" stroke="none">')
  })

  it('驱动变量与状态契约同源：state 既变色又管转不转', () => {
    const rotor: MotionRotor | undefined = shearer.motion?.rotors?.[0]
    expect(shearer.motion?.driveVariable).toBe('state')
    expect(shearer.dataBindings.some(b => b.variable === 'state')).toBe(true)
    expect(rotor).toBeTruthy()
  })

  it('没声明动效的素材图元仍然完全静止', () => {
    const animated = coalComponents.filter(d => d.motion).map(d => d.type)
    expect(animated.sort()).toEqual(['coal_shearer_wide', 'conveyor', 'roadheader'])
    for (const def of coalComponents.filter(d => !d.motion)) {
      expect(def.properties.some(p => p.key === 'animate')).toBe(false)
    }
  })
})
