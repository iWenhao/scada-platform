<template>
  <div class="alarm-panel">
    <div v-if="alarms.length" class="alarm-list">
      <div
        v-for="a in alarms"
        :key="a.elementId + a.ruleName"
        class="alarm-row"
        :class="{ danger: a.color === '#ff4757', warning: a.color === '#ffa502' }"
      >
        <span class="alarm-dot" :style="{ background: a.color }"></span>
        <span class="alarm-name">{{ a.elementName }}</span>
        <span class="alarm-status">{{ a.ruleName }}</span>
        <span class="alarm-value">{{ a.value }}</span>
      </div>
    </div>
    <div v-else class="alarm-empty">暂无报警</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { statusEngine } from '@/status/StatusEngine'

const ALARM_COLORS = new Set(['#ff4757', '#ffa502'])

const canvasStore = useCanvasStore()
const deviceStore = useDeviceStore()

const emit = defineEmits<{
  'update:count': [count: number]
}>()

const lastTick = ref(0)
let timer: number | null = null

const alarms = computed(() => {
  void lastTick.value
  const result: Array<{
    elementId: string
    elementName: string
    ruleName: string
    color: string
    value: string
  }> = []

  for (const el of canvasStore.elements) {
    if (!el.statusRules?.length || el.locked) continue
    const data = deviceStore.getDeviceData(el.deviceId || el.id)
    const matched = statusEngine.evaluate(el.statusRules, data)
    if (!matched || !ALARM_COLORS.has(matched.color)) continue

    // 获取当前值展示
    const binding = el.dataBindings?.[0]
    const raw = binding ? data[binding.variable] : undefined
    const val = raw !== undefined
      ? (typeof raw === 'number' ? String(Math.round(raw * 10) / 10) : String(raw))
      : '-'

    result.push({
      elementId: el.id,
      elementName: el.name,
      ruleName: matched.name,
      color: matched.color,
      value: val,
    })
  }
  return result.sort((a, b) => {
    if (a.color === b.color) return 0
    return a.color === '#ff4757' ? -1 : 1
  })
})

// 通知外部报警数量
watch(alarms, (list) => { emit('update:count', list.length) }, { immediate: true })

// 定时刷新（数据源推送频率可能低于报警检测需求）
timer = window.setInterval(() => { lastTick.value = Date.now() }, 2000)

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped lang="scss">
.alarm-panel {
  max-height: 300px;
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

  &.danger {
    border-left-color: #ff4757;
    background: rgba(255, 71, 87, 0.08);
  }

  &.warning {
    border-left-color: #ffa502;
    background: rgba(255, 165, 2, 0.08);
  }
}

.alarm-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.alarm-name {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 80px;
}

.alarm-status {
  color: var(--text-secondary);
  flex: 1;
}

.alarm-value {
  color: var(--text-muted);
  font-family: monospace;
}

.alarm-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
