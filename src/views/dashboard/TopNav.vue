<template>
  <div class="top-nav">
    <div class="nav-brand">
      <div class="brand-mark">
        <img :src="branding.displayIcon" :alt="branding.displayName" class="brand-logo" />
      </div>
      <div>
        <div class="brand-title">{{ branding.displayName }}</div>
        <div class="brand-sub">{{ branding.displaySubtitle }}</div>
      </div>
    </div>
    <div class="nav-actions">
      <el-dropdown @command="(c: string) => emit('system', c)">
        <span class="sys-chip">
          <el-icon class="sys-ico"><Setting /></el-icon>
          <span class="sys-text">系统设置</span>
          <el-icon class="sys-caret"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="notify">通知通道</el-dropdown-item>
            <el-dropdown-item v-if="canManageUsers" command="branding">站点品牌</el-dropdown-item>
            <el-dropdown-item v-if="canManageUsers" command="users">用户管理</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown @command="(c: string) => emit('user', c)">
        <UserChip
          :display-name="displayName"
          :user-role="role"
        />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-if="canManageUsers" command="users">用户管理</el-dropdown-item>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from '@/types/auth'
import UserChip from '@/components/common/UserChip.vue'
import { useBrandingStore } from '@/stores/brandingStore'

defineProps<{
  displayName: string
  role: Role | null
  canManageUsers: boolean
}>()

// 品牌展示是全局的部署级设置，直接读 store 而不走 props
const branding = useBrandingStore()

const emit = defineEmits<{
  system: [cmd: string]
  user: [cmd: string]
}>()
</script>
