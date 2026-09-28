<template>
  <MainLayout>
    <ScadaCanvas />
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import ScadaCanvas from '@/core/canvas/ScadaCanvas.vue'
import { useAutoSave } from '@/composables/useAutoSave'

// 编辑会话期间持续保护未保存的画面内容：定时写草稿、离开前拦截、重进可恢复
useAutoSave()
</script>
