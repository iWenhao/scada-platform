<template>
  <MainLayout>
    <ScadaCanvas />
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import ScadaCanvas from '@/core/canvas/ScadaCanvas.vue'
import { useAutoSave } from '@/composables/useAutoSave'
import { useUiStore } from '@/stores/uiStore'

// 标记本标签页有编辑现场，预览页离开时据此还原被发布版覆盖的画面列表
useUiStore().markEditSession()

// 编辑会话期间持续保护未保存的画面内容：定时写草稿、离开前拦截、重进可恢复
useAutoSave()
</script>
