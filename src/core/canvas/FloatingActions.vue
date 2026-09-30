<template>
  <div v-if="visible" class="float-actions" :style="pos">
    <button type="button" title="复制 (Ctrl+C)" @click="emit('copy')">⧉</button>
    <button type="button" title="删除 (Del)" class="danger" @click="emit('delete')">✕</button>
    <span class="sep" />
    <button type="button" :title="locked ? '解锁' : '锁定'" @click="emit('toggle-lock')">
      {{ locked ? '🔒' : '🔓' }}
    </button>
    <button type="button" title="上移一层" @click="emit('bring-front')">⬆</button>
    <button type="button" title="下移一层" @click="emit('send-back')">⬇</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  x: number
  y: number
  locked?: boolean
}>()

const emit = defineEmits<{
  copy: []
  delete: []
  'toggle-lock': []
  'bring-front': []
  'send-back': []
}>()

const pos = {
  left: `${props.x}px`,
  top: `${props.y}px`,
}
</script>

<style scoped>
.float-actions {
  position: absolute;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(14, 20, 36, 0.92);
  border: 1px solid rgba(0, 212, 170, 0.35);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -100%);
  pointer-events: auto;
}

.float-actions button {
  width: 30px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #d7e4e8;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: rgba(0, 212, 170, 0.16);
    color: #b8fff0;
  }

  &.danger:hover {
    background: rgba(255, 71, 87, 0.18);
    color: #ffb4b4;
  }
}

.sep {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 2px;
}
</style>
