<template>
  <div class="component-panel">
    <div class="panel-header">
      <span>组件库</span>
      <el-tooltip content="创建自定义组件" placement="bottom">
        <el-button size="small" circle @click="showCustomDialog = true">
          <el-icon><Plus /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
    
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

    <!-- 自定义组件分组 -->
    <div class="component-group custom-group">
      <div class="group-title">自定义组件</div>

      <div v-if="customDefs.length" class="component-items">
        <div
          v-for="comp in customDefs"
          :key="comp.type"
          class="component-item custom-card"
          draggable="true"
          @dragstart="(e) => onDragStart(e, comp)"
        >
          <div class="card-actions">
            <el-icon title="编辑" @click.stop="startEditCustom(comp)"><Edit /></el-icon>
            <el-icon title="删除" @click.stop="removeCustom(comp)"><Delete /></el-icon>
          </div>
          <div class="component-icon" v-html="comp.icon"></div>
          <span class="component-name">{{ comp.name }}</span>
        </div>
      </div>
      <div v-else class="custom-empty">点击 + 创建自定义组件</div>
    </div>

    <CustomComponentDialog
      v-model="showCustomDialog"
      :editing="editingDef"
      @confirm="onCustomSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getComponentsByGroup } from '@/industrial/registry'
import { updateCustomComponent, removeCustomComponent } from '@/industrial/customLibrary'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { ComponentDefinition } from '@/types/scada'

// 初始化组件注册
import { basicComponents } from '@/industrial/basic'
import { pipelineComponents } from '@/industrial/pipeline'
import { electricalComponents } from '@/industrial/electrical'
import { coalComponents } from '@/industrial/coal'
import { powerComponents } from '@/industrial/power'
import { chemicalComponents } from '@/industrial/chemical'
import { waterComponents } from '@/industrial/water'
import { loadCustomComponents, addCustomComponent } from '@/industrial/customLibrary'
import { registerComponents } from '@/industrial/registry'

// 注册内置 + 自定义(从存储恢复)组件
registerComponents([
  ...basicComponents,
  ...pipelineComponents,
  ...electricalComponents,
  ...coalComponents,
  ...powerComponents,
  ...chemicalComponents,
  ...waterComponents,
])
const customDefs = ref<ComponentDefinition[]>([])
const showCustomDialog = ref(false)
const editingDef = ref<ComponentDefinition | null>(null)

onMounted(async () => {
  // 从存储恢复自定义组件并注册
  customDefs.value = await loadCustomComponents()
})

// 内置分组(自定义组件由独立区块展示, 此处排除避免重复)
const groupedComponents = computed(() => {
  const map = getComponentsByGroup()
  map.delete('custom')
  return map
})

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

// 保存自定义组件(创建或编辑): 新 type 走新增, 已有 type 覆盖
async function onCustomSaved(def: ComponentDefinition) {
  const exists = customDefs.value.some(c => c.type === def.type)
  if (exists) {
    await updateCustomComponent(def)
    customDefs.value = customDefs.value.map(c => (c.type === def.type ? def : c))
  } else {
    await addCustomComponent(def)
    customDefs.value = [...customDefs.value, def]
  }
}

// 删除自定义组件（确认后）；画布上已放置的实例会退化为默认样式
async function removeCustom(def: ComponentDefinition) {
  try {
    await ElMessageBox.confirm(
      `确定删除自定义组件「${def.name}」吗？画布上已放置的实例将保留但显示为默认样式。`,
      '删除自定义组件',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  await removeCustomComponent(def.type)
  customDefs.value = customDefs.value.filter(c => c.type !== def.type)
  ElMessage.success('已删除')
}

// 进入编辑模式
function startEditCustom(def: ComponentDefinition) {
  editingDef.value = def
  showCustomDialog.value = true
}

function getGroupName(group: string): string {
  return groupNames[group] || group
}

function onDragStart(e: DragEvent, comp: ComponentDefinition) {
  e.dataTransfer!.setData('component', JSON.stringify(comp))
  e.dataTransfer!.effectAllowed = 'copy'
}
</script>
