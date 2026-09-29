import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '@/stores/projectStore'
import { usePageStore } from '@/stores/pageStore'
import { findTag } from '@/types/tag'

/**
 * 示例工程校验：examples/demo-project.json 是给新用户导入的样板，
 * 结构一旦和实现漂移，导入后就是空白或报错，所以在 CI 里直接跑一遍导入路径。
 */
const file = path.resolve(__dirname, './demo-project.json')

describe('示例工程 demo-project.json', () => {
  let project: ReturnType<typeof useProjectStore>
  let pages: ReturnType<typeof usePageStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    project = useProjectStore()
    pages = usePageStore()
  })

  it('是合法 JSON 且版本为 1.1 的多画面结构', () => {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    expect(raw.version).toBe('1.1')
    expect(Array.isArray(raw.pages)).toBe(true)
    expect(raw.pages.length).toBeGreaterThan(1)
  })

  it('导入后画面、元素、连线都被正确装载', () => {
    const ok = project.importProject(readFileSync(file, 'utf8'))
    expect(ok).toBe(true)

    expect(pages.pageCount).toBe(2)
    expect(pages.activePageId).toBe('page_demo_main')

    const main = pages.pages[0]
    const ids = main.elements.map(el => el.id)
    expect(ids).toContain('el_demo_tank')
    expect(ids).toContain('el_demo_setpoint')
    expect(main.connections).toHaveLength(2)

    // 连线必须携带坐标点，空 points 不会渲染
    for (const conn of main.connections) {
      expect(conn.points.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('画面跳转使用元素顶层 navigateTo 而非 properties', () => {
    project.importProject(readFileSync(file, 'utf8'))

    const main = pages.pages[0]
    const nav = main.elements.find(el => el.id === 'el_demo_nav')!
    expect(nav.navigateTo).toBe('page_demo_trend')
    expect((nav.properties as any).navTarget).toBeUndefined()
  })

  it('点表与报警定义随工程装载，且可写点位可被查到', () => {
    project.importProject(readFileSync(file, 'utf8'))

    expect(project.tagTable.length).toBeGreaterThan(0)
    expect(project.alarmDefs.length).toBeGreaterThan(0)

    // 设定值控件绑定的点位必须可写，否则预览页写值会被点表拒绝
    const valveTag = findTag(project.tagTable, 'valve_1', 'openDegree')
    expect(valveTag?.writable).toBe(true)
  })

  it('数据源为内置 Mock，导入即可运行', () => {
    project.importProject(readFileSync(file, 'utf8'))
    expect(project.dataSourceConfig.type).toBe('mock')
  })
})
