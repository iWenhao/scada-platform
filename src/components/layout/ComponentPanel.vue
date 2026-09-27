<template>
  <div class="component-panel">
    <div class="panel-header">组件库</div>
    
    <div
      v-for="[group, components] in groupedComponents"
      :key="group"
      class="component-group"
    >
      <div class="group-title">{{ getGroupName(group) }}</div>

      <div class="component-items">
        <div
          v-for="comp in components"
          :key="comp.type"
          class="component-item"
          draggable="true"
          @dragstart="(e) => onDragStart(e, comp)"
        >
          <div class="component-icon" v-html="comp.icon"></div>
          <span class="component-name">{{ comp.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getComponentsByGroup } from '@/industrial/registry'
import type { ComponentDefinition } from '@/types/scada'

// 初始化组件注册
import { basicComponents } from '@/industrial/basic'
import { pipelineComponents } from '@/industrial/pipeline'
import { electricalComponents } from '@/industrial/electrical'
import { coalComponents } from '@/industrial/coal'
import { powerComponents } from '@/industrial/power'
import { chemicalComponents } from '@/industrial/chemical'
import { waterComponents } from '@/industrial/water'
import { registerComponents } from '@/industrial/registry'

// 注册所有组件
registerComponents([
  ...basicComponents,
  ...pipelineComponents,
  ...electricalComponents,
  ...coalComponents,
  ...powerComponents,
  ...chemicalComponents,
  ...waterComponents,
])

const groupedComponents = computed(() => getComponentsByGroup())

const groupNames: Record<string, string> = {
  basic: '基础组件',
  pipeline: '管道组件',
  electrical: '电气组件',
  coal: '煤矿组件',
  power: '电厂组件',
  chemical: '化工组件',
  water: '水处理组件',
  custom: '自定义组件',
}

function getGroupName(group: string): string {
  return groupNames[group] || group
}

function onDragStart(e: DragEvent, comp: ComponentDefinition) {
  e.dataTransfer!.setData('component', JSON.stringify(comp))
  e.dataTransfer!.effectAllowed = 'copy'
}
</script>
