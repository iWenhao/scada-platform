<template>
  <div class="nf-page">
    <!-- 背景层：青色网格（径向渐隐）+ 底部辉光，压在渐变底之上 -->
    <div class="nf-grid" />
    <div class="nf-glow" />

    <!-- 主题切换：与登录页一致，任何状态都要能改外观 -->
    <ThemeToggle v-slot="{ tip, icon, toggle }">
      <button class="nf-theme-fab" type="button" :title="tip" @click="toggle">
        <ToolIcon :name="icon" />
      </button>
    </ThemeToggle>

    <div class="nf-shell">
      <!-- 监控屏插画：信号波形渐平 + 警示灯闪烁，呼应 SCADA 主题 -->
      <svg class="nf-art" viewBox="0 0 280 170" fill="none" aria-hidden="true">
        <!-- 支架 -->
        <path class="nf-art-stand" d="M120 138 L116 160 H164 L160 138" />
        <rect class="nf-art-base" x="100" y="160" width="80" height="6" rx="3" />
        <!-- 屏幕外框（双层） -->
        <rect class="nf-art-frame" x="24" y="14" width="232" height="124" rx="14" />
        <rect class="nf-art-screen" x="34" y="24" width="212" height="104" rx="9" />
        <!-- 网格底纹 -->
        <g class="nf-art-gridlines">
          <path d="M34 50 H246 M34 76 H246 M34 102 H246" />
          <path d="M70 24 V128 M106 24 V128 M142 24 V128 M178 24 V128 M214 24 V128" />
        </g>
        <!-- 心电波形：前段跳动，后段拉平（信号丢失） -->
        <polyline class="nf-art-wave" points="44,88 74,88 84,60 94,104 102,76 110,88 130,88 140,88 150,88 160,88 170,88 180,88 190,88 200,88 210,88 220,88 234,88" />
        <!-- 波形末端扫描点：呼吸闪烁 -->
        <circle class="nf-art-cursor" cx="234" cy="88" r="4" />
        <!-- 右下角警示灯 -->
        <circle class="nf-art-led" cx="232" cy="114" r="4" />
        <!-- 左上角标签条 -->
        <rect class="nf-art-tag" x="44" y="34" width="46" height="8" rx="4" />
      </svg>

      <!-- 大号 404：渐变字 + 错位浮动 -->
      <div class="nf-code" aria-label="404">
        <span class="nf-digit">4</span>
        <span class="nf-digit nf-digit-zero">0</span>
        <span class="nf-digit">4</span>
      </div>

      <h1 class="nf-title">页面不存在</h1>
      <p class="nf-sub">PAGE NOT FOUND · SIGNAL LOST</p>

      <!-- 出错的原始路径，帮助用户发现是哪里拼错了 -->
      <p v-if="missPath" class="nf-path">
        请求路径 <code>{{ missPath }}</code>
      </p>

      <div class="nf-actions">
        <button type="button" class="nf-btn nf-btn-primary" @click="goHome">
          <span class="nf-btn-sheen" />
          <span>返回首页</span>
        </button>
        <button type="button" class="nf-btn nf-btn-ghost" @click="goBack">返回上一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import ToolIcon from '@/components/layout/ToolIcon.vue'

const route = useRoute()
const router = useRouter()

// 通配捕获进来时 fullPath 就是用户输错的原始地址
const missPath = computed(() => {
  if (route.path === '/:pathMatch(.*)*') return ''
  return route.fullPath
})

function goHome() {
  router.replace('/')
}

function goBack() {
  // 没有历史可退（直接输地址进来）时兜底回首页
  if (window.history.length > 1) router.back()
  else router.replace('/')
}
</script>

<style src="./not-found.scss" scoped lang="scss"></style>
