import type { TagDef } from '@/types/tag'
import { createTagId } from '@/types/tag'
import type { ScadaPage } from '@/types/page'
import { createPageId } from '@/types/page'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePageStore } from '@/stores/pageStore'

/**
 * 工程加载辅助：旧版单画布迁移、点表字段归一化。
 * 与 projectStore 解耦，避免 store 文件继续膨胀。
 */

/** 旧工程（单画布）包成一张「主页」 */
export function migrateLegacyToPages(projectData: Record<string, any>): ScadaPage[] {
  const canvasStore = useCanvasStore()
  const connectionStore = useConnectionStore()
  const layerStore = useLayerStore()

  if (projectData.canvas) canvasStore.loadFromJSON(projectData.canvas)
  if (projectData.connections) connectionStore.loadFromJSON(projectData.connections)
  if (projectData.layers) layerStore.loadFromJSON(projectData.layers)

  const pageStore = usePageStore()
  return [{
    id: createPageId(),
    name: '主页',
    ...pageStore.captureWorkingSet(),
  }]
}

/** 点表字段归一化，坏数据（如手改 JSON）不进运行时 */
export function normalizeTagList(raw: unknown): TagDef[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t: any) => t && t.deviceId && t.name)
    .map((t: any) => ({
      id: t.id || createTagId(),
      deviceId: String(t.deviceId),
      name: String(t.name),
      description: t.description || undefined,
      unit: t.unit || undefined,
      dataType: t.dataType === 'string' || t.dataType === 'boolean' ? t.dataType : 'number',
      min: typeof t.min === 'number' ? t.min : undefined,
      max: typeof t.max === 'number' ? t.max : undefined,
      writable: t.writable === undefined ? undefined : !!t.writable,
      note: t.note || undefined,
    }))
}
