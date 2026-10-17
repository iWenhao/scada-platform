<template>
  <el-dialog v-model="visible" title="已隐藏的组件" width="360px">
    <p class="hidden-tip">
      这些组件已从组件库移除，画布上已放置的实例不受影响；恢复后可继续拖入。
    </p>

    <div v-if="hiddenComponents.length" class="hidden-list">
      <div v-for="comp in hiddenComponents" :key="comp.type" class="hidden-item">
        <div class="hidden-icon" v-html="comp.icon"></div>
        <div class="hidden-text">
          <span class="hidden-name">{{ comp.name }}</span>
          <span class="hidden-type">{{ comp.type }}</span>
        </div>
        <el-button size="small" text type="primary" @click="restore(comp)">恢复</el-button>
      </div>
    </div>
    <el-empty v-else description="没有已隐藏的组件" :image-size="72" />

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" :disabled="!hiddenComponents.length" @click="restoreAll">
        全部恢复
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useHiddenComponents } from '@/composables/useHiddenComponents'
import type { ComponentDefinition } from '@/types/scada'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

const { hiddenComponents, show, showAll } = useHiddenComponents()

async function restore(comp: ComponentDefinition) {
  await show(comp.type)
  ElMessage.success(`已恢复「${comp.name}」`)
}

async function restoreAll() {
  await showAll()
  ElMessage.success('已全部恢复')
  visible.value = false
}
</script>

<style scoped lang="scss">
.hidden-tip {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.hidden-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* 隐藏项可能很多（内置组件上百个），限高滚动而不是把弹窗撑破 */
  max-height: 320px;
  overflow-y: auto;
}

.hidden-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);

  .hidden-icon {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    color: var(--text-secondary);

    :deep(svg) {
      width: 100%;
      height: 100%;
    }
  }

  .hidden-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    margin-right: auto;
  }

  .hidden-name {
    color: var(--text-primary);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hidden-type {
    color: var(--text-muted);
    font-size: 11px;
  }
}
</style>
