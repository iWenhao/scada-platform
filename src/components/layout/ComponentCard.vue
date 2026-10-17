<template>
  <div
    class="component-item"
    :title="name"
    draggable="true"
    @dragstart="emit('dragstart', $event)"
  >
    <!-- 次级操作：默认隐藏，悬停/键盘聚焦卡片才出现（否则满屏红叉） -->
    <div class="card-actions">
      <button
        v-if="editable"
        class="item-action edit"
        type="button"
        title="编辑组件"
        aria-label="编辑组件"
        draggable="false"
        @click.stop="emit('edit')"
      >
        <el-icon><Edit /></el-icon>
      </button>
      <button
        class="item-action remove"
        type="button"
        :title="removeTitle"
        :aria-label="removeTitle"
        draggable="false"
        @click.stop="emit('remove')"
      >
        <el-icon><Close /></el-icon>
      </button>
    </div>
    <div v-if="icon" class="component-icon" v-html="icon"></div>
    <div v-else class="component-icon"><slot /></div>
    <span class="component-name">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    /** 图标的 SVG 片段；不传时用默认插槽（设备模板卡片没有 SVG） */
    icon?: string
    /** 自定义组件卡片额外保留编辑入口 */
    editable?: boolean
    /** 叉叉的提示文案：内置组件是「从组件库移除」，自定义组件与模板是真删除 */
    removeTitle?: string
  }>(),
  { removeTitle: '从组件库移除' },
)

const emit = defineEmits<{
  dragstart: [e: DragEvent]
  edit: []
  remove: []
}>()
</script>
