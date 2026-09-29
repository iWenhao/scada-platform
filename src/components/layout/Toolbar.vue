<template>
  <div class="toolbar-container">
    <!-- 左侧Logo和项目名 -->
    <div class="toolbar-left">
      <el-tooltip content="返回主页" placement="bottom">
        <img src="/logo.svg" alt="返回主页" class="logo" @click="goHome" />
      </el-tooltip>
      <div class="project-name-group" title="点击重命名" @click="handleRename">
        <span class="project-name">{{ projectStore.projectName }}</span>
        <el-icon class="rename-icon"><Edit /></el-icon>
      </div>
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

        <el-tooltip content="平移 (H)" placement="bottom">
          <el-button
            :type="uiStore.activeTool === 'hand' ? 'primary' : 'default'"
            @click="uiStore.setActiveTool('hand')"
          >
            <el-icon><Rank /></el-icon>
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
          <el-button :disabled="!canUndo" @click="undo()">
            <el-icon><Back /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <el-button :disabled="!canRedo" @click="redo()">
            <el-icon><Right /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="复制 (Ctrl+C)" placement="bottom">
          <el-button
            :disabled="!canvasStore.selectedIds.length"
            @click="handleCopy"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="粘贴 (Ctrl+V)" placement="bottom">
          <el-button
            :disabled="!canvasStore.clipboard.length"
            @click="handlePaste"
          >
            <el-icon><DocumentAdd /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="删除选中 (Delete)" placement="bottom">
          <el-button
            class="btn-delete"
            :disabled="!canvasStore.selectedIds.length && !connectionStore.selectedConnectionId"
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

    <!-- 右侧：画布/文件/预览 + 账号（系统与项目配置在首页） -->
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
            <el-icon><Crop /></el-icon>
          </el-button>
        </el-tooltip>
      </el-button-group>

      <el-divider direction="vertical" />

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

        <el-tooltip content="导出图片(PNG)" placement="bottom">
          <el-button @click="handleExportImage">
            <el-icon><Picture /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip content="导入JSON" placement="bottom">
          <el-button @click="handleImport">
            <el-icon><Upload /></el-icon>
          </el-button>
        </el-tooltip>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-tooltip content="发布：把当前工程快照为运行版" placement="bottom">
        <el-button @click="handlePublish">
          <el-icon><Promotion /></el-icon>
          发布
        </el-button>
      </el-tooltip>

      <el-tooltip content="预览模式（默认显示发布版）" placement="bottom">
        <el-button type="success" @click="handlePreview">
          <el-icon><VideoPlay /></el-icon>
          预览
        </el-button>
      </el-tooltip>

      <el-dropdown @command="handleUserCommand">
        <span class="user-chip">
          <el-icon><UserFilled /></el-icon>
          {{ authStore.displayName }}
          <el-tag size="small" :type="roleTag">{{ roleLabel }}</el-tag>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-if="authStore.canManageUsers" command="users">
              用户管理
            </el-dropdown-item>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 对话框 -->
    <CanvasConfigDialog v-model="showCanvasConfig" />
    <UserManageDialog v-model="showUserManage" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import { useHistory } from '@/core/canvas/useHistory'
import CanvasConfigDialog from '@/components/dialogs/CanvasConfigDialog.vue'
import UserManageDialog from '@/components/dialogs/UserManageDialog.vue'
import { useEditClipboard } from './toolbar/useEditClipboard'
import { useProjectActions } from './toolbar/useProjectActions'
import { useToolbarShortcuts } from './toolbar/useToolbarShortcuts'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS } from '@/types/auth'

const canvasStore = useCanvasStore()
const connectionStore = useConnectionStore()
const projectStore = useProjectStore()
const uiStore = useUiStore()
const authStore = useAuthStore()

const { canUndo, canRedo, undo, redo, saveState } = useHistory()

const showCanvasConfig = ref(false)
const showUserManage = ref(false)

const roleLabel = computed(() =>
  authStore.role ? ROLE_LABELS[authStore.role] : '',
)
const roleTag = computed(() => {
  switch (authStore.role) {
    case 'admin': return 'danger'
    case 'engineer': return 'warning'
    case 'operator': return 'success'
    default: return 'info'
  }
})

async function handleUserCommand(cmd: string) {
  if (cmd === 'users') {
    showUserManage.value = true
  } else if (cmd === 'logout') {
    await authStore.logout()
    window.location.href = '/login'
  }
}

const { handleCopy, handlePaste, handleDelete } = useEditClipboard()
const {
  handleRename,
  goHome,
  handleSave,
  handleExportImage,
  handleExport,
  handleImport,
  handlePreview,
  handlePublish,
} = useProjectActions()

useToolbarShortcuts(
  { handleCopy, handlePaste, handleDelete },
  { handleSave },
)

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

onMounted(() => {
  saveState() // 保存初始状态
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
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: scale(1.1);
    }
  }

  .project-name-group {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .project-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .rename-icon {
    color: var(--text-muted);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .project-name-group:hover {
    .project-name {
      color: var(--accent-primary);
    }

    .rename-icon {
      opacity: 1;
    }
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

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 12px;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
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

  &.el-button--primary {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
  }

  &.el-button--success {
    background: var(--accent-secondary);
    border-color: var(--accent-secondary);
    color: #fff;
  }

  /* 危险按钮保持红色，不被基础样式冲掉 */
  &.el-button--danger {
    background: var(--accent-danger);
    border-color: var(--accent-danger);
    color: #fff;

    &:hover {
      background: color-mix(in srgb, var(--accent-danger) 85%, #000);
      border-color: color-mix(in srgb, var(--accent-danger) 85%, #000);
      color: #fff;
    }
  }
}

/* 删除按钮悬停/按下变红。
   必须写成 :deep 一级选择器，且 background 也要 !important——
   dark-theme.scss 里 html.dark .el-button:hover 的背景是 !important，不写会盖掉。 */
:deep(.el-button.btn-delete:hover:not(.is-disabled)),
:deep(.el-button.btn-delete:focus:not(.is-disabled)) {
  background-color: color-mix(in srgb, var(--accent-danger) 22%, var(--bg-primary)) !important;
  border-color: var(--accent-danger) !important;
  color: var(--accent-danger) !important;

  .el-icon {
    color: inherit !important;
  }
}

:deep(.el-button.btn-delete:active:not(.is-disabled)) {
  background-color: color-mix(in srgb, var(--accent-danger) 40%, var(--bg-primary)) !important;
  border-color: var(--accent-danger) !important;
  color: var(--accent-danger) !important;
}

:deep(.el-divider--vertical) {
  border-left-color: var(--border-primary);
}
</style>
