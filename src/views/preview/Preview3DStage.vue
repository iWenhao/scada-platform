<template>
  <div ref="containerRef" class="preview-3d">
    <div class="scene-toolbar">
      <button class="scene-btn" type="button" @click="scene.resetCamera()">重置视角</button>
      <button class="scene-btn" type="button" @click="scene.topView()">俯视</button>
    </div>
    <div class="scene-hint">左键旋转 · 右键平移 · 滚轮缩放 · 点击设备查看趋势</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementVisuals } from '@/core/canvas/useElementVisuals'
import { isNameShown, isValueShown } from '@/core/canvas/elementChrome'
import { computeSceneBounds } from '@/core/scene3d/coordinates'
import { use3DScene } from '@/core/scene3d/use3DScene'
import type { Scene3DElement } from '@/core/scene3d/sceneSync'
import type { ComponentInstance } from '@/types/scada'

const emit = defineEmits<{
  'element-click': [element: ComponentInstance]
}>()

const canvasStore = useCanvasStore()
const connectionStore = useConnectionStore()
const deviceStore = useDeviceStore()
const layerStore = useLayerStore()

// 与 2D 预览共用同一套视觉口径（状态色/数值文案/图层可见性）
const {
  getElementColor,
  getElementValueText,
  isDisplayElement,
  getDisplayValueText,
  isLayerVisible,
} = useElementVisuals({ deviceStore, layerStore })

const containerRef = ref<HTMLElement>()
const selectedId = ref<string | null>(null)

let elementById = new Map<string, ComponentInstance>()

/** 元素 → 3D 视图模型；设备数据/开关变化都会触发重算，场景侧按增量消费 */
const sceneItems = computed<Scene3DElement[]>(() => {
  elementById = new Map()
  const items: Scene3DElement[] = []
  for (const el of canvasStore.elements) {
    elementById.set(el.id, el)
    if (!isLayerVisible(el.layerId)) continue
    const value = isDisplayElement(el)
      ? getDisplayValueText(el)
      : getElementValueText(el)
    items.push({
      id: el.id,
      type: el.type,
      name: el.name,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      color: getElementColor(el),
      label: isNameShown(el) ? el.name : '',
      value: isValueShown(el) ? value : '',
    })
  }
  return items
})

const sceneBounds = computed(() =>
  computeSceneBounds(canvasStore.elements, canvasStore.canvasConfig),
)

const scene = use3DScene({
  onPick(id) {
    selectedId.value = id
    if (!id) return
    const element = elementById.get(id)
    // 与 2D 预览同一套点击行为：跳转 / 写值 / 趋势
    if (element) emit('element-click', element)
  },
})

watch(sceneItems, (items) => {
  scene.updateItems(items, selectedId.value)
})

watch(selectedId, () => {
  scene.updateItems(sceneItems.value, selectedId.value)
})

watch(connectionStore.connections, () => {
  scene.updateConnections(connectionStore.connections)
})

watch(sceneBounds, (bounds) => {
  scene.setSceneBounds(bounds, canvasStore.canvasConfig.gridSize)
})

onMounted(() => {
  if (!containerRef.value) return
  scene.init(containerRef.value)
  scene.setSceneBounds(sceneBounds.value, canvasStore.canvasConfig.gridSize)
  scene.updateConnections(connectionStore.connections)
  scene.updateItems(sceneItems.value, selectedId.value)
})

onBeforeUnmount(() => {
  scene.dispose()
})
</script>

<style scoped lang="scss">
.preview-3d {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.scene-toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.scene-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(10, 16, 30, 0.72);
  color: #d7e4e8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: rgba(0, 212, 170, 0.55);
    color: #b8fff0;
  }
}

.scene-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(10, 16, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(180, 200, 210, 0.75);
  font-size: 11px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
}
</style>

<!-- 标签 DOM 由 three CSS2DRenderer 动态创建，拿不到 scoped 属性，用全局样式 -->
<style lang="scss">
.e3d-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transform: translateY(-4px);
  pointer-events: none;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;

  .e3d-label-name {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 1px 8px;
    border-radius: 4px;
    background: rgba(8, 14, 26, 0.78);
    border: 1px solid rgba(0, 212, 170, 0.35);
    color: #d7fff2;
    font-size: 11px;
    line-height: 16px;
  }

  .e3d-label-value {
    padding: 1px 8px;
    border-radius: 4px;
    background: rgba(8, 14, 26, 0.66);
    color: #8fe6d3;
    font-size: 11px;
    line-height: 15px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
}
</style>
