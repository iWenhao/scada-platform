<template>
  <div class="top-nav">
    <div class="nav-brand">
      <div class="brand-mark">
        <img src="/logo.svg" alt="SCADA Platform" class="brand-logo" />
      </div>
      <div>
        <div class="brand-title">SCADA Platform</div>
        <div class="brand-sub">工业组态可视化平台</div>
      </div>
    </div>
    <div class="nav-actions">
      <el-dropdown @command="(c: string) => emit('system', c)">
        <el-button text>
          <el-icon><Tools /></el-icon>
          系统设置
          <el-icon><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="notify">通知通道</el-dropdown-item>
            <el-dropdown-item v-if="canManageUsers" command="users">用户管理</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown @command="(c: string) => emit('user', c)">
        <span class="user-chip">
          <el-icon><UserFilled /></el-icon>
          {{ displayName }}
          <el-tag size="small" :type="roleTag">{{ roleLabel }}</el-tag>
        </span>
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
import { computed } from 'vue'
import { ROLE_LABELS, type Role } from '@/types/auth'

const props = defineProps<{
  displayName: string
  role: Role | null
  canManageUsers: boolean
}>()

const emit = defineEmits<{
  system: [cmd: string]
  user: [cmd: string]
}>()

const roleLabel = computed(() => (props.role ? ROLE_LABELS[props.role] : ''))
const roleTag = computed(() => {
  switch (props.role) {
    case 'admin': return 'danger'
    case 'engineer': return 'warning'
    case 'operator': return 'success'
    default: return 'info'
  }
})
</script>
