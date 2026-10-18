<template>
  <!--
    说明气泡：只在定义里写了 description 时启用（无说明的组件保留原生 title 显示名称）。
    placement 用 left——组件库面板贴着窗口右侧，向右弹会顶出可视区。
  -->
  <el-tooltip :disabled="!description" placement="left" :show-after="350">
    <template #content>
      <div class="card-tip">
        <div class="card-tip-name">{{ name }}</div>
        <div class="card-tip-desc">{{ description }}</div>
      </div>
    </template>
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
  </el-tooltip>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    /** 图标的 SVG 片段；不传时用默认插槽（设备模板卡片没有 SVG） */
    icon?: string
    /**
     * 一句话用途说明（悬停显示组件是干什么的）。
     * 只有「光看名字分不清」的组件需要写，其余留空即不弹气泡。
     */
    description?: string
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

<style scoped lang="scss">
// 气泡内容随 el-tooltip 一起 teleport 到 body，但编译期的 scoped 属性跟着元素走，
// 这里的样式依然生效
.card-tip {
  max-width: 240px;

  &-name {
    font-weight: 500;
    margin-bottom: 2px;
  }

  &-desc {
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.85;
  }
}
</style>
