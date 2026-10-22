// @vitest-environment jsdom
/**
 * 图元标注的全局不变量检查。
 *
 * 图标最终是 `data:` URI 交给 `<img>` 光栅化的，SVG 按 **XML** 解析：一条标签上出现
 * 两个同名属性（例如作者写了 `stroke-width="2.4"`、光照 token 又补一个），或者属性被
 * 插到自闭合标签的斜杠之后，都会让整份文档解析失败，表现是设备**直接画成空白**——
 * 类型检查和肉眼 review 都看不出来，只能靠这条覆盖全部注册组件的检查兜住。
 */
import { describe, it, expect } from 'vitest'
import './panelRegistry'
import { getAllComponents } from './registry'
import { styleIcon } from '@/core/canvas/faceLighting'

/** 用真 XML 解析器验收（与浏览器光栅化时的判据一致）；返回错误描述，合法则 null */
function parseError(svg: string): string | null {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const err = doc.getElementsByTagName('parsererror')[0]
  return err ? (err.textContent ?? '').slice(0, 140) : null
}

/** 同一条标签上重复出现的属性名 */
function duplicatedAttrs(svg: string): string[] {
  const bad: string[] = []
  for (const tag of svg.match(/<[a-zA-Z][^>]*>/g) ?? []) {
    const seen = new Set<string>()
    for (const m of tag.matchAll(/\s([a-zA-Z-]+)="[^"]*"/g)) {
      if (seen.has(m[1])) bad.push(`${m[1]} :: ${tag.slice(0, 70)}`)
      seen.add(m[1])
    }
  }
  return bad
}

/** 被引用但没有定义的渐变 id（引用不存在的渐变 = 面画不出来，看起来像线框） */
function danglingRefs(svg: string): string[] {
  const defined = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
  return [...svg.matchAll(/url\(#([^)]+)\)/g)]
    .map((m) => m[1])
    .filter((id) => !defined.has(id))
}

const annotated = getAllComponents().filter((def) =>
  /data-(?:face|edge|shadow|pipe)="/.test(def.icon ?? ''),
)

/** 面基图元（至少有一个 data-face）；完整性只针对它们，纯 data-pipe 的图元不在其列 */
const faceBased = getAllComponents().filter((def) => /data-face="/.test(def.icon ?? ''))

describe('面基图元的产出必须是合法 XML', () => {
  it('注册表里确实有已迁移的面基图元（否则本文件检查形同空跑）', () => {
    expect(annotated.length).toBeGreaterThan(0)
  })

  it('两种风格的产出都能被 XML 解析器接受（解析失败＝画布上一片空白）', () => {
    const offenders: string[] = []
    for (const def of annotated) {
      for (const mode of ['25d', '2d'] as const) {
        const err = parseError(styleIcon(def.icon, mode))
        if (err) offenders.push(`${def.type}/${mode}: ${err}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('两种风格下都不产生重复属性', () => {
    const offenders: string[] = []
    for (const def of annotated) {
      for (const mode of ['25d', '2d'] as const) {
        const dup = duplicatedAttrs(styleIcon(def.icon, mode))
        if (dup.length) offenders.push(`${def.type}/${mode}: ${dup.join(' | ')}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('立体风格引用的渐变都在片段内部定义（独立光栅化时取不到外部 defs）', () => {
    const offenders: string[] = []
    for (const def of annotated) {
      const out = styleIcon(def.icon, '25d')
      const dangling = danglingRefs(out)
      if (dangling.length) offenders.push(`${def.type}: ${dangling.join(',')}`)
    }
    expect(offenders).toEqual([])
  })

  it('展开后不留任何 data-* 痕迹（画布上的 SVG 不该带着作者的标注）', () => {
    for (const def of annotated) {
      for (const mode of ['25d', '2d'] as const) {
        expect(styleIcon(def.icon, mode), `${def.type}/${mode}`).not.toContain('data-')
      }
    }
  })
})

describe('面基图元的绘制完整性（缺阴影或棱线＝即使光照正确也明显偏平）', () => {
  it('每个面基图元都有接触阴影', () => {
    const offenders = faceBased
      .filter((def) => !/data-shadow="/.test(def.icon ?? ''))
      .map((def) => def.type)
    expect(offenders).toEqual([])
  })

  it('每个面基图元都有棱线（2.5D 下面不描边，轮廓全靠 data-edge）', () => {
    const offenders = faceBased
      .filter((def) => !/data-edge="/.test(def.icon ?? ''))
      .map((def) => def.type)
    expect(offenders).toEqual([])
  })
})
