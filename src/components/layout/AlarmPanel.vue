<template>
  <div class="alarm-panel">
    <div class="alarm-panel-header">
      <span class="alarm-panel-title">报警列表</span>
      <div class="alarm-panel-actions">
        <span v-if="activeCount" class="alarm-stat">
          活跃 {{ activeCount }}
          <template v-if="unackedCount">· 未确认 {{ unackedCount }}</template>
        </span>
        <el-button
          v-if="unackedCount"
          size="small"
          text
          type="primary"
          @click="alarmStore.acknowledgeAll()"
        >
          全部确认
        </el-button>
      </div>
    </div>

    <div class="alarm-scroll">
      <div v-if="activeCount" class="alarm-list">
        <div
          v-for="a in activeAlarms"
          :key="a.key"
          class="alarm-row"
          :class="[a.severity, { acked: a.acknowledged }]"
        >
          <span class="alarm-dot" :style="{ background: a.color }"></span>
          <div class="alarm-main">
            <div class="alarm-line">
              <span class="alarm-name">{{ a.elementName }}</span>
              <span class="alarm-status">{{ a.ruleName }}</span>
            </div>
            <div class="alarm-line alarm-meta">
              <span>{{ a.lastValue }}</span>
              <span>{{ formatTime(a.since) }}</span>
            </div>
          </div>
          <span v-if="a.acknowledged" class="alarm-flag">已确认</span>
          <el-icon
            v-else
            class="alarm-ack"
            title="确认报警"
            @click="alarmStore.acknowledge(a.key)"
          ><Select /></el-icon>
        </div>
      </div>
      <div v-else class="alarm-empty">暂无报警</div>

      <template v-if="alarmHistory.length">
        <div class="alarm-divider">
          <span>最近恢复</span>
          <el-button size="small" text @click="alarmStore.clearHistory()">清空</el-button>
        </div>
        <div class="alarm-list">
          <div
            v-for="a in alarmHistory.slice(0, 5)"
            :key="a.key + (a.clearedAt ?? 0)"
            class="alarm-row cleared"
          >
            <span class="alarm-dot cleared-dot"></span>
            <div class="alarm-main">
              <div class="alarm-line">
                <span class="alarm-name">{{ a.elementName }}</span>
                <span class="alarm-status">{{ a.ruleName }}</span>
              </div>
              <div class="alarm-line alarm-meta">
                <span>触发 {{ formatTime(a.since) }}</span>
                <span>恢复 {{ formatTime(a.clearedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAlarmStore } from '@/stores/alarmStore'

const alarmStore = useAlarmStore()

const activeAlarms = computed(() => alarmStore.activeAlarms)
const activeCount = computed(() => alarmStore.activeCount)
const unackedCount = computed(() => alarmStore.unackedCount)
const alarmHistory = computed(() => alarmStore.alarmHistory)

function formatTime(ts: number | undefined): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}
</script>

<style scoped lang="scss">
.alarm-panel {
  width: 100%;
}

.alarm-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-primary);
}

.alarm-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.alarm-panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alarm-stat {
  font-size: 12px;
  color: var(--text-secondary);
}

.alarm-scroll {
  max-height: 340px;
  overflow-y: auto;
}

.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.alarm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  border-left: 3px solid transparent;

  &.critical {
    border-left-color: #ff4757;
    background: rgba(255, 71, 87, 0.08);
  }

  &.warning {
    border-left-color: #ffa502;
    background: rgba(255, 165, 2, 0.08);
  }

  &.acked {
    opacity: 0.62;
  }

  &.cleared {
    background: transparent;
    border-left-color: var(--border-primary);
    opacity: 0.75;
  }
}

.alarm-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cleared-dot {
  background: var(--border-primary);
}

.alarm-main {
  flex: 1;
  min-width: 0;
}

.alarm-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alarm-name {
  font-weight: 600;
  color: var(--text-primary);
}

.alarm-status {
  color: var(--text-secondary);
}

.alarm-meta {
  gap: 10px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
  font-family: monospace;
}

.alarm-flag {
  font-size: 11px;
  color: var(--accent-secondary);
}

.alarm-ack {
  cursor: pointer;
  color: var(--text-secondary);
  flex-shrink: 0;

  &:hover {
    color: var(--accent-primary);
  }
}

.alarm-divider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10px 0 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border-primary);
  font-size: 12px;
  color: var(--text-muted);
}

.alarm-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
