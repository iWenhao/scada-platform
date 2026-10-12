<template>
  <v-image
    v-for="(config, index) in rotors"
    :key="`rotor-${index}`"
    :config="config"
  />
  <v-line
    v-for="(config, index) in belts"
    :key="`belt-${index}`"
    :config="config"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import type { ComponentInstance, ViewMode } from '@/types/scada'
import type { ElementLayout } from './elementLayout'
import { getComponentDefinition } from '@/industrial/registry'
import { onFrame } from './animationClock'
import { getRotorConfigs, getBeltConfigs, resolveMotionTiming } from './elementMotion'

/**
 * 设备运转动效层：可动件（截割滚筒/截割头的截齿、输送带面）独立于主图标渲染。
 *
 * 主图标是一整张光栅位图，位图内部的圆无法单独旋转，所以可动件由 elementMotion
 * 从定义里取出、按同一套 contain 变换摆回原位。本组件只做两件事：逐帧推进角度与
 * 带面位移，把它们写进 Konva config。
 *
 * 三条边界：
 * - 只有运转中的元素订阅共享动画时钟，静止设备零逐帧开销；
 * - 角度是「累加积分」而非「时间 × 速度」，因此速度变化时姿态不跳变；
 * - 停转时不重置角度，设备冻结在当前位置（而不是弹回 0°）。
 */
const props = defineProps<{
  element: ComponentInstance
  layout: ElementLayout
  color: string
  /** 渲染风格：可动件片段与主图标必须同风格，否则两者明暗会不一致 */
  viewMode: ViewMode
  /** 运转状态（null 表示该元素没有可动件，由调用方用 v-if 拦住） */
  state: { running: boolean; speed: number } | null
}>()

const motionDef = computed(() => getComponentDefinition(props.element.type)?.motion ?? null)
const running = computed(() => props.state?.running ?? false)
const speed = computed(() => props.state?.speed ?? 0)
const timing = computed(() => resolveMotionTiming(speed.value, motionDef.value?.degPerUnit))

// 位图异步就绪后需要重算摆放：首帧拿不到 image，可动件配置为空
const imageVersion = ref(0)
const handleIconLoad = () => {
  imageVersion.value++
}

// 积分量：旋转角（度）与带面位移（像素）
const angleDeg = ref(0)
const beltOffset = ref(0)

const rotors = computed(() => {
  void imageVersion.value
  return getRotorConfigs(
    props.element,
    props.layout,
    props.color,
    props.viewMode,
    angleDeg.value,
    handleIconLoad,
  )
})

const belts = computed(() =>
  getBeltConfigs(props.element, props.layout, props.color, beltOffset.value),
)

let stop: (() => void) | null = null

function start() {
  if (stop) return
  stop = onFrame(dt => {
    const dtSec = dt / 1000
    const { degPerSec, beltPxPerSec } = timing.value
    angleDeg.value += degPerSec * dtSec
    beltOffset.value += beltPxPerSec * dtSec
  })
}

function halt() {
  stop?.()
  stop = null
}

watch(running, on => (on ? start() : halt()), { immediate: true })
onUnmounted(halt)
</script>
