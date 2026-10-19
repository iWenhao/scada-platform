<template>
  <div class="hud-bar">
    <!-- 左：导航与画面 -->
    <div class="hud-left">
      <button class="hud-btn ghost" type="button" @click="emit('back')">
        <ToolIcon name="back" />
        <span>编辑器</span>
      </button>
      <!-- 气泡宿主必须是包装 span：disabled 的 button 不派发鼠标事件，挂在按钮上永远弹不出来。
           effect 用 light：EP 的 dark 气泡在暗色主题下会被变量反转成白底，HUD 上很突兀；
           light 气泡在亮色主题走 EP 默认白底，暗色主题由 dark-theme.scss 的 .el-popper.is-light 统一上色 -->
      <el-tooltip :content="backTip" placement="bottom" effect="light">
        <span class="hud-btn-host" :class="{ 'is-disabled': !canGoBack }">
          <button
            class="hud-btn ghost"
            type="button"
            :disabled="!canGoBack"
            @click="emit('nav-back')"
          >
            <ToolIcon name="prev-page" />
            <span>返回上一画面</span>
          </button>
        </span>
      </el-tooltip>

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
        <ToolIcon name="bell" />
        <span v-if="unackedCount" class="badge">{{ unackedCount }}</span>
      </button>

      <button
        class="hud-btn icon"
        type="button"
        :class="{ locked: writeLocked }"
        :title="writeLocked ? '写值已锁定' : '写值未锁定'"
        @click="emit('toggle-write-lock')"
      >
        <ToolIcon :name="writeLocked ? 'lock' : 'unlock'" />
      </button>

      <button
        class="hud-btn icon"
        type="button"
        :class="{ on: autoRotate }"
        :title="autoRotate ? '停止轮播' : '自动轮播画面'"
        @click="emit('toggle-rotate')"
      >
        <ToolIcon name="rotate" />
      </button>
      <button class="hud-btn icon" type="button" title="全屏" @click="emit('fullscreen')">
        <ToolIcon name="fullscreen" />
      </button>
      <button class="hud-btn icon" type="button" title="写值审计" @click="emit('open-audit')">
        <ToolIcon name="audit" />
      </button>

      <ThemeToggle v-slot="{ tip, icon, toggle }">
        <button class="hud-btn icon" type="button" :title="tip" @click="toggle">
          <ToolIcon :name="icon" />
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
import ToolIcon from '@/components/layout/ToolIcon.vue'
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
}>()

const emit = defineEmits<{
  back: []
  'nav-back': []
  'switch-page': [id: string]
  'toggle-write-lock': []
  'open-audit': []
  'toggle-rotate': []
  fullscreen: []
}>()

const alarmOpen = ref(false)

const connView = computed(() => connectionStatusView(props.connectionStatus))
const connClass = computed(() => connView.value.cls)
const connText = computed(() => connView.value.text)

// 只要切过画面就压栈（点标签、组件跳转、轮播都算），返回时按倒序一层层退回去
const backTip = computed(() =>
  props.canGoBack
    ? '回到刚才看的那张画面'
    : '还没有画面跳转记录：切换过画面之后，这里可以退回到上一张',
)
</script>

<style scoped lang="scss">
/* 样式外置到 preview-header.scss：SFC 体量控制在 400 行阈值内 */
@use './preview-header.scss';
</style>
