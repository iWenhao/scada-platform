import { describe, it, expect } from 'vitest'
import { defaultCanvasConfig, normalizeCanvasConfig } from './canvas'

describe('defaultCanvasConfig', () => {
  it('底色与网格色留空，跟随主题变量', () => {
    expect(defaultCanvasConfig.backgroundColor).toBe('')
    expect(defaultCanvasConfig.gridColor).toBe('')
  })
})

describe('normalizeCanvasConfig', () => {
  it('无输入时回落默认值', () => {
    expect(normalizeCanvasConfig()).toEqual(defaultCanvasConfig)
    expect(normalizeCanvasConfig(null)).toEqual(defaultCanvasConfig)
  })

  it('旧工程写死的暗色默认值迁移为空串（跟随主题）', () => {
    expect(normalizeCanvasConfig({ backgroundColor: '#1e1e1e' }).backgroundColor).toBe('')
    expect(normalizeCanvasConfig({ gridColor: '#2a2a2a' }).gridColor).toBe('')
  })

  it('大小写与空白差异的旧默认值同样迁移', () => {
    expect(normalizeCanvasConfig({ backgroundColor: ' #1E1E1E ' }).backgroundColor).toBe('')
    expect(normalizeCanvasConfig({ gridColor: '#2A2A2A' }).gridColor).toBe('')
  })

  it('用户自定义颜色原样保留', () => {
    const cfg = normalizeCanvasConfig({ backgroundColor: '#ff0000', gridColor: '#00ff00' })
    expect(cfg.backgroundColor).toBe('#ff0000')
    expect(cfg.gridColor).toBe('#00ff00')
  })

  it('部分字段与默认值合并，缺省字段取默认', () => {
    const cfg = normalizeCanvasConfig({ width: 800, height: 600 })
    expect(cfg.width).toBe(800)
    expect(cfg.height).toBe(600)
    expect(cfg.gridSize).toBe(defaultCanvasConfig.gridSize)
    expect(cfg.enableZoom).toBe(true)
  })

  it('幂等：对已归一化的数据重复调用结果不变', () => {
    const once = normalizeCanvasConfig({ backgroundColor: '#1e1e1e', width: 800 })
    const twice = normalizeCanvasConfig(once)
    expect(twice).toEqual(once)
  })
})
