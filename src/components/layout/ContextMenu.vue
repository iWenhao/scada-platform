<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @mousedown.stop
      @contextmenu.prevent
    >
      <template v-for="(item, i) in items" :key="i">
        <div v-if="item.divider" class="context-menu-sep" />
        <div
          v-else
          class="context-menu-item"
          :class="{ disabled: item.disabled, danger: item.danger }"
          @click="handleClick(item)"
        >
          <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
          <span v-if="item.shortcut" class="shortcut">{{ item.shortcut }}</span>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

export interface ContextMenuItem {
  label?: string
  icon?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  /** 分组分隔线：只渲染一条横线，不带动作 */
  divider?: boolean
  action?: () => void
}

defineProps<{
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{
  close: []
}>()

function handleClick(item: ContextMenuItem) {
  if (item.disabled || item.divider) return
  emit('close')
  item.action?.()
}

function onGlobalClick() {
  emit('close')
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('click', onGlobalClick, true)
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('click', onGlobalClick, true)
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<style scoped lang="scss">
// 视觉对齐画布悬浮工具条：胶囊圆角 + 品牌青描边 + 深阴影
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 168px;
  padding: 5px;
  background: var(--bg-secondary);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 40%, transparent);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  user-select: none;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 2px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  transition: background 0.15s;

  &:hover:not(.disabled) {
    background: color-mix(in srgb, var(--accent-primary) 14%, transparent);
  }

  &.disabled {
    color: var(--text-muted);
    cursor: not-allowed;
  }

  &.danger {
    color: var(--accent-danger);

    .el-icon {
      color: var(--accent-danger);
    }
  }

  .el-icon {
    color: var(--text-secondary);
  }

  .shortcut {
    margin-left: auto;
    color: var(--text-muted);
    font-size: 11px;
  }
}

.context-menu-sep {
  height: 1px;
  margin: 4px 8px;
  background: var(--border-primary);
}
</style>
