<template>
  <div class="header-search">
    <!-- 搜索：收起态为圆形图标按钮（与「+」同款）；展开后放大镜收入框内，点框内图标 / 点 × / Esc / 焦点离开面板（点画布、属性面板等）即收起（收起即清除，回到图标态） -->
    <transition name="search-swap" mode="out-in" @after-enter="focusSearchInput">
      <!-- 展开态：搜索盒，放大镜在框内（点击即收起） -->
      <div v-if="visible" key="box" class="search-box">
        <button
          class="search-icon-btn"
          type="button"
          title="收起搜索"
          aria-label="收起搜索"
          @mousedown.prevent
          @click="collapse"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
        <input
          ref="searchInputRef"
          v-model="query"
          class="search-input"
          type="text"
          aria-label="搜索组件"
          @keydown.esc="collapse"
          @blur="onBlur"
        />
        <!-- placeholder 跑马灯：文案比可视区宽，原生 placeholder 无法滚动，用覆盖层缓滚展示全文 -->
        <span v-if="!query" ref="phClipRef" class="search-ph" aria-hidden="true">
          <span ref="phTrackRef" class="search-ph-track" :style="{ '--ph-shift': phShift + 'px' }">搜索组件名称或分组</span>
        </span>
        <button
          v-if="query"
          class="search-clear"
          type="button"
          title="清除并收起搜索"
          aria-label="清除并收起搜索"
          @mousedown.prevent
          @click="collapse"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <!-- 收起态：圆形图标按钮（与「+」同款），点击展开 -->
      <div v-else key="toggle" class="search-toggle-slot">
        <el-tooltip content="搜索组件" placement="bottom">
          <el-button size="small" circle @click="expand">
            <el-icon><Search /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件库的搜索盒（从 ComponentPanel.vue 拆出）：只负责展开/收起与 placeholder 跑马灯，
 * 查询文本与过滤结果都归父组件的 useComponentSearch——这里不复制一份匹配逻辑。
 * 展开/收起状态机复用 composables/useSearchBox。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSearchBox } from '@/composables/useSearchBox'

const props = defineProps<{
  query: string
  /** 用户手动展开的状态；有查询时视为强制展开 */
  open: boolean
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:open': [value: boolean]
}>()

const query = computed({
  get: () => props.query,
  set: val => emit('update:query', val),
})
const open = computed({
  get: () => props.open,
  set: val => emit('update:open', val),
})

// 收起即清空：避免输入框看不见了、过滤却还在生效
const { visible, expand, collapse } = useSearchBox(query, open, { clearOnCollapse: true })

const searchInputRef = ref<HTMLInputElement | null>(null)

/** 展开过渡结束后聚焦输入框 */
function focusSearchInput() {
  measurePhShift()
  searchInputRef.value?.focus()
}

/** placeholder 跑马灯：量出溢出量（轨道宽 − 可视宽），放得下则为 0 不滚 */
const phClipRef = ref<HTMLElement | null>(null)
const phTrackRef = ref<HTMLElement | null>(null)
const phShift = ref(0)

function measurePhShift() {
  const clip = phClipRef.value
  const track = phTrackRef.value
  if (!clip || !track) return
  phShift.value = Math.max(0, Math.ceil(track.offsetWidth - clip.clientWidth))
}

/** 清空文本（×）后覆盖层重新挂载，补一次测量 */
watch([visible, () => props.query === ''], ([isVisible, empty]) => {
  if (isVisible && empty) nextTick(measurePhShift)
})

/**
 * 「失焦收起」的例外：切 Tab / 点卡片都在组件库面板内部，属于还在用搜索，
 * 一收起就把查询清了——另一 Tab 下的命中项（搜索时 Tab 上有圆点提示）会跟着消失。
 * 卡片不可聚焦，blur 的 relatedTarget 恒为 null 判不出来，故在 document 捕获阶段
 * 记下本次失焦是否由面板内部点击引起；键盘 Tab 移出没有 mousedown，标志位是复位过的，照旧收起。
 */
let downInsidePanel = false

function onDocMouseDown(e: MouseEvent) {
  const el = e.target as HTMLElement | null
  downInsidePanel = !!el?.closest?.('.component-panel')
}

onMounted(() => document.addEventListener('mousedown', onDocMouseDown, true))
onUnmounted(() => document.removeEventListener('mousedown', onDocMouseDown, true))

function onBlur() {
  const inside = downInsidePanel
  downInsidePanel = false
  if (inside) return
  collapse()
}

// 供面板在搜索态下切 Tab 后把焦点还回来：否则 Esc / 继续输入都失效（焦点已不在框内）
defineExpose({ focus: () => searchInputRef.value?.focus() })
</script>
