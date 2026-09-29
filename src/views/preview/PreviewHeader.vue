<template>
  <div class="preview-header">
    <div class="header-left">
      <el-button @click="emit('back')">
        <el-icon><Back /></el-icon>
        返回编辑器
      </el-button>
      <span class="project-name">{{ projectName }} - 预览模式</span>
      <el-select
        v-if="pages.length > 1"
        class="page-switcher"
        size="small"
        :model-value="activePageId"
        @change="(id: string) => emit('switch-page', id)"
      >
        <el-option v-for="page in pages" :key="page.id" :label="page.name" :value="page.id" />
      </el-select>
    </div>

    <div class="header-right">
      <el-tooltip :content="writeLocked ? '写值已锁定，点击解锁' : '写值已解锁，点击锁定'" placement="bottom">
        <el-button
          size="small"
          circle
          :type="writeLocked ? 'danger' : 'success'"
          :title="writeLocked ? '写值已锁定' : '写值已解锁'"
          @click="emit('toggle-write-lock')"
        >
          <el-icon><Lock v-if="writeLocked" /><Unlock v-else /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="写值审计日志" placement="bottom">
        <el-button size="small" circle title="写值审计日志" @click="emit('open-audit')">
          <el-icon><Document /></el-icon>
        </el-button>
      </el-tooltip>
      <el-badge :value="unackedCount" :hidden="!unackedCount" class="alarm-badge">
        <el-popover placement="bottom" :width="320" trigger="click">
          <template #reference>
            <el-button size="small" circle :type="activeAlarmCount ? 'danger' : 'default'" title="报警列表">
              <el-icon><Bell /></el-icon>
            </el-button>
          </template>
          <AlarmPanel />
        </el-popover>
      </el-badge>
      <el-tag :type="connectionStatusType">
        {{ connectionStatusText }}
      </el-tag>
      <span class="last-update">最后更新: {{ lastUpdateTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AlarmPanel from '@/components/layout/AlarmPanel.vue'
import type { ScadaPage } from '@/types/page'

const props = defineProps<{
  projectName: string
  pages: ScadaPage[]
  activePageId: string
  writeLocked: boolean
  unackedCount: number
  activeAlarmCount: number
  connectionStatus: 'connected' | 'error' | 'connecting' | string
  lastUpdateTime: string
}>()

const emit = defineEmits<{
  back: []
  'switch-page': [id: string]
  'toggle-write-lock': []
  'open-audit': []
}>()

const connectionStatusType = computed(() => {
  switch (props.connectionStatus) {
    case 'connected': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
})

const connectionStatusText = computed(() => {
  switch (props.connectionStatus) {
    case 'connected': return '已连接'
    case 'error': return '连接错误'
    default: return '未连接'
  }
})
</script>

<style scoped lang="scss">
.preview-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;

  .page-switcher {
    width: 160px;
  }

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
</style>
