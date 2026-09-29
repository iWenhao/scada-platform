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

    <div class="panel-tabs" role="tablist">
      <!-- 滑动指示条：横向流动切换感 -->
      <div class="tab-indicator" :style="indicatorStyle" />
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="panel-tab"
        :class="{ active: activeTab === tab.key }"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="panel-body">
      <transition name="tab-fade" mode="out-in">
      <div :key="activeTab" class="tab-pane">
      <!-- 基础 / 行业：按原始分组展示 -->
      <template v-if="activeTab !== 'custom'">
        <div
          v-for="[group, components] in tabGroups"
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
      </template>

      <!-- 自定义组件：设备模板 + 自定义图形 -->
      <template v-else>
        <div v-if="deviceTemplates.length" class="component-group custom-group">
          <div class="component-items">
            <div
              v-for="tpl in deviceTemplates"
              :key="tpl.id"
              class="component-item custom-card template-card"
              draggable="true"
              @dragstart="(e) => onTemplateDragStart(e, tpl)"
            >
              <div class="card-actions">
                <el-icon title="删除" @click.stop="removeTemplate(tpl)"><Delete /></el-icon>
              </div>
              <div class="component-icon">
                <el-icon :size="26"><Box /></el-icon>
              </div>
              <span class="component-name">{{ tpl.name }}</span>
            </div>
          </div>
        </div>

        <div v-if="customDefs.length" class="component-group custom-group">
          <div class="component-items">
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
        </div>

        <div v-if="!deviceTemplates.length && !customDefs.length" class="custom-empty">
          暂无自定义组件
        </div>
      </template>
      </div>
      </transition>
    </div>

    <CustomComponentDialog
      v-model="showCustomDialog"
      :editing="editingDef"
      @confirm="onCustomSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getComponentsByGroup } from '@/industrial/registry'
import { updateCustomComponent, removeCustomComponent } from '@/industrial/customLibrary'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { ComponentDefinition, ComponentGroup } from '@/types/scada'

// 初始化组件注册
import { basicComponents } from '@/industrial/basic'
import { pipelineComponents } from '@/industrial/pipeline'
import { electricalComponents } from '@/industrial/electrical'
import { coalComponents } from '@/industrial/coal'
import { powerComponents } from '@/industrial/power'
import { chemicalComponents } from '@/industrial/chemical'
import { waterComponents } from '@/industrial/water'
import { chartComponents } from '@/industrial/chart'
import { loadCustomComponents, addCustomComponent } from '@/industrial/customLibrary'
import { loadDeviceTemplates, removeDeviceTemplate } from '@/industrial/templateLibrary'
import { registerComponents } from '@/industrial/registry'
import type { DeviceTemplate } from '@/types/template'

// 注册内置组件（自定义从存储恢复后单独注册）
registerComponents([
  ...basicComponents,
  ...pipelineComponents,
  ...electricalComponents,
  ...coalComponents,
  ...powerComponents,
  ...chemicalComponents,
  ...waterComponents,
  ...chartComponents,
])

/** Tab：基础 / 行业 / 自定义 */
type TabKey = 'basic' | 'industry' | 'custom'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'basic', label: '基础组件' },
  { key: 'industry', label: '行业组件' },
  { key: 'custom', label: '自定义组件' },
]

const activeTab = ref<TabKey>('basic')

/** 横向滑动指示条位置：三等分，用 translateX 左右流动 */
const indicatorStyle = computed(() => {
  const idx = Math.max(0, tabs.findIndex(t => t.key === activeTab.value))
  const n = tabs.length || 1
  // 与 flex:1 的按钮同宽；left:6px 对齐内边距，再按档位平移
  return {
    width: `calc((100% - 12px) / ${n})`,
    transform: `translateX(calc(100% * ${idx}))`,
  }
})

/** 基础 Tab 覆盖的注册分组 */
const BASIC_GROUPS: ComponentGroup[] = ['basic', 'pipeline', 'electrical', 'chart']
/** 行业 Tab 覆盖的注册分组 */
const INDUSTRY_GROUPS: ComponentGroup[] = ['coal', 'power', 'chemical', 'water']

const customDefs = ref<ComponentDefinition[]>([])
const deviceTemplates = ref<DeviceTemplate[]>([])
const showCustomDialog = ref(false)
const editingDef = ref<ComponentDefinition | null>(null)

onMounted(async () => {
  customDefs.value = await loadCustomComponents()
  deviceTemplates.value = await loadDeviceTemplates()
  window.addEventListener('scada-templates-changed', refreshTemplates)
})

onUnmounted(() => {
  window.removeEventListener('scada-templates-changed', refreshTemplates)
})

/** 刷新设备模板列表 */
async function refreshTemplates() {
  deviceTemplates.value = await loadDeviceTemplates()
}

/** 当前 Tab 下的分组（保持原有组内顺序，空组不展示） */
const tabGroups = computed(() => {
  const map = getComponentsByGroup()
  const wanted = activeTab.value === 'basic' ? BASIC_GROUPS : INDUSTRY_GROUPS
  const result: Array<[ComponentGroup, ComponentDefinition[]]> = []
  for (const group of wanted) {
    const list = map.get(group)
    if (list?.length) result.push([group, list])
  }
  return result
})

const groupNames: Record<string, string> = {
  basic: '基础组件',
  pipeline: '管道组件',
  electrical: '电气组件',
  coal: '煤矿组件',
  power: '电厂组件',
  chemical: '化工组件',
  water: '水处理组件',
  chart: '图表组件',
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
    activeTab.value = 'custom'
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

function onTemplateDragStart(e: DragEvent, tpl: DeviceTemplate) {
  e.dataTransfer!.setData(
    'component',
    JSON.stringify({ kind: 'template', template: tpl }),
  )
  e.dataTransfer!.effectAllowed = 'copy'
}

async function removeTemplate(tpl: DeviceTemplate) {
  try {
    await ElMessageBox.confirm(
      `确定删除设备模板「${tpl.name}」吗？画布上已放置的实例将保留。`,
      '删除设备模板',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  await removeDeviceTemplate(tpl.id)
  await refreshTemplates()
  ElMessage.success('已删除')
}

// 编辑器内「存为模板」后轮询刷新成本高，导出刷新方法供外部调用
defineExpose({ refreshTemplates })
</script>
