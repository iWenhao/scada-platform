import type {
  ComponentDefinition,
  ComponentGroup,
  ComponentMotion,
  MotionRotor,
  StatusRule,
} from '@/types/scada'

/** 导入图元的元信息，由素材清单生成（见 scripts/subunit-manifest.json） */
export interface AssetIconMeta {
  name: string
  width: number
  height: number
}

/** 素材件的 2.5D 面基稿；`icon` 仍是生成文件里的素材原稿（见 docs/2.5D_ILLUSTRATION_GUIDE.md §4.5） */
export interface AssetIllustration {
  icon25d: string
  /** 可选：覆盖显示名，同时改属性面板里「名称」的默认值 */
  name?: string
}

/**
 * 素材图元的旋转件声明。
 *
 * 为什么按「锚点」挖而不是按坐标画一份：基图标由 scripts/import-subunit-assets.mjs
 * 从外部素材生成，元素顺序与 path 数据都不受本项目控制，照抄一份图形等于留下第二份
 * 会过期的真相。素材导出的每个部件都是自带 transform 链的完整 `<g>`（滚筒即
 * `translate(cx,cy) rotate(±) translate(-cx,-cy) translate(…)`），这段串在该图标内唯一，
 * 拿它当锚点既能整块挖出，又能在素材重新生成、几何变了之后自检出来（对不上就退回静止）。
 */
export interface AssetRotorSpec {
  /** 所在 `<g>` opening tag 里的特征串（须在该图标内唯一，重复即放弃挖取） */
  anchor: string
  /**
   * 旋转中心（基图标用户坐标）：取该分组 transform 链的不动点，
   * 即 `translate(cx, cy) rotate(θ) translate(-cx, -cy)` 里的 (cx, cy)。
   */
  cx: number
  cy: number
  /** 1 顺时针（缺省）/ -1 逆时针 */
  direction?: 1 | -1
}

/** 素材图元的动效声明（`ComponentMotion` 加上「从哪里挖」的信息） */
export interface AssetMotionSpec {
  driveVariable?: string
  threshold?: number
  degPerUnit?: number
  rotors: AssetRotorSpec[]
}

/**
 * 设备图元与手写状态灯共用的状态契约：单一 `state` 变量表达 0 停机 / 1 运行 / 2 报警。
 * 灯的变色语义必须与设备图元一致——同一画板上停停走走各说各话比没有语义更糟。
 *
 * 为什么用通用的 `state` 而不是逐台发明变量（speed / load / level…）：这批图元来自
 * 外部素材库，出厂不带语义，逐台指定会凭空造出上百个数据源里并不存在的变量。统一
 * 契约下，接入任意数据源都只需把该源的开关量或状态字接到 `state`；确需细分（如料位、
 * 温度）时在数据绑定面板改绑即可，不必改组件定义。
 *
 * severity 一律显式声明：`alarm` 标 critical，其余标 normal。按 src/types/scada.ts 的
 * 约定，若不显式声明会按颜色兜底推断，停机态的灰/红会被误判成报警而刷满报警面板。
 */
export const STATE_RULES: StatusRule[] = [
  {
    id: 'alarm',
    name: '报警',
    color: '#ff4d4f',
    severity: 'critical',
    condition: { type: 'compare', variable: 'state', operator: '=', value: 2 },
    priority: 1,
    // 报警必须停转：动效的运转判定只看驱动变量的绝对值，`state = 2` 照样过 0.1 阈值，
    // 不给这一条的话故障设备会在画面上继续转（见 useElementVisuals.getElementMotion）
    stopMotion: true,
  },
  {
    id: 'running',
    name: '运行',
    color: '#00d4aa',
    severity: 'normal',
    condition: { type: 'compare', variable: 'state', operator: '=', value: 1 },
    priority: 2,
  },
  {
    id: 'stopped',
    name: '停机',
    color: '#8c8c8c',
    severity: 'normal',
    condition: { type: 'compare', variable: 'state', operator: '=', value: 0 },
    priority: 3,
    stopMotion: true,
  },
]

/** `<g>` 与 `</g>` 的差值：正常 SVG 应为 0，非 0 说明分组没有配对 */
function gBalance(svg: string): number {
  return (svg.match(/<g\b/g) ?? []).length - (svg.match(/<\/g>/g) ?? []).length
}

/**
 * 汇总锚点分组所继承的绘制属性（fill / stroke / transform…），用于包一层包装组。
 *
 * 为什么必须补这一层：素材把 `fill="none" stroke="none"` 挂在根分组上，子元素只写自己
 * 那部分（滚筒外圈只有 `stroke="currentColor"`，不写 fill）。片段一旦脱离祖先，SVG 的
 * fill 初值就是黑色——实测挖出来的滚筒会糊成一坨黑盘。祖先的 transform 也要按顺序接上，
 * 否则片段会整体错位（素材里那对互相抵消的 translate 只是碰巧无害）。
 */
function inheritedGroupAttrs(svg: string, before: number): string {
  const stack: Array<{ attrs: string; selfClosing: boolean }> = []
  const tagRe = /<g\b([^>]*?)(\/?)>|<\/g>/g
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(svg)) !== null && m.index < before) {
    if (m[0] === '</g>') stack.pop()
    else if (!m[2]) stack.push({ attrs: m[1], selfClosing: false })
  }

  const merged = new Map<string, string>()
  const transforms: string[] = []
  for (const frame of stack) {
    for (const a of frame.attrs.matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (a[1] === 'transform') transforms.push(a[2])
      else merged.set(a[1], a[2])
    }
  }
  if (transforms.length) merged.set('transform', transforms.join(' '))
  return [...merged].map(([k, v]) => `${k}="${v}"`).join(' ')
}

/**
 * 按锚点取出完整的 `<g>`（连里面的嵌套分组一起），返回「删掉该分组后的源码」与片段本身。
 * 片段外面包一层继承组：脱离原图层级后 fill/stroke/transform 的初值会变（见上）。
 *
 * 每种定位不可靠的情形都返回 null：图标自身分组不配对、锚点缺失或重复、锚点不在
 * `<g …>` 的属性区间内、分组没有闭合、切出来的两半不各自闭合。判据是「宁可不挖（图元
 * 保持静止）也不能在机身上挖个洞」——挖错一次的代价是一部缺部件的设备，漏挖只是没动效。
 */
function extractGroup(svg: string, anchor: string): { rest: string; fragment: string } | null {
  // 输入自己就不配对时无从判断边界，切下去必然切错
  if (gBalance(svg) !== 0) return null
  const at = svg.indexOf(anchor)
  if (at < 0) return null
  if (svg.indexOf(anchor, at + anchor.length) >= 0) return null

  const openStart = svg.lastIndexOf('<g', at)
  const openEnd = svg.indexOf('>', at)
  if (openStart < 0 || openEnd < 0) return null
  // `<g` 必须是标签起始（后接空白或 `>`），且 openStart 与 openEnd 之间不能再有 `>`，
  // 两条一起保证锚点确实落在这个分组的属性区间里，而不是别的元素的文本里
  const nextChar = svg[openStart + 2]
  if (nextChar !== undefined && nextChar !== '>' && !/\s/.test(nextChar)) return null
  if (svg.indexOf('>', openStart) !== openEnd) return null

  const openTag = svg.slice(openStart, openEnd + 1)
  const wrap = (rest: string, group: string) => {
    const attrs = inheritedGroupAttrs(svg, openStart)
    return { rest, fragment: attrs ? `<g ${attrs}>${group}</g>` : group }
  }
  if (openTag.endsWith('/>')) {
    return wrap(svg.slice(0, openStart) + svg.slice(openEnd + 1), openTag)
  }

  let depth = 1
  let cursor = openEnd + 1
  while (depth > 0) {
    const close = svg.indexOf('</g>', cursor)
    if (close < 0) return null
    const nested = svg.indexOf('<g', cursor)
    if (nested >= 0 && nested < close) {
      const ch = svg[nested + 2]
      if (ch === '>' || (ch !== undefined && /\s/.test(ch))) depth += 1
      cursor = nested + 2
      continue
    }
    depth -= 1
    cursor = close + 4
  }
  const rest = svg.slice(0, openStart) + svg.slice(cursor)
  const group = svg.slice(openStart, cursor)
  // 兜住游标少走/多走一步：切错边界的那一半必然不配对
  if (gBalance(group) !== 0 || gBalance(rest) !== 0) return null
  return wrap(rest, group)
}

/**
 * 挖掉可动件后给基图补一只不可见的定位框。
 *
 * 渲染层按**内容包围盒**收紧图标（core/canvas/iconBounds.ts），滚筒一旦被挖走，基图的
 * 内容范围就缩到机身：机身随之放大，转起来的滚筒还会溢出元素矩形。素材 real/ 目录的
 * viewBox 与内容严格贴合（见 scripts/subunit-manifest.json 头部说明），所以按图标自带的
 * viewBox 铺一个不填不描的矩形，就能把包围盒钉回挖取前的口径——机身与滚筒逐像素原位。
 */
function addFramingRect(svg: string): string {
  const openTag = svg.match(/<svg\b[^>]*>/)?.[0]
  const raw = openTag?.match(/viewBox="([^"]+)"/)?.[1]
  if (!openTag || !raw) return svg
  const parts = raw.trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return svg
  if (!(parts[2] > 0) || !(parts[3] > 0)) return svg
  const rect = `<rect x="${parts[0]}" y="${parts[1]}" width="${parts[2]}" height="${parts[3]}" fill="none" stroke="none"></rect>`
  return svg.replace(openTag, openTag + rect)
}

/**
 * 按声明挖出旋转件，产出「机身基图 + motion 定义」。
 * 一条锚点都没命中（素材重新生成后 transform 变了）就原样返回静止图元，不注入动效。
 */
function carveAssetMotion(icon: string, spec: AssetMotionSpec): { icon: string; motion?: ComponentMotion } {
  const rotors: MotionRotor[] = []
  let rest = icon
  for (const rotor of spec.rotors) {
    const extracted = extractGroup(rest, rotor.anchor)
    if (!extracted) continue
    rest = extracted.rest
    rotors.push({ svg: extracted.fragment, cx: rotor.cx, cy: rotor.cy, direction: rotor.direction })
  }
  if (!rotors.length) return { icon }
  return {
    icon: addFramingRect(rest),
    motion: {
      driveVariable: spec.driveVariable,
      threshold: spec.threshold,
      degPerUnit: spec.degPerUnit,
      rotors,
    },
  }
}

/**
 * 把一批「图标 + 元信息」组装为组件定义。
 *
 * 图元为单色线条稿（`stroke="currentColor"`，无 `data-face` 标注），因此
 * core/canvas/faceLighting.ts 的 styleIcon() 会原样放行——2D 与 2.5D 下外观一致，
 * 与已迁移的面基图元共存。尺寸取素材自带的默认值，viewBox 由 core/canvas/iconBounds.ts
 * 按内容包围盒自动收紧，无需在图元里手写。
 *
 * @param group 归属分组（须已登记在 ComponentGroup 中）
 * @param icons type → SVG 源码
 * @param meta  type → 名称与默认尺寸
 * @param motion type → 可动件声明（缺省即该设备完全静止）
 */
export function buildAssetComponents(
  group: ComponentGroup,
  icons: Record<string, string>,
  meta: Record<string, AssetIconMeta>,
  motion?: Record<string, AssetMotionSpec>,
): ComponentDefinition[] {
  return Object.entries(meta).map(([type, m]) => {
    const spec = motion?.[type]
    const carved = spec
      ? carveAssetMotion(icons[type] ?? '', spec)
      : { icon: icons[type] ?? '' }
    return {
      type,
      name: m.name,
      group,
      icon: carved.icon,
      defaultWidth: m.width,
      defaultHeight: m.height,
      // animate 只在真有可动件时暴露：给静止图元挂开关等于多一个无效选项
      defaultConfig: carved.motion ? { state: 0, animate: true } : { state: 0 },
      ...(carved.motion ? { motion: carved.motion } : {}),
      statusRules: STATE_RULES,
      dataBindings: [{ property: 'state', variable: 'state' }],
      properties: [
        { key: 'name', label: '名称', type: 'string', default: m.name, group: '基本' },
        {
          key: 'state',
          label: '状态',
          type: 'select',
          default: 0,
          options: [
            { label: '停机', value: 0 },
            { label: '运行', value: 1 },
            { label: '报警', value: 2 },
          ],
          group: '基本',
        },
        ...(carved.motion
          ? [{ key: 'animate', label: '运转动效', type: 'boolean' as const, default: true, group: '基本' }]
          : []),
      ],
    }
  })
}

/**
 * 把面基稿叠加到素材图元上：`icon` 保持导入原稿（2D 画布与组件面板都读它），
 * 面基稿只写进 `icon25d`；给了 `name` 时同步属性面板的默认名。
 *
 * 单独成一个函数而不是塞进 buildAssetComponents 的参数：动效声明是第 4 个位置参数，
 * 没有动效的组要覆盖图标就得写 `undefined` 占位，读完不知道跳过的是什么。
 */
export function withIllustrations(
  defs: ComponentDefinition[],
  illustrated: Record<string, AssetIllustration>,
): ComponentDefinition[] {
  return defs.map((def) => {
    const art = illustrated[def.type]
    if (!art) return def
    const name = art.name ?? def.name
    return {
      ...def,
      name,
      icon25d: art.icon25d,
      properties: def.properties.map((p) => (p.key === 'name' ? { ...p, default: name } : p)),
    }
  })
}
