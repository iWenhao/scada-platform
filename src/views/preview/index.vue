<template>
  <div class="preview-container">
    <div class="preview-header">
      <div class="header-left">
        <el-button @click="backToEditor">
          <el-icon><Back /></el-icon>
          返回编辑器
        </el-button>
        <span class="project-name">{{ projectStore.projectName }} - 预览模式</span>
      </div>
      
      <div class="header-right">
        <el-tag :type="connectionStatusType">
          {{ connectionStatusText }}
        </el-tag>
        <span class="last-update">
          最后更新: {{ lastUpdateTime }}
        </span>
      </div>
    </div>
    
    <div class="preview-canvas">
      <v-stage :config="stageConfig">
        <v-layer>
          <template v-for="element in canvasStore.elements" :key="element.id">
            <v-group
              :config="{
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                rotation: element.rotation,
              }"
            >
              <v-rect
                :config="{
                  width: element.width,
                  height: element.height,
                  fill: getElementColor(element),
                  stroke: '#444',
                  strokeWidth: 1,
                  cornerRadius: 4,
                }"
              />
              <v-text
                :config="{
                  text: element.name,
                  fontSize: 12,
                  fill: '#e0e0e0',
                  width: element.width,
                  align: 'center',
                  y: element.height / 2 - 6,
                }"
              />
            </v-group>
          </template>
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useProjectStore } from '@/stores/projectStore'
import { statusEngine } from '@/status/StatusEngine'
import type { ComponentInstance } from '@/types/scada'

const router = useRouter()
const canvasStore = useCanvasStore()
const deviceStore = useDeviceStore()
const projectStore = useProjectStore()

const stageConfig = computed(() => ({
  width: window.innerWidth,
  height: window.innerHeight - 60,
  scaleX: canvasStore.zoom,
  scaleY: canvasStore.zoom,
  x: canvasStore.offset.x,
  y: canvasStore.offset.y,
}))

const connectionStatusType = computed(() => {
  switch (deviceStore.connectionStatus) {
    case 'connected': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
})

const connectionStatusText = computed(() => {
  switch (deviceStore.connectionStatus) {
    case 'connected': return '已连接'
    case 'error': return '连接错误'
    default: return '未连接'
  }
})

const lastUpdateTime = ref('')

function getElementColor(element: ComponentInstance): string {
  const data = deviceStore.getDeviceData(element.id)
  const status = statusEngine.evaluate(element.statusRules, data)
  return status?.color || '#2a2a2a'
}

function backToEditor() {
  router.push('/editor')
}

function updateLastUpdateTime() {
  if (deviceStore.lastUpdateTime) {
    const date = new Date(deviceStore.lastUpdateTime)
    lastUpdateTime.value = date.toLocaleTimeString()
  }
}

let updateInterval: number | null = null

onMounted(() => {
  // 加载项目数据
  const savedProject = localStorage.getItem(`scada_project_${projectStore.projectName}`)
  if (savedProject) {
    projectStore.loadProject(projectStore.projectName)
  }
  
  // 初始化数据源
  deviceStore.initDataSource({ type: 'mock' })
  
  // 定时更新显示
  updateInterval = window.setInterval(updateLastUpdateTime, 1000)
})

onUnmounted(() => {
  deviceStore.disconnect()
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped lang="scss">
.preview-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.preview-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .project-name {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .last-update {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.preview-canvas {
  flex: 1;
  overflow: hidden;
  background: var(--bg-canvas);
  
  // 网格背景
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(var(--grid-color) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
    background-size: 20px 20px;
    opacity: 0.5;
    pointer-events: none;
  }
}

:deep(.el-button) {
  background: var(--bg-primary);
  border-color: var(--border-primary);
  color: var(--text-primary);
  
  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-active);
  }
}
</style>
