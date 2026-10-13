<template>
  <v-group>
    <v-rect
      :config="config.body"
      @mousedown="pressed = true"
      @mouseup="pressed = false"
      @mouseleave="pressed = false"
    />
    <v-text :config="config.text" />
  </v-group>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { commandButtonConfig } from '@/core/canvas/elementChrome'
import type { ElementLayout } from '@/core/canvas/elementLayout'
import type { ComponentInstance } from '@/types/scada'

/**
 * 操作按钮节点（编辑器画布与预览页共用，与 ElementMotion / PipeFlowLine 同一层）。
 *
 * 独立成组件是为了把按下态关在自己内部：mousedown / mouseup 只影响这一个元素，
 * 不必把「当前按下的是哪个元素」提到画布层去广播。mouseleave 一并复位，避免
 * 按住后拖出按钮再松手、留下一个卡住的按下态。
 *
 * 点击本身不下发——下发给谁、要不要二次确认由调用方决定（预览页走写值链路，
 * 编辑器只做选中），这里只负责「看起来能按」。
 */
const props = defineProps<{
  element: ComponentInstance
  layout: ElementLayout
  color: string
}>()

const pressed = ref(false)

const config = computed(() =>
  commandButtonConfig(props.element, props.layout, props.color, pressed.value),
)
</script>
