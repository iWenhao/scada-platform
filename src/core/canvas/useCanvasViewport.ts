import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import type { useCanvasStore } from '@/stores/canvasStore'

type CanvasStore = ReturnType<typeof useCanvasStore>

/**
 * 画布视口：舞台尺寸自适应、拖拽平移（平移工具/中键）、以指针为中心的滚轮缩放、小地图导航。
 */
export function useCanvasViewport(options: {
  stageContainerRef: Ref<HTMLElement | null>
  canvasStore: CanvasStore
}) {
  const { stageContainerRef, canvasStore } = options

  // 舞台实际尺寸（随容器尺寸自适应）
  const stageSize = ref({ width: 800, height: 400 })
  let containerObserver: ResizeObserver | null = null

  // 平移状态
  let panning = false
  const panStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 }

  // 画布Stage配置
  const stageConfig = computed(() => ({
    width: stageSize.value.width,
    height: stageSize.value.height,
    scaleX: canvasStore.zoom,
    scaleY: canvasStore.zoom,
    x: canvasStore.offset.x,
    y: canvasStore.offset.y,
  }))

  function beginPan(stage: any) {
    const pos = stage.getPointerPosition()
    if (!pos) return
    panning = true
    panStart.x = pos.x
    panStart.y = pos.y
    panStart.offsetX = canvasStore.offset.x
    panStart.offsetY = canvasStore.offset.y
  }

  /** 移动中处理平移；返回是否处于平移状态（调用方可据此短路后续逻辑） */
  function movePan(stage: any): boolean {
    if (!panning) return false
    const pos = stage.getPointerPosition()
    if (pos) {
      canvasStore.setOffset(
        panStart.offsetX + (pos.x - panStart.x),
        panStart.offsetY + (pos.y - panStart.y),
      )
    }
    return true
  }

  function endPan() {
    panning = false
  }

  /** 滚轮缩放（以指针为中心） */
  function onWheel(e: any) {
    e.evt.preventDefault()
    const scaleBy = 1.1
    const stage = e.target.getStage()
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const rawScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    canvasStore.setZoom(rawScale)
    const newScale = canvasStore.zoom

    // 保持指针下的画布点不动：pointer = point * scale + offset
    const pointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    canvasStore.setOffset(
      pointer.x - pointTo.x * newScale,
      pointer.y - pointTo.y * newScale,
    )
  }

  /** 小地图导航：把画布坐标居中显示 */
  function navigateTo(x: number, y: number) {
    canvasStore.setOffset(
      stageSize.value.width / 2 - x * canvasStore.zoom,
      stageSize.value.height / 2 - y * canvasStore.zoom,
    )
  }

  onMounted(() => {
    // 监听舞台容器尺寸，舞台自适应并支持窗口缩放
    if (stageContainerRef.value && 'ResizeObserver' in window) {
      containerObserver = new ResizeObserver((entries) => {
        const rect = entries[0].contentRect
        stageSize.value = {
          width: Math.max(rect.width, 100),
          height: Math.max(rect.height, 100),
        }
      })
      containerObserver.observe(stageContainerRef.value)
    }
  })

  onUnmounted(() => {
    containerObserver?.disconnect()
  })

  return {
    stageSize,
    stageConfig,
    beginPan,
    movePan,
    endPan,
    onWheel,
    navigateTo,
  }
}
