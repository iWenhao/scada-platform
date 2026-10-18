<template>
  <div class="preview-container">
    <template v-if="loadState === 'ready'">
      <PreviewHeader
        :project-name="projectStore.projectName"
        :pages="pageStore.pages"
        :active-page-id="pageStore.activePageId"
        :write-locked="uiStore.writeLocked"
        :unacked-count="alarmStore.unackedCount"
        :active-alarm-count="alarmStore.activeCount"
        :connection-status="deviceStore.connectionStatus"
        :last-update-time="lastUpdateTime"
        :can-go-back="navStack.canBack"
        :auto-rotate="autoRotate"
        @back="backToEditor"
        @nav-back="goBackPage"
        @switch-page="switchPage"
        @toggle-write-lock="toggleWriteLock"
        @open-audit="showAuditLog = true"
        @toggle-rotate="toggleAutoRotate"
        @fullscreen="toggleFullscreen"
      />

      <!-- 渲染风格（2D / 2.5D）是工程级设置，由编辑器确定；运行端只读呈现，不提供切换入口 -->
      <PreviewStage @element-click="handleElementClick" />

      <TrendChartDialog
        v-model="showTrendDialog"
        :device-id="trendDeviceId"
        :variable="trendVariable"
      />
      <AuditLogDialog v-model="showAuditLog" />

      <!-- 写值输入：按点表类型切换数值/开关/文本 -->
      <WriteValueDialog />
    </template>

    <!-- 加载中：存储是远程 API 时有明确等待态，不再白屏 -->
    <div v-else-if="loadState === 'loading'" class="preview-status">
      <div class="status-spinner" />
      <p class="status-title">正在加载工程…</p>
    </div>

    <!-- 加载失败：原先只弹一条 Message 后停留在空白 HUD，无任何出路 -->
    <div v-else class="preview-status">
      <div class="status-icon">!</div>
      <p class="status-title">未能加载工程「{{ failedTarget }}」</p>
      <p class="status-sub">工程可能未保存 / 未发布，或存储服务暂时不可用</p>
      <div class="status-actions">
        <el-button type="primary" @click="retryLoad">重试</el-button>
        <el-button @click="router.push('/')">返回首页</el-button>
        <el-button @click="router.push('/editor')">返回编辑器</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '@/stores/deviceStore'
import { useProjectStore } from '@/stores/projectStore'
import { useAlarmStore } from '@/stores/alarmStore'
import { useUiStore } from '@/stores/uiStore'
import { usePageStore } from '@/stores/pageStore'
import { useHistory } from '@/core/canvas/useHistory'
import TrendChartDialog from '@/components/dialogs/TrendChartDialog.vue'
import AuditLogDialog from '@/components/dialogs/AuditLogDialog.vue'
import WriteValueDialog from './WriteValueDialog.vue'
import PreviewHeader from './PreviewHeader.vue'
import PreviewStage from './PreviewStage.vue'
import { useWriteValue } from './useWriteValue'
import { NAV_BACK, PageNavStack } from '@/core/canvas/pageNav'
import type { ComponentInstance } from '@/types/scada'

const router = useRouter()
const route = useRoute()
const deviceStore = useDeviceStore()
const projectStore = useProjectStore()
const alarmStore = useAlarmStore()
const uiStore = useUiStore()
const pageStore = usePageStore()
const { clearHistory } = useHistory()
const { promptWriteValue, writePresetValue } = useWriteValue()

/** 画面导航栈：元素跳转 / 上一画面按钮共用 */
const navStack = new PageNavStack()

/**
 * 进入预览前抓下的编辑现场。预览页会把发布版（或草稿）灌进同一份全局 store，
 * 编辑器里新增但还没再保存的画面就在这一步被顶掉；离开时原样装回去。
 * 只在存在编辑会话时有值——从首页直接进预览时内存里是空工程，还原反而坏事。
 */
let editorSnapshot: ReturnType<typeof projectStore.snapshotEditorSession> | null = null

const showAuditLog = ref(false)
const autoRotate = ref(false)
let rotateTimer: number | null = null

function toggleAutoRotate() {
  autoRotate.value = !autoRotate.value
  if (autoRotate.value) {
    rotateTimer = window.setInterval(() => {
      if (pageStore.pages.length < 2) return
      const idx = pageStore.pages.findIndex(p => p.id === pageStore.activePageId)
      const next = pageStore.pages[(idx + 1) % pageStore.pages.length]
      switchPage(next.id)
    }, 15000)
  } else if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
}

function toggleFullscreen() {
  const el = document.documentElement
  if (!document.fullscreenElement) {
    void el.requestFullscreen?.()
  } else {
    void document.exitFullscreen?.()
  }
}
const showTrendDialog = ref(false)
const trendDeviceId = ref('')
const trendVariable = ref('')
const lastUpdateTime = ref('')

/** 切到目标页；isBack=true 表示返回（不压栈） */
function switchPage(id: string, isBack = false) {
  if (id === pageStore.activePageId) return
  const from = pageStore.activePageId
  if (!pageStore.switchPage(id)) {
    ElMessage.warning('画面不存在')
    return
  }
  if (!isBack) navStack.push(from)
  clearHistory()
}

function goBackPage() {
  const prev = navStack.pop()
  if (!prev) return
  if (prev === pageStore.activePageId) return
  pageStore.switchPage(prev)
  clearHistory()
}

function toggleWriteLock() {
  uiStore.toggleWriteLock()
  ElMessage({
    type: uiStore.writeLocked ? 'warning' : 'success',
    message: uiStore.writeLocked ? '写值已锁定，所有下发请求将被拒绝' : '写值已解锁，可以下发设定值',
  })
}

function handleElementClick(element: ComponentInstance) {
  // 导航：返回上一画面 / 跳转指定画面
  if (element.navigateTo) {
    if (element.navigateTo === NAV_BACK) {
      if (!navStack.canBack) {
        ElMessage.info('没有可返回的上一画面')
        return
      }
      goBackPage()
      return
    }
    if (!pageStore.pages.some(p => p.id === element.navigateTo)) {
      ElMessage.warning(`跳转目标画面不存在（${element.navigateTo}）`)
      return
    }
    switchPage(element.navigateTo!)
    return
  }

  if (element.type === 'setpoint') {
    promptWriteValue(element)
    return
  }

  // 操作按钮：下发值已写在属性里，跳过输入对话框直接提交
  if (element.type === 'command-button') {
    writePresetValue(element)
    return
  }

  const variable = element.dataBindings?.[0]?.variable
  if (!variable) {
    ElMessage.info('该元素没有绑定数据变量，无法查看趋势')
    return
  }
  trendDeviceId.value = element.deviceId || element.id
  trendVariable.value = variable
  showTrendDialog.value = true
}

function backToEditor() {
  router.push('/editor')
}

function updateLastUpdateTime() {
  if (deviceStore.lastUpdateTime) {
    lastUpdateTime.value = new Date(deviceStore.lastUpdateTime).toLocaleTimeString()
  }
}

let updateInterval: number | null = null

/** 工程加载状态：loading 显示等待态，failed 显示错误占位页，ready 才挂载舞台 */
const loadState = ref<'loading' | 'ready' | 'failed'>('loading')
const failedTarget = ref('')

async function loadPreviewProject() {
  loadState.value = 'loading'
  // 支持 /preview?project=xxx 直接打开指定工程
  // 默认加载发布版（无发布版回落草稿）；?source=draft 可预览工作副本
  const target = (route.query.project as string) || projectStore.projectName
  const useDraft = route.query.source === 'draft'
  const ok = useDraft
    ? await projectStore.loadProject(target)
    : await projectStore.loadPublishedProject(target)
  if (!ok) {
    failedTarget.value = target
    loadState.value = 'failed'
    return
  }

  const startPage = route.query.page as string | undefined
  if (startPage && startPage !== pageStore.activePageId) {
    switchPage(startPage)
  }
  loadState.value = 'ready'
}

function retryLoad() {
  void loadPreviewProject()
}

onMounted(async () => {
  // 快照必须在装载工程之前抓，否则抓到的已是预览要显示的那份内容
  if (uiStore.hasEditSession) editorSnapshot = projectStore.snapshotEditorSession()
  await loadPreviewProject()

  deviceStore.initDataSource(projectStore.dataSourceConfig)
  updateInterval = window.setInterval(updateLastUpdateTime, 1000)
})

watch(
  () => projectStore.dataSourceConfig,
  (config) => {
    deviceStore.initDataSource(config)
  },
)

onUnmounted(() => {
  if (rotateTimer) clearInterval(rotateTimer)
  deviceStore.disconnect()
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  // 还原编辑现场：撤销栈里装的是预览那份内容，不清掉回到编辑器一按 Ctrl+Z 就串页
  if (editorSnapshot) {
    projectStore.restoreEditorSession(editorSnapshot)
    editorSnapshot = null
    clearHistory()
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

.preview-status {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-primary);
}

.status-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.status-sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.status-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.status-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-danger);
  border: 2px solid var(--accent-danger);
}

.status-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid var(--border-primary);
  border-top-color: var(--accent-primary);
  animation: preview-spin 0.8s linear infinite;
}

@keyframes preview-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
