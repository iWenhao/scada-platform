import { vi } from 'vitest'

/**
 * 创建mock的Canvas Store
 */
export function createMockCanvasStore() {
  return {
    canvasConfig: {
      width: 1920,
      height: 1080,
      backgroundColor: '',
      showGrid: true,
      gridSize: 20,
      gridColor: '',
      enableZoom: true,
      minZoom: 0.1,
      maxZoom: 5,
      enablePan: true,
    },
    elements: [],
    selectedId: null,
    zoom: 1,
    offset: { x: 0, y: 0 },
    selectedElement: null,
    updateCanvasConfig: vi.fn(),
    resetCanvasConfig: vi.fn(),
    addElement: vi.fn(),
    updateElement: vi.fn(),
    removeElement: vi.fn(),
    removeElements: vi.fn(),
    selectElement: vi.fn(),
    clearSelection: vi.fn(),
    setZoom: vi.fn(),
    setOffset: vi.fn(),
    toJSON: vi.fn(),
    loadFromJSON: vi.fn(),
    clearCanvas: vi.fn(),
  }
}

/**
 * 创建mock的Device Store
 */
export function createMockDeviceStore() {
  return {
    deviceData: {},
    connectionStatus: 'disconnected' as const,
    lastUpdateTime: 0,
    initDataSource: vi.fn(),
    getDeviceData: vi.fn().mockReturnValue({}),
    getVariableValue: vi.fn(),
    disconnect: vi.fn(),
    reset: vi.fn(),
  }
}
