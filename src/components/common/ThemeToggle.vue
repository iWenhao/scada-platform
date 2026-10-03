<template>
  <!--
    默认渲染 Element Plus 图标按钮（首页顶栏 / 编辑器工具栏）。
    预览页 HUD、登录页这类自定义视觉的页面通过默认插槽自行渲染，
    展示语义与切换动作仍由 useThemeToggle 提供，避免各页面各写一份。
  -->
  <slot v-bind="{ theme, isDark, icon, tip, label, emoji, toggle }">
    <el-tooltip :content="tip" placement="bottom">
      <el-button class="theme-toggle" @click="toggle">
        <ToolIcon :name="icon" />
      </el-button>
    </el-tooltip>
  </slot>
</template>

<script setup lang="ts">
import ToolIcon from '@/components/layout/ToolIcon.vue'
import { useThemeToggle } from '@/composables/useThemeToggle'

const { theme, isDark, icon, tip, label, emoji, toggle } = useThemeToggle()
</script>
