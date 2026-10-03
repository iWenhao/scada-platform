<template>
  <span class="user-chip" :title="`${username || displayName} · ${roleLabel || '用户'}`">
    <span class="avatar" :class="roleClass">{{ initial }}</span>
    <span class="meta">
      <span class="name">{{ nameText }}</span>
      <span v-if="showRole" class="role">{{ roleLabel }}</span>
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

/** 实际展示的名字：显示名优先，回落用户名 */
const nameText = computed(() => props.displayName || props.username || '')

/**
 * 显示名与角色标签同字时不再渲染第二行。
 * 种子账号（admin→管理员、engineer→工程师…）的显示名就是角色名，
 * 两行同词会让人分不清哪个是身份、哪个是权限；真实姓名（如「张三」/操作员）不受影响。
 */
const showRole = computed(() => !!roleLabel.value && roleLabel.value !== nameText.value.trim())

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
  // 与顶栏「系统设置」胶囊同高：高度取共享变量，改为上下不 padding、靠 align 居中，
  // 32px 头像在 40px 里上下各留 3px。原先 5px padding 会把高度撑到 44px
  height: var(--chip-h);
  padding: 0 12px 0 5px;
  border-radius: 999px;
  border: 1px solid var(--border-primary);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015));
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover {
    // hover 底色收在这里作单一来源：原先 dashboard.scss 与 toolbar.scss 各抄一份，
    // 而 dashboard.scss 是全局样式、权重低于本组件的 scoped 规则，其 padding/圆角等
    // 声明其实从未生效，只有 hover 背景真正漏了出来。删除那两处后由本行统一提供。
    background: var(--bg-tertiary);
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
