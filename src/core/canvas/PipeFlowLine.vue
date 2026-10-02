<template>
  <v-line :config="dashConfig" />
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import type { ComponentInstance } from '@/types/scada'
import { pipeDashConfig, registerFlowAnimation, flowOffset } from './pipeFlow'

/**
 * 管道流动虚线：唯一订阅全局流动 offset 的组件。
 * 单独拆出来是为了让每帧重绘只发生在这一条虚线上，
 * 而不是整层画布元素跟着 RAF 重算。
 */
const props = defineProps<{
  element: ComponentInstance
  color: string
  labelHeight: number
  flowing: boolean
}>()

// 「显示流动」关闭时既不可见也不参与动画
const animating = computed(
  () => props.flowing && props.element.properties?.showFlow !== false,
)

const dashConfig = computed(() =>
  pipeDashConfig(props.element, props.color, props.labelHeight, {
    flowing: animating.value,
    // 静止时不读 offset：不建立响应依赖，管道停住后就不再每帧重绘
    offset: animating.value ? flowOffset.value : 0,
  }),
)

let release: (() => void) | null = null
watch(
  animating,
  on => {
    if (on && !release) release = registerFlowAnimation()
    else if (!on && release) {
      release()
      release = null
    }
  },
  { immediate: true },
)
onUnmounted(() => {
  release?.()
  release = null
})
</script>
