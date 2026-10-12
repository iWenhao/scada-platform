import { describe, it, expect } from 'vitest'
import { computeElementLayout, fitIconRect } from './elementLayout'

const base = { wantName: true, wantValue: true }

describe('elementLayout 分区与降级', () => {
  it('拖入尺寸（176×96）：名称与数值都有位置，图形区占主体', () => {
    const l = computeElementLayout({ width: 176, height: 96, ...base })
    expect(l.showName).toBe(true)
    expect(l.showValue).toBe(true)
    expect(l.nameHeight).toBeGreaterThan(0)
    expect(l.valueHeight).toBeGreaterThan(0)
    // 图形区 = 元素高 - 内边距 - 两个信息区
    expect(l.contentHeight).toBeCloseTo(96 - l.pad * 2 - l.nameHeight - l.valueHeight, 5)
    // 图形区应占元素高度的六成以上
    expect(l.contentHeight).toBeGreaterThan(96 * 0.5)
  })

  it('元素变矮时先撤数值、再撤名称（图形优先）', () => {
    const mid = computeElementLayout({ width: 106, height: 50, ...base })
    expect(mid.showValue).toBe(false)
    expect(mid.showName).toBe(true)

    const small = computeElementLayout({ width: 70, height: 34, ...base })
    expect(small.showName).toBe(false)
    expect(small.showValue).toBe(false)
  })

  it('信息区高度随元素高度自适应，不沿用固定像素', () => {
    const tall = computeElementLayout({ width: 120, height: 160, ...base })
    const short = computeElementLayout({ width: 120, height: 96, ...base })
    expect(tall.nameHeight).toBeGreaterThan(short.nameHeight)
    expect(tall.nameHeight).toBeLessThanOrEqual(20)
    expect(short.nameHeight).toBeGreaterThanOrEqual(12)
  })

  it('降级后图形区始终为正，且不小于最小可用高度或已无信息区可撤', () => {
    for (const h of [200, 120, 96, 80, 64, 50, 40, 34, 28, 20, 12]) {
      const l = computeElementLayout({ width: 120, height: h, ...base })
      expect(l.contentHeight).toBeGreaterThan(0)
      expect(l.contentY + l.contentHeight).toBeLessThanOrEqual(h + 1e-6)
      if (l.showName || l.showValue) {
        expect(l.contentHeight).toBeGreaterThanOrEqual(24 - 1e-6)
      }
    }
  })

  it('关闭开关时不分配对应区域', () => {
    const onlyName = computeElementLayout({ width: 160, height: 96, wantName: true, wantValue: false })
    expect(onlyName.valueHeight).toBe(0)
    expect(onlyName.showValue).toBe(false)
    expect(onlyName.showName).toBe(true)

    const none = computeElementLayout({ width: 160, height: 96, wantName: false, wantValue: false })
    expect(none.nameHeight).toBe(0)
    expect(none.valueHeight).toBe(0)
    // 无信息区时图形铺满内边距以内的整个元素
    expect(none.contentHeight).toBeCloseTo(96 - none.pad * 2, 5)
  })

  it('数值显示图元：数值即图形，不占顶部数值区，字号随尺寸收敛', () => {
    const small = computeElementLayout({ width: 128, height: 64, wantName: false, wantValue: true, isDisplay: true })
    const big = computeElementLayout({ width: 128, height: 220, wantName: false, wantValue: true, isDisplay: true })
    expect(small.valueHeight).toBe(0)
    expect(small.showValue).toBe(true)
    expect(small.displayFontSize).toBeGreaterThanOrEqual(12)
    expect(big.displayFontSize).toBeLessThanOrEqual(26)
    expect(big.displayFontSize).toBeGreaterThan(small.displayFontSize)
  })

  it('名称/数值文本纵向居中于各自区域', () => {
    const l = computeElementLayout({ width: 176, height: 96, ...base })
    expect(l.valueY).toBeGreaterThanOrEqual(l.pad)
    expect(l.valueY + l.valueFontSize).toBeLessThanOrEqual(l.pad + l.valueHeight + 1e-6)
    expect(l.nameY).toBeGreaterThanOrEqual(96 - l.nameHeight - 1e-6)
    expect(l.nameY + l.nameFontSize).toBeLessThanOrEqual(96 + 1e-6)
  })
})

describe('fitIconRect 图形适配', () => {
  // 图标与运转动效的可动件共用本函数算矩形，两边必须得到同一个结果，
  // 否则滚筒会与机身错位——这里把「同一套变换」的要求固化成用例。
  it('横向设备在宽扁图形区里受宽限制：铺满宽度，按内容长宽比定高并垂直居中', () => {
    // 图形区 168×88、内容长宽比 2.59（采煤机）：区比 1.91 < 2.59，宽度先用尽
    const r = fitIconRect(4, 4, 168, 88, 2.59)
    expect(r.width).toBeCloseTo(168, 5)
    expect(r.height).toBeCloseTo(168 / 2.59, 5)
    expect(r.x).toBeCloseTo(4, 5)
    expect(r.y).toBeCloseTo(4 + (88 - 168 / 2.59) / 2, 5)
  })

  it('横向设备在窄高图形区里受高限制：铺满高度，按内容长宽比定宽并水平居中', () => {
    // 图形区 300×72、内容长宽比 2.59：区比 4.17 > 2.59，高度先用尽
    const r = fitIconRect(0, 0, 300, 72, 2.59)
    expect(r.height).toBeCloseTo(72, 5)
    expect(r.width).toBeCloseTo(72 * 2.59, 5)
    expect(r.x).toBeCloseTo((300 - 72 * 2.59) / 2, 5)
    expect(r.y).toBeCloseTo(0, 5)
  })

  it('纵向设备受高限制：高度铺满并按内容长宽比收窄', () => {
    // 图形区 100×140、内容长宽比 0.68（储罐）：区比 0.71 > 0.68，高度先用尽
    const r = fitIconRect(0, 0, 100, 140, 0.68)
    expect(r.height).toBeCloseTo(140, 5)
    expect(r.width).toBeCloseTo(140 * 0.68, 5)
    expect(r.x).toBeCloseTo((100 - 140 * 0.68) / 2, 5)
    expect(r.y).toBeCloseTo(0, 5)
  })

  it('长宽比缺失时回退方形居中（与改造前的行为一致）', () => {
    const r = fitIconRect(4, 4, 168, 72, 0)
    expect(r.width).toBe(72)
    expect(r.height).toBe(72)
    expect(r.x).toBeCloseTo(4 + (168 - 72) / 2, 5)
    expect(r.y).toBe(4)
  })

  it('图形永远落在图形区内，不越界', () => {
    for (const aspect of [0.3, 0.68, 1, 1.58, 2.59, 6]) {
      const r = fitIconRect(4, 10, 120, 60, aspect)
      expect(r.x).toBeGreaterThanOrEqual(4 - 1e-6)
      expect(r.y).toBeGreaterThanOrEqual(10 - 1e-6)
      expect(r.x + r.width).toBeLessThanOrEqual(124 + 1e-6)
      expect(r.y + r.height).toBeLessThanOrEqual(70 + 1e-6)
    }
  })
})
