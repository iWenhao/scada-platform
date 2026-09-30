<template>
  <div class="hud-bar">
    <!-- 左：导航与画面 -->
    <div class="hud-left">
      <button class="hud-btn ghost" type="button" @click="emit('back')">
        <span class="btn-ico">←</span>
        <span>编辑器</span>
      </button>
      <button
        class="hud-btn ghost"
        type="button"
        :disabled="!canGoBack"
        @click="emit('nav-back')"
      >
        <span class="btn-ico">⤺</span>
        <span>上一画面</span>
      </button>

      <div class="hud-brand">
        <img src="/logo.svg" alt="" class="brand-logo" />
        <div class="brand-text">
          <div class="brand-name">{{ projectName }}</div>
          <div class="brand-sub">运行监控</div>
        </div>
      </div>

      <div v-if="pages.length > 1" class="page-pills">
        <button
          v-for="page in pages"
          :key="page.id"
          class="pill"
          :class="{ active: page.id === activePageId }"
          type="button"
          @click="emit('switch-page', page.id)"
        >
          {{ page.name }}
        </button>
      </div>
    </div>

    <!-- 右：状态条 -->
    <div class="hud-right">
      <div class="stat-chip" :class="connClass">
        <span class="dot" />
        <span>{{ connText }}</span>
      </div>

      <div class="stat-chip">
        <span class="chip-label">更新</span>
        <span class="chip-value mono">{{ lastUpdateTime || '--:--:--' }}</span>
      </div>

      <button
        class="hud-btn icon"
        type="button"
        :class="{ danger: activeAlarmCount > 0 }"
        :title="`${activeAlarmCount} 条活跃报警`"
        @click="alarmOpen = !alarmOpen"
      >
        <span class="btn-ico">🔔</span>
        <span v-if="unackedCount" class="badge">{{ unackedCount }}</span>
      </button>

      <button
        class="hud-btn icon"
        type="button"
        :class="{ locked: writeLocked }"
        :title="writeLocked ? '写值已锁定' : '写值未锁定'"
        @click="emit('toggle-write-lock')"
      >
        <span class="btn-ico">{{ writeLocked ? '🔒' : '🔓' }}</span>
      </button>

      <button class="hud-btn icon" type="button" title="写值审计" @click="emit('open-audit')">
        <span class="btn-ico">📋</span>
      </button>
    </div>

    <!-- 报警浮层 -->
    <div v-if="alarmOpen" class="alarm-pop">
      <AlarmPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
  canGoBack: boolean
}>()

const emit = defineEmits<{
  back: []
  'nav-back': []
  'switch-page': [id: string]
  'toggle-write-lock': []
  'open-audit': []
}>()

const alarmOpen = ref(false)

const connClass = computed(() => {
  if (props.connectionStatus === 'connected') return 'ok'
  if (props.connectionStatus === 'error') return 'bad'
  return 'warn'
})

const connText = computed(() => {
  if (props.connectionStatus === 'connected') return '已连接'
  if (props.connectionStatus === 'error') return '连接错误'
  return '未连接'
})
</script>

<style scoped lang="scss">
.hud-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 56px;
  padding: 0 16px;
  background: linear-gradient(180deg, rgba(12, 18, 36, 0.96), rgba(10, 14, 26, 0.92));
  border-bottom: 1px solid rgba(0, 212, 170, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 20;
}

.hud-left,
.hud-right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.hud-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #d7e4e8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;

  &:hover:not(:disabled) {
    border-color: rgba(0, 212, 170, 0.55);
    color: #b8fff0;
    background: rgba(0, 212, 170, 0.1);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &.icon {
    width: 36px;
    padding: 0;
    justify-content: center;
    font-size: 15px;
  }

  &.danger {
    border-color: rgba(255, 71, 87, 0.55);
    background: rgba(255, 71, 87, 0.12);
  }

  &.locked {
    border-color: rgba(255, 71, 87, 0.65);
    background: rgba(255, 71, 87, 0.18);
    color: #ffb4b4;
  }

  .badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: #ff4757;
    color: #fff;
    font-size: 10px;
    line-height: 16px;
    text-align: center;
    font-weight: 700;
  }
}

.hud-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  margin-left: 4px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-logo {
  width: 28px;
  height: 28px;
  opacity: 0.95;
}

.brand-name {
  font-size: 13px;
  font-weight: 700;
  color: #e8f1f0;
  letter-spacing: 0.4px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-sub {
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(0, 212, 170, 0.75);
  text-transform: uppercase;
}

.page-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  overflow-x: auto;
  max-width: 360px;

  &::-webkit-scrollbar {
    height: 3px;
  }
}

.pill {
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #b7c6cc;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;

  &:hover {
    border-color: rgba(0, 212, 170, 0.45);
    color: #d7fff2;
  }

  &.active {
    background: linear-gradient(135deg, #00d4aa, #00b894);
    border-color: transparent;
    color: #06241c;
    font-weight: 700;
    box-shadow: 0 4px 14px rgba(0, 212, 170, 0.35);
  }
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #cfe0e4;
  font-size: 12px;

  .chip-label {
    color: rgba(160, 176, 192, 0.8);
    font-size: 11px;
    letter-spacing: 1px;
  }

  .chip-value {
    color: #e8f1f0;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  &.ok .dot {
    background: #00d4aa;
    box-shadow: 0 0 10px rgba(0, 212, 170, 0.8);
    animation: pulse 2s ease-in-out infinite;
  }

  &.warn .dot {
    background: #ffa502;
    box-shadow: 0 0 10px rgba(255, 165, 2, 0.7);
  }

  &.bad .dot {
    background: #ff4757;
    box-shadow: 0 0 10px rgba(255, 71, 87, 0.8);
    animation: pulse 1.2s ease-in-out infinite;
  }
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.5px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.alarm-pop {
  position: absolute;
  top: 56px;
  right: 12px;
  width: 360px;
  max-height: 60vh;
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(14, 20, 36, 0.96);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  z-index: 30;
}
</style>
