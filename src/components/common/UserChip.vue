<template>
  <span class="user-chip" :title="`${username || displayName} · ${roleLabel || '用户'}`">
    <span class="avatar" :class="roleClass">{{ initial }}</span>
    <span class="meta">
      <span class="name">{{ displayName || username }}</span>
      <span v-if="roleLabel" class="role">{{ roleLabel }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ROLE_LABELS, type Role } from '@/types/auth'

const props = defineProps<{
  displayName?: string
  username?: string
  // 不叫 role：el-dropdown 会向触发元素透传 role="button"，
  // 同名 prop 会被它覆盖（角色显示丢失、头像配色失效）
  userRole: Role | null
}>()

const roleLabel = computed(() => (props.userRole ? ROLE_LABELS[props.userRole] : ''))
const roleClass = computed(() => props.userRole || 'viewer')

const initial = computed(() => {
  const s = (props.displayName || props.username || '?').trim()
  // 中文取首字，英文取首字母大写
  return s.slice(0, 1).toUpperCase() || '?'
})
</script>

<style scoped lang="scss">
.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px 5px 5px;
  border-radius: 999px;
  border: 1px solid var(--border-primary);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015));
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: rgba(0, 212, 170, 0.55);
    box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.12);
    transform: translateY(-1px);
  }
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #06241c;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #00d4aa, #00b894);
  box-shadow: 0 2px 8px rgba(0, 212, 170, 0.35);
  flex-shrink: 0;

  &.admin {
    background: linear-gradient(135deg, #ff7a7a, #ff4757);
    color: #fff;
    box-shadow: 0 2px 8px rgba(255, 71, 87, 0.35);
  }

  &.engineer {
    background: linear-gradient(135deg, #ffc46b, #ffa502);
    color: #3a2200;
    box-shadow: 0 2px 8px rgba(255, 165, 2, 0.35);
  }

  &.operator {
    background: linear-gradient(135deg, #6be3c8, #00d4aa);
  }

  &.viewer {
    background: linear-gradient(135deg, #8eb6e8, #3498db);
    color: #062030;
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.35);
  }
}

.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  line-height: 1.15;
  min-width: 0;
}

.name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role {
  font-size: 10px;
  letter-spacing: 0.8px;
  color: var(--accent-primary);
  opacity: 0.9;
}
</style>
