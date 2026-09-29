<template>
  <div class="preview-container">
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
      @back="backToEditor"
      @nav-back="goBackPage"
      @switch-page="switchPage"
      @toggle-write-lock="toggleWriteLock"
      @open-audit="showAuditLog = true"
    />

    <PreviewStage @element-click="handleElementClick" />

    <TrendChartDialog
      v-model="showTrendDialog"
      :device-id="trendDeviceId"
      :variable="trendVariable"
    />
    <AuditLogDialog v-model="showAuditLog" />
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
const { promptWriteValue } = useWriteValue()

/** 画面导航栈：元素跳转 / 上一画面按钮共用 */
const navStack = new PageNavStack()

const showAuditLog = ref(false)
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

onMounted(async () => {
  // 支持 /preview?project=xxx 直接打开指定工程
  const target = (route.query.project as string) || projectStore.projectName
  const ok = await projectStore.loadProject(target)
  if (!ok) {
    ElMessage.error(`未能加载工程「${target}」，请从编辑器重新进入预览`)
    return
  }

  const startPage = route.query.page as string | undefined
  if (startPage && startPage !== pageStore.activePageId) {
    switchPage(startPage)
  }

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
</style>
