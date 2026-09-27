<template>
  <div class="toolbar-container">
    <!-- 左侧Logo和项目名 -->
    <div class="toolbar-left">
      <img src="/logo.svg" alt="Logo" class="logo" />
      <span class="project-name">{{ projectStore.projectName }}</span>
      <el-tag v-if="projectStore.hasUnsavedChanges" type="warning" size="small">
        未保存
      </el-tag>
    </div>
    
    <!-- 中间工具栏 -->
    <div class="toolbar-center">
      <el-button-group>
        <el-tooltip content="选择 (V)" placement="bottom">
          <el-button
            :type="uiStore.activeTool === 'select' ? 'primary' : 'default'"
            @click="uiStore.setActiveTool('select')"
          >
            <el-icon><Pointer /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="连线 (L)" placement="bottom">
          <el-button
            :type="uiStore.activeTool === 'connect' ? 'primary' : 'default'"
            @click="uiStore.setActiveTool('connect')"
          >
            <el-icon><Connection /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="标尺" placement="bottom">
          <el-button
            :type="uiStore.showRuler ? 'primary' : 'default'"
            @click="uiStore.toggleRuler()"
          >
            <el-icon><Grid /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="小地图" placement="bottom">
          <el-button
            :type="uiStore.showMinimap ? 'primary' : 'default'"
            @click="uiStore.toggleMinimap()"
          >
            <el-icon><MapLocation /></el-icon>
          </el-button>
        </el-tooltip>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-button-group>
        <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
          <el-button @click="handleUndo" :disabled="!canUndo">
            <el-icon><Back /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <el-button @click="handleRedo" :disabled="!canRedo">
            <el-icon><Right /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="删除选中 (Delete)" placement="bottom">
          <el-button
            :disabled="!canvasStore.selectedId && !connectionStore.selectedConnectionId"
            @click="handleDelete"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-button-group>
        <el-tooltip content="放大" placement="bottom">
          <el-button @click="handleZoomIn">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="缩小" placement="bottom">
          <el-button @click="handleZoomOut">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="适应画布" placement="bottom">
          <el-button @click="handleZoomFit">
            <el-icon><FullScreen /></el-icon>
          </el-button>
        </el-tooltip>
      </el-button-group>
      
      <span class="zoom-level">{{ Math.round(canvasStore.zoom * 100) }}%</span>
    </div>
    
    <!-- 右侧操作 -->
    <div class="toolbar-right">
      <el-button-group>
        <el-tooltip :content="uiStore.theme === 'dark' ? '切换亮色主题' : '切换暗色主题'" placement="bottom">
          <el-button @click="uiStore.toggleTheme()">
            <el-icon>
              <Moon v-if="uiStore.theme === 'dark'" />
              <Sunny v-else />
            </el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="画布配置" placement="bottom">
          <el-button @click="showCanvasConfig = true">
            <el-icon><Setting /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="数据源配置" placement="bottom">
          <el-button @click="showDataSource = true">
            <el-icon><DataLine /></el-icon>
          </el-button>
        </el-tooltip>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-button-group>
        <el-tooltip content="保存 (Ctrl+S)" placement="bottom">
          <el-button @click="handleSave">
            <el-icon><FolderChecked /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="导出JSON" placement="bottom">
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon>
          </el-button>
        </el-tooltip>
        
        <el-tooltip content="导入JSON" placement="bottom">
          <el-button @click="handleImport">
            <el-icon><Upload /></el-icon>
          </el-button>
        </el-tooltip>
      </el-button-group>
      
      <el-divider direction="vertical" />
      
      <el-tooltip content="预览模式" placement="bottom">
        <el-button type="success" @click="handlePreview">
          <el-icon><VideoPlay /></el-icon>
          预览
        </el-button>
      </el-tooltip>
    </div>
    
    <!-- 对话框 -->
    <CanvasConfigDialog v-model="showCanvasConfig" />
    <DataSourceDialog v-model="showDataSource" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import { useHistory } from '@/core/canvas/useHistory'
import CanvasConfigDialog from '@/components/dialogs/CanvasConfigDialog.vue'
import DataSourceDialog from '@/components/dialogs/DataSourceDialog.vue'
import type { ComponentInstance } from '@/types/scada'

const router = useRouter()
const canvasStore = useCanvasStore()
const connectionStore = useConnectionStore()
const projectStore = useProjectStore()
const uiStore = useUiStore()

const { canUndo, canRedo, undo, redo, saveState, clearHistory } = useHistory()

// 对话框显示状态
const showCanvasConfig = ref(false)
const showDataSource = ref(false)

// 复制粘贴剪贴板
let clipboard: ComponentInstance | null = null

function handleCopy() {
  const selected = canvasStore.selectedElement
  if (selected) {
    clipboard = JSON.parse(JSON.stringify(selected))
  }
}

function handlePaste() {
  if (!clipboard) return

  const copy: ComponentInstance = {
    ...JSON.parse(JSON.stringify(clipboard)),
    id: `el_${Date.now()}`,
    x: clipboard.x + 20,
    y: clipboard.y + 20,
    name: `${clipboard.name} 副本`,
  }
  canvasStore.addElement(copy)
  canvasStore.selectElement(copy.id)
  saveState()
}

function handleDelete() {
  const selectedId = canvasStore.selectedId
  const selectedConnectionId = connectionStore.selectedConnectionId

  if (selectedId) {
    canvasStore.removeElement(selectedId)
    connectionStore.deleteConnectionsByElement(selectedId)
    saveState()
  } else if (selectedConnectionId) {
    connectionStore.deleteConnection(selectedConnectionId)
    saveState()
  }
}

function handleUndo() {
  undo()
}

function handleRedo() {
  redo()
}

function handleZoomIn() {
  canvasStore.setZoom(canvasStore.zoom * 1.2)
}

function handleZoomOut() {
  canvasStore.setZoom(canvasStore.zoom / 1.2)
}

function handleZoomFit() {
  canvasStore.setZoom(1)
  canvasStore.setOffset(0, 0)
}

function handleSave() {
  saveState()
  projectStore.saveProject()
}

function handleExport() {
  const json = projectStore.exportProject()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectStore.projectName}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const json = e.target?.result as string
        projectStore.importProject(json)
        clearHistory()
        saveState()
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

function handlePreview() {
  projectStore.saveProject()
  router.push('/preview')
}

// 键盘快捷键
function handleKeydown(e: KeyboardEvent) {
  // 输入框聚焦时不响应快捷键，避免打字误触
  const target = e.target as HTMLElement | null
  if (target && (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )) {
    return
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault()
      handleUndo()
    } else if (e.key === 'y') {
      e.preventDefault()
      handleRedo()
    } else if (e.key === 's') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault()
      handleCopy()
    } else if (e.key === 'v' || e.key === 'V') {
      e.preventDefault()
      handlePaste()
    }
    return
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    handleDelete()
  } else if (e.key === 'v' || e.key === 'V') {
    uiStore.setActiveTool('select')
  } else if (e.key === 'l' || e.key === 'L') {
    uiStore.setActiveTool('connect')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  saveState() // 保存初始状态
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
.toolbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .logo {
    width: 32px;
    height: 32px;
  }
  
  .project-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .zoom-level {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 40px;
    text-align: center;
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-button) {
  background: var(--bg-primary);
  border-color: var(--border-primary);
  color: var(--text-primary);
  
  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-active);
  }
  
  &.el-button--primary {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
  }
  
  &.el-button--success {
    background: var(--accent-secondary);
    border-color: var(--accent-secondary);
  }
}

:deep(.el-divider--vertical) {
  border-left-color: var(--border-primary);
}
</style>
