<template>
  <div class="toolbar-container">
    <!-- 左侧Logo和项目名 -->
    <div class="toolbar-left">
      <el-tooltip content="返回主页" placement="bottom">
        <img :src="branding.displayIcon" alt="返回主页" class="logo" @click="goHome" />
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
            <ToolIcon name="select" />
          </el-button>
        </el-tooltip>

        <el-tooltip content="连线 (L)" placement="bottom">
          <el-button
            :type="uiStore.activeTool === 'connect' ? 'primary' : 'default'"
            @click="uiStore.setActiveTool('connect')"
          >
            <ToolIcon name="connect" />
          </el-button>
        </el-tooltip>

        <el-tooltip content="平移 (H)" placement="bottom">
          <el-button
            :type="uiStore.activeTool === 'hand' ? 'primary' : 'default'"
            @click="uiStore.setActiveTool('hand')"
          >
            <ToolIcon name="hand" />
          </el-button>
        </el-tooltip>

        <el-tooltip content="标尺" placement="bottom">
          <el-button
            :type="uiStore.showRuler ? 'primary' : 'default'"
            @click="uiStore.toggleRuler()"
          >
            <ToolIcon name="ruler" />
          </el-button>
        </el-tooltip>

        <el-tooltip :content="uiStore.viewMode === '25d' ? '切换平面 2D' : '切换立体 2.5D'" placement="bottom">
          <el-button
            :type="uiStore.viewMode === '25d' ? 'primary' : 'default'"
            @click="uiStore.toggleViewMode()"
          >
            <ToolIcon :name="uiStore.viewMode === '25d' ? 'view-25d' : 'view-2d'" />
          </el-button>
        </el-tooltip>

        <el-tooltip content="小地图" placement="bottom">
          <el-button
            :type="uiStore.showMinimap ? 'primary' : 'default'"
            @click="uiStore.toggleMinimap()"
          >
            <ToolIcon name="minimap" />
          </el-button>
        </el-tooltip>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
          <el-button :disabled="!canUndo" @click="undo()">
            <ToolIcon name="undo" />
          </el-button>
        </el-tooltip>

        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <el-button :disabled="!canRedo" @click="redo()">
            <ToolIcon name="redo" />
          </el-button>
        </el-tooltip>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-tooltip content="放大" placement="bottom">
          <el-button @click="handleZoomIn">
            <ToolIcon name="zoom-in" />
          </el-button>
        </el-tooltip>

        <el-tooltip content="缩小" placement="bottom">
          <el-button @click="handleZoomOut">
            <ToolIcon name="zoom-out" />
          </el-button>
        </el-tooltip>

        <el-tooltip content="适应画布" placement="bottom">
          <el-button @click="handleZoomFit">
            <ToolIcon name="fit" />
          </el-button>
        </el-tooltip>
      </el-button-group>

      <span class="zoom-level">{{ Math.round(canvasStore.zoom * 100) }}%</span>
    </div>

    <!-- 右侧：发布/保存/预览 + 账号；次要操作宽屏平铺、窄屏收进「更多」 -->
    <div class="toolbar-right">
      <div class="toolbar-secondary">
        <el-button-group>
          <el-tooltip :content="uiStore.theme === 'dark' ? '切换亮色主题' : '切换暗色主题'" placement="bottom">
            <el-button @click="uiStore.toggleTheme()">
              <ToolIcon :name="uiStore.theme === 'dark' ? 'theme-dark' : 'theme-light'" />
            </el-button>
          </el-tooltip>

          <el-tooltip content="画布配置" placement="bottom">
            <el-button @click="showCanvasConfig = true">
              <ToolIcon name="canvas" />
            </el-button>
          </el-tooltip>
        </el-button-group>

        <el-divider direction="vertical" />

        <el-button-group>
          <el-tooltip content="导出JSON" placement="bottom">
            <el-button @click="handleExport">
              <ToolIcon name="download" />
            </el-button>
          </el-tooltip>

          <el-tooltip content="导出图片(PNG)" placement="bottom">
            <el-button @click="handleExportImage">
              <ToolIcon name="image" />
            </el-button>
          </el-tooltip>

          <el-tooltip content="导入JSON" placement="bottom">
            <el-button @click="handleImport">
              <ToolIcon name="upload" />
            </el-button>
          </el-tooltip>
        </el-button-group>

        <el-divider direction="vertical" />
      </div>

      <el-tooltip content="发布：把当前工程快照为运行版" placement="bottom">
        <el-button @click="handlePublish">
          <ToolIcon name="publish" />
          <span class="btn-text">发布</span>
        </el-button>
      </el-tooltip>

      <el-tooltip content="保存 (Ctrl+S)" placement="bottom">
        <el-button class="btn-save" type="primary" @click="handleSave">
          <ToolIcon name="save" />
          <span class="btn-text">保存</span>
          <el-tag v-if="projectStore.hasUnsavedChanges" size="small" class="unsaved-dot" />
        </el-button>
      </el-tooltip>

      <el-tooltip content="预览模式（默认显示发布版）" placement="bottom">
        <el-button type="success" @click="handlePreview">
          <ToolIcon name="play" />
          <span class="btn-text">预览</span>
        </el-button>
      </el-tooltip>

      <!-- 窄屏时收纳次要操作；宽屏由样式隐藏，保持原平铺布局 -->
      <el-dropdown class="toolbar-more" popper-class="toolbar-more-popper" trigger="click" @command="handleMoreCommand">
        <el-button title="更多操作">
          <ToolIcon name="more" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              command="copy"
              :disabled="!canvasStore.selectedIds.length"
            >
              <ToolIcon name="copy" />复制 (Ctrl+C)
            </el-dropdown-item>
            <el-dropdown-item
              command="paste"
              :disabled="!canvasStore.clipboard.length"
            >
              <ToolIcon name="paste" />粘贴 (Ctrl+V)
            </el-dropdown-item>
            <el-dropdown-item
              command="delete"
              :disabled="!canvasStore.selectedIds.length && !connectionStore.selectedConnectionId"
            >
              <ToolIcon name="delete" />删除选中 (Delete)
            </el-dropdown-item>
            <el-dropdown-item divided command="theme">
              <ToolIcon :name="uiStore.theme === 'dark' ? 'theme-light' : 'theme-dark'" />
              {{ uiStore.theme === 'dark' ? '切换亮色主题' : '切换暗色主题' }}
            </el-dropdown-item>
            <el-dropdown-item command="canvas">
              <ToolIcon name="canvas" />画布配置
            </el-dropdown-item>
            <el-dropdown-item divided command="export">
              <ToolIcon name="download" />导出 JSON
            </el-dropdown-item>
            <el-dropdown-item command="image">
              <ToolIcon name="image" />导出图片 (PNG)
            </el-dropdown-item>
            <el-dropdown-item command="import">
              <ToolIcon name="upload" />导入 JSON
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-dropdown @command="handleUserCommand">
        <UserChip
          :display-name="authStore.displayName"
          :username="authStore.user?.username"
          :user-role="authStore.role"
        />
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
import { ref, onMounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import { useHistory } from '@/core/canvas/useHistory'
import ToolIcon from './ToolIcon.vue'
import UserChip from '@/components/common/UserChip.vue'
import CanvasConfigDialog from '@/components/dialogs/CanvasConfigDialog.vue'
import UserManageDialog from '@/components/dialogs/UserManageDialog.vue'
import { useEditClipboard } from './toolbar/useEditClipboard'
import { useProjectActions } from './toolbar/useProjectActions'
import { useToolbarShortcuts } from './toolbar/useToolbarShortcuts'
import { useAuthStore } from '@/stores/authStore'
import { useBrandingStore } from '@/stores/brandingStore'

const canvasStore = useCanvasStore()
const connectionStore = useConnectionStore()
const projectStore = useProjectStore()
const uiStore = useUiStore()
const authStore = useAuthStore()
const branding = useBrandingStore()

const { canUndo, canRedo, undo, redo, saveState } = useHistory()

const showCanvasConfig = ref(false)
const showUserManage = ref(false)


async function handleUserCommand(cmd: string) {
  if (cmd === 'users') {
    showUserManage.value = true
  } else if (cmd === 'logout') {
    await authStore.logout()
    window.location.href = '/login'
  }
}

/** 「更多」下拉：窄屏时替代被收起的次要按钮，动作与原按钮一一对应 */
function handleMoreCommand(cmd: string) {
  switch (cmd) {
    case 'copy':
      handleCopy()
      break
    case 'paste':
      handlePaste()
      break
    case 'delete':
      handleDelete()
      break
    case 'theme':
      uiStore.toggleTheme()
      break
    case 'canvas':
      showCanvasConfig.value = true
      break
    case 'export':
      handleExport()
      break
    case 'image':
      handleExportImage()
      break
    case 'import':
      handleImport()
      break
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

<style src="./toolbar.scss" scoped lang="scss"></style>

<!-- 「更多」菜单 teleport 到 body，scoped 样式够不到，弹层样式单独给 -->
<style lang="scss">
.toolbar-more-popper .el-dropdown-menu__item {
  gap: 8px;
  align-items: center;

  .tool-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}
</style>
