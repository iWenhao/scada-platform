<template>
  <v-group :config="groupConfig">
    <!-- 连线主体 -->
    <v-line :config="lineConfig" />
    
    <!-- 流动动画线 -->
    <v-line
      v-if="connection.style.animated"
      :config="animatedLineConfig"
    />
    
    <!-- 连线标签 -->
    <v-text
      v-if="connection.label"
      :config="labelConfig"
    />
    
    <!-- 选中效果 -->
    <v-line
      v-if="selected"
      :config="selectedLineConfig"
    />
  </v-group>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { Connection } from '@/types/connection'

const props = defineProps<{
  connection: Connection
  selected?: boolean
}>()

const emit = defineEmits<{
  click: [id: string]
}>()

// 动画偏移量
const dashOffset = ref(0)
let animationId: number | null = null

// 组配置
const groupConfig = computed(() => ({
  x: 0,
  y: 0,
  onClick: () => emit('click', props.connection.id),
}))

// 连线配置
const lineConfig = computed(() => ({
  points: props.connection.points,
  stroke: props.connection.style.stroke || '#666666',
  strokeWidth: props.connection.style.strokeWidth || 2,
  lineCap: 'round',
  lineJoin: 'round',
  hitStrokeWidth: 20,
}))

// 动画线配置
const animatedLineConfig = computed(() => ({
  points: props.connection.points,
  stroke: props.connection.style.stroke || '#00d4aa',
  strokeWidth: (props.connection.style.strokeWidth || 2) + 1,
  lineCap: 'round',
  lineJoin: 'round',
  dash: [10, 10],
  dashOffset: dashOffset.value,
  opacity: 0.8,
}))

// 选中线配置
const selectedLineConfig = computed(() => ({
  points: props.connection.points,
  stroke: '#00d4aa',
  strokeWidth: (props.connection.style.strokeWidth || 2) + 4,
  lineCap: 'round',
  lineJoin: 'round',
  opacity: 0.3,
}))

// 标签配置
const labelConfig = computed(() => {
  const points = props.connection.points
  if (points.length < 4) return {}
  
  // 计算连线中点
  const midX = (points[0] + points[points.length - 2]) / 2
  const midY = (points[1] + points[points.length - 1]) / 2
  
  return {
    x: midX - 20,
    y: midY - 10,
    text: props.connection.label,
    fontSize: 12,
    fill: '#e0e0e0',
    padding: 4,
    background: '#1a1a2e',
    cornerRadius: 2,
  }
})

// 动画函数
function animate() {
  const speed = props.connection.style.flowSpeed || 1
  const direction = props.connection.style.flowDirection === 'reverse' ? -1 : 1
  
  dashOffset.value += speed * direction
  
  if (dashOffset.value > 100 || dashOffset.value < -100) {
    dashOffset.value = 0
  }
  
  animationId = requestAnimationFrame(animate)
}

// 启动动画
onMounted(() => {
  if (props.connection.style.animated) {
    animate()
  }
})

// 停止动画
onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>
