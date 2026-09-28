<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @mousedown.stop
      @contextmenu.prevent
    >
      <div
        v-for="item in items"
        :key="item.label"
        class="context-menu-item"
        :class="{ disabled: item.disabled, danger: item.danger }"
        @click="handleClick(item)"
      >
        <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
        <span v-if="item.shortcut" class="shortcut">{{ item.shortcut }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

export interface ContextMenuItem {
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  action: () => void
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
  if (item.disabled) return
  emit('close')
  item.action()
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
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 160px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  padding: 4px 0;
  user-select: none;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  transition: background 0.15s;

  &:hover:not(.disabled) {
    background: var(--bg-tertiary);
  }

  &.disabled {
    color: var(--text-muted);
    cursor: not-allowed;
  }

  &.danger {
    color: var(--accent-danger);
  }

  .shortcut {
    margin-left: auto;
    color: var(--text-muted);
    font-size: 11px;
  }
}
</style>
