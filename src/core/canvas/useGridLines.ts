import { computed } from 'vue'
import type { useCanvasStore } from '@/stores/canvasStore'

type CanvasStore = ReturnType<typeof useCanvasStore>

/**
 * 画布网格：小网格、大网格线与画布边界的 Konva 配置。
 */
export function useGridLines(canvasStore: CanvasStore) {
  // 画布网格组配置
  const gridGroupConfig = computed(() => ({
    x: 0,
    y: 0,
    listening: false,
  }))

  // 画布底色：透明，网格与背景由 stage-container 的 CSS 绘制（与预览一致）
  const canvasBackgroundConfig = computed(() => ({
    x: 0,
    y: 0,
    width: canvasStore.canvasConfig.width,
    height: canvasStore.canvasConfig.height,
    fill: 'transparent',
    listening: false,
  }))

  // 画布边界（只描边，不填充）
  const canvasBorderConfig = computed(() => ({
    x: 0,
    y: 0,
    width: canvasStore.canvasConfig.width,
    height: canvasStore.canvasConfig.height,
    stroke: '#444',
    strokeWidth: 2,
    fill: 'transparent',
    listening: false,
  }))

  // 小网格线
  const smallGridLines = computed(() => {
    const lines = []
    const { width, height, gridSize } = canvasStore.canvasConfig
    const gridColor = canvasStore.canvasConfig.gridColor || '#2a2a2a'

    // 垂直线
    for (let x = 0; x <= width; x += gridSize) {
      lines.push({
        id: `v_${x}`,
        config: {
          points: [x, 0, x, height],
          stroke: gridColor,
          strokeWidth: 0.5,
          opacity: 0.5,
        },
      })
    }

    // 水平线
    for (let y = 0; y <= height; y += gridSize) {
      lines.push({
        id: `h_${y}`,
        config: {
          points: [0, y, width, y],
          stroke: gridColor,
          strokeWidth: 0.5,
          opacity: 0.5,
        },
      })
    }

    return lines
  })

  // 大网格线（每5个小网格）
  const largeGridLines = computed(() => {
    const lines = []
    const { width, height, gridSize } = canvasStore.canvasConfig
    const majorGridSize = gridSize * 5
    const gridColor = canvasStore.canvasConfig.gridColor || '#333333'

    // 垂直线
    for (let x = 0; x <= width; x += majorGridSize) {
      lines.push({
        id: `mv_${x}`,
        config: {
          points: [x, 0, x, height],
          stroke: gridColor,
          strokeWidth: 1,
          opacity: 0.7,
        },
      })
    }

    // 水平线
    for (let y = 0; y <= height; y += majorGridSize) {
      lines.push({
        id: `mh_${y}`,
        config: {
          points: [0, y, width, y],
          stroke: gridColor,
          strokeWidth: 1,
          opacity: 0.7,
        },
      })
    }

    return lines
  })

  return {
    gridGroupConfig,
    canvasBackgroundConfig,
    canvasBorderConfig,
    smallGridLines,
    largeGridLines,
  }
}
