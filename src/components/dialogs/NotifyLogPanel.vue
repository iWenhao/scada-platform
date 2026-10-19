<template>
  <div>
    <div class="notify-toolbar">
      <el-select v-model="filterLevel" size="small" class="filter-select">
        <el-option label="全部级别" value="" />
        <el-option label="报警" value="critical" />
        <el-option label="预警" value="warning" />
      </el-select>
      <el-select v-model="filterChannel" size="small" class="filter-select">
        <el-option label="全部通道" value="" />
        <el-option v-for="n in channelNames" :key="n" :label="n" :value="n" />
      </el-select>
      <el-select v-model="filterResult" size="small" class="filter-select">
        <el-option label="全部结果" value="" />
        <el-option label="成功" value="ok" />
        <el-option label="失败" value="fail" />
      </el-select>
      <el-button size="small" :loading="loading" @click="load">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      <el-button size="small" type="danger" plain @click="handleClear">清空记录</el-button>
      <div class="spacer" />
      <span class="hint">显示 {{ filtered.length }}/{{ logs.length }} 条，仅保留最近 500 条</span>
    </div>
    <el-table v-loading="loading" :data="filtered" size="small" max-height="360" empty-text="暂无发送记录">
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ formatTime(row.t) }}</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.kind === 'recover' ? 'info' : 'warning'">
            {{ row.kind === 'recover' ? '恢复' : row.note || '触发' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="channelName" label="通道" width="110" />
      <el-table-column label="级别" width="80">
        <template #default="{ row }">
          {{ row.level === 'critical' ? '报警' : '预警' }}
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
      <el-table-column label="结果" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.ok ? 'success' : 'danger'">
            {{ row.ok ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="error" label="说明" min-width="120" show-overflow-tooltip />
    </el-table>
  </div>
</template>

<script setup lang="ts">
// 发送记录面板：从 NotifyConfigDialog 拆出（主文件加筛选后会超行数阈值）。
// 数据加载由父组件在弹窗打开/切到本 tab 时调用 load() 触发，挂载时不自动拉取。
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { clearNotifyLog, loadNotifyLog, type NotifyLogEntry } from '@/notify/notifyClient'

const logs = ref<NotifyLogEntry[]>([])
const loading = ref(false)
const filterLevel = ref('')
const filterChannel = ref('')
const filterResult = ref('')

const channelNames = computed(() => [...new Set(logs.value.map((l) => l.channelName))])

const filtered = computed(() =>
  logs.value.filter(
    (l) =>
      (!filterLevel.value || l.level === filterLevel.value) &&
      (!filterChannel.value || l.channelName === filterChannel.value) &&
      (!filterResult.value || (filterResult.value === 'ok' ? l.ok : !l.ok)),
  ),
)

function formatTime(t: number) {
  return new Date(t).toLocaleString('zh-CN')
}

async function load() {
  loading.value = true
  try {
    logs.value = await loadNotifyLog(200)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载发送记录失败')
  } finally {
    loading.value = false
  }
}

// 清空会销毁全部告警外发证据，与删除用户/通道同级，必须二次确认
async function handleClear() {
  try {
    await ElMessageBox.confirm('清空后将删除全部历史发送记录，且无法恢复。确认清空？', '清空发送记录', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await clearNotifyLog()
    logs.value = []
    ElMessage.success('已清空')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '清空失败')
  }
}

defineExpose({ load })
</script>

<style scoped lang="scss" src="./notify-config.scss"></style>
