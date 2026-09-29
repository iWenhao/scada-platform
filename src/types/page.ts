import type { CanvasConfig } from './canvas'
import type { ComponentInstance } from './scada'
import type { Connection } from './connection'
import type { Layer } from './layer'

/**
 * 工程内的一张「画面」。
 * 每张画面持有自己的画布配置、元素、连线与图层；数据源/报警定义仍在工程级共享。
 */
export interface ScadaPage {
  id: string
  name: string
  canvasConfig: CanvasConfig
  elements: ComponentInstance[]
  connections: Connection[]
  layers: Layer[]
}

/** 工作区快照：从编辑 store 抓取的一张画面内容（不含 id/name） */
export type ScadaPageContent = Omit<ScadaPage, 'id' | 'name'>

export function createPageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
