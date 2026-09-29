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
      @back="backToEditor"
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

const showAuditLog = ref(false)
const showTrendDialog = ref(false)
const trendDeviceId = ref('')
const trendVariable = ref('')
const lastUpdateTime = ref('')

function switchPage(id: string) {
  if (!pageStore.switchPage(id)) {
    ElMessage.warning('画面不存在')
    return
  }
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
  // 多画面导航优先
  if (element.navigateTo) {
    if (pageStore.switchPage(element.navigateTo)) {
      clearHistory()
      return
    }
    ElMessage.warning(`跳转目标画面不存在（${element.navigateTo}）`)
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
    pageStore.switchPage(startPage)
    clearHistory()
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
