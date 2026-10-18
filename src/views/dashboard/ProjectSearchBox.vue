<template>
  <div class="proj-search">
    <!-- 收起态：只有放大镜圆钮，点一下展开并聚焦 -->
    <el-tooltip v-if="!visible" content="搜索项目" placement="bottom">
      <button class="search-toggle" type="button" aria-label="展开搜索" @click="expand">
        <el-icon><Search /></el-icon>
      </button>
    </el-tooltip>

    <!-- 展开态：放大镜与清除键都在框内，宽度由外部样式给 -->
    <div v-else class="search-box">
      <el-icon class="search-lead"><Search /></el-icon>
      <input
        ref="inputRef"
        :value="modelValue"
        class="search-field"
        type="text"
        placeholder="搜索项目名称"
        aria-label="搜索项目名称"
        @input="onInput"
        @keydown.esc="clear"
        @blur="onBlur"
      >
      <button
        v-if="modelValue"
        class="search-clear"
        type="button"
        aria-label="清空搜索"
        @mousedown.prevent
        @click="clear"
      >
        <el-icon><Close /></el-icon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 首页「最近项目」标题行右侧的搜索盒：只负责展开/收起与输入，
 * 过滤结果与计数归 dashboard/index.vue（这里不碰项目数据）。
 * 收起与否由视口宽度决定，不是用户能主动折的——宽窗口下它一直在。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

/** 退成图标的断点：与 dashboard.scss 里标题行还能排下 220px 输入框的下限对齐 */
const NARROW_MAX = 720

const narrow = ref(false)
/** 仅窄窗口有意义：点图标展开，失焦且没内容才收回 */
const expanded = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

/** 有查询时强制展开：筛了却看不见筛选条件，只会让人以为项目自己变少了 */
const visible = computed(() => !narrow.value || expanded.value || props.modelValue.trim().length > 0)

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

function expand() {
  expanded.value = true
  nextTick(() => inputRef.value?.focus())
}

function clear() {
  emit('update:modelValue', '')
  if (narrow.value) expanded.value = false
}

function onBlur() {
  if (narrow.value && !props.modelValue.trim()) expanded.value = false
}

let media: MediaQueryList | null = null

function syncNarrow(source: MediaQueryList | MediaQueryListEvent) {
  narrow.value = source.matches
}

onMounted(() => {
  media = window.matchMedia(`(max-width: ${NARROW_MAX}px)`)
  syncNarrow(media)
  media.addEventListener('change', syncNarrow)
})

onUnmounted(() => {
  media?.removeEventListener('change', syncNarrow)
})
</script>
