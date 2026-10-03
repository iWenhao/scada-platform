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
        <img :src="branding.displayIcon" alt="" class="brand-logo" />
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
      <button
        class="hud-btn"
        type="button"
        :class="{ on: view3d }"
        :title="view3d ? '切回 2D 平面视图' : '切换到 3D 立体视图'"
        @click="emit('toggle-3d')"
      >
        <span class="btn-ico">🧊</span>
        <span>{{ view3d ? '3D 视图' : '2D 视图' }}</span>
      </button>

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

      <button
        class="hud-btn icon"
        type="button"
        :class="{ on: autoRotate }"
        :title="autoRotate ? '停止轮播' : '自动轮播画面'"
        @click="emit('toggle-rotate')"
      >
        <span class="btn-ico">▶▶</span>
      </button>
      <button class="hud-btn icon" type="button" title="全屏" @click="emit('fullscreen')">
        <span class="btn-ico">⛶</span>
      </button>
      <button class="hud-btn icon" type="button" title="写值审计" @click="emit('open-audit')">
        <span class="btn-ico">📋</span>
      </button>

      <ThemeToggle v-slot="{ tip, emoji, toggle }">
        <button class="hud-btn icon" type="button" :title="tip" @click="toggle">
          <span class="btn-ico">{{ emoji }}</span>
        </button>
      </ThemeToggle>
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
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import type { ScadaPage } from '@/types/page'
import { useBrandingStore } from '@/stores/brandingStore'
import { connectionStatusView } from '@/status/connection'

// 品牌图标读全局设置（默认回落 public/logo.svg）
const branding = useBrandingStore()

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
  autoRotate?: boolean
  /** 是否处于 3D 视图（由预览页持有并同步到 URL，便于分享/书签） */
  view3d?: boolean
}>()

const emit = defineEmits<{
  back: []
  'nav-back': []
  'switch-page': [id: string]
  'toggle-write-lock': []
  'open-audit': []
  'toggle-rotate': []
  fullscreen: []
  'toggle-3d': []
}>()

const alarmOpen = ref(false)

const connView = computed(() => connectionStatusView(props.connectionStatus))
const connClass = computed(() => connView.value.cls)
const connText = computed(() => connView.value.text)
</script>

<style scoped lang="scss">
/* 样式外置到 preview-header.scss：SFC 体量控制在 400 行阈值内 */
@use './preview-header.scss';
</style>
