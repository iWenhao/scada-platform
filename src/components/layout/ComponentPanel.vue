<template>
  <div class="component-panel">
    <div class="panel-top">
      <div class="panel-header">
        <span class="panel-title">组件库</span>
        <div class="header-actions">
          <LibrarySearchBox ref="searchBoxRef" v-model:query="searchQuery" v-model:open="searchOpen" />
          <el-tooltip content="创建自定义组件" placement="bottom">
            <el-button size="small" circle @click="showCustomDialog = true">
              <el-icon><Plus /></el-icon>
            </el-button>
          </el-tooltip>
          <!-- 恢复入口：只在有隐藏项时出现（排在最右，避免顶开搜索与新建按钮） -->
          <el-tooltip v-if="hiddenCount" :content="`已隐藏 ${hiddenCount} 个组件，点击恢复`" placement="bottom">
            <el-button size="small" circle @click="showHiddenDialog = true">
              <el-icon><Hide /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="panel-tabs" role="tablist">
        <!-- 滑动指示条：横向流动切换感 -->
        <div class="tab-indicator" :style="indicatorStyle" />
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="panel-tab"
          :class="{ active: activeTab === tab.key, 'has-hit': hitTabs.has(tab.key) }"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="onTabClick(tab.key, $event)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="panel-body">
      <transition name="tab-fade" mode="out-in">
      <div :key="activeTab" class="tab-pane">
        <!-- 搜索无任何命中（含自定义侧） -->
        <div v-if="searching && !anyHits" class="search-empty">
          未找到与「{{ searchQuery.trim() }}」匹配的组件
        </div>

        <template v-else>
          <!-- 最常使用：按拖入画布次数降序，免去逐个翻 Tab -->
          <template v-if="activeTab === 'most'">
            <div v-if="mostUsedHits.length" class="component-group">
              <div class="component-items">
                <ComponentCard
                  v-for="comp in mostUsedHits"
                  :key="comp.type"
                  :name="comp.name"
                  :icon="comp.icon"
                  :description="comp.description"
                  :editable="isCustom(comp)"
                  :remove-title="removeTitleOf(comp)"
                  @dragstart="(e: DragEvent) => onDragStart(e, comp)"
                  @edit="startEditCustom(comp)"
                  @remove="removeComponent(comp)"
                />
              </div>
            </div>
            <div v-else-if="!customHasHits" class="most-empty">
              <template v-if="searching">最常使用中没有匹配的组件</template>
              <template v-else>还没有最常使用记录<br />把组件拖入画布后会出现在这里</template>
            </div>
          </template>

          <!-- 基础 / 行业：按原始分组展示（搜索态只留命中项） -->
          <template v-else>
            <div
              v-for="[group, components] in tabGroups"
              :key="group"
              class="component-group"
            >
              <div class="group-title">{{ getGroupName(group) }}</div>
              <div class="component-items">
                <ComponentCard
                  v-for="comp in components"
                  :key="comp.type"
                  :name="comp.name"
                  :icon="comp.icon"
                  :description="comp.description"
                  @dragstart="(e: DragEvent) => onDragStart(e, comp)"
                  @remove="removeComponent(comp)"
                />
              </div>
            </div>
            <div v-if="!tabGroups.length && !customHasHits" class="search-empty">
              {{ searching ? '该分类下没有匹配的组件' : '该分类下暂无组件' }}
            </div>
          </template>

          <!-- 自定义组件（已无独立 Tab）：搜索命中时附在结果末尾，卡片保留编辑/删除 -->
          <div v-if="searching && customHasHits" class="component-group">
            <div class="group-title">自定义组件</div>
            <div class="component-items">
              <ComponentCard
                v-for="tpl in templateHits"
                :key="tpl.id"
                :name="tpl.name"
                remove-title="删除设备模板"
                @dragstart="(e: DragEvent) => onTemplateDragStart(e, tpl)"
                @remove="removeTemplate(tpl)"
              >
                <el-icon :size="26"><Box /></el-icon>
              </ComponentCard>
              <ComponentCard
                v-for="comp in customHits"
                :key="comp.type"
                :name="comp.name"
                :icon="comp.icon"
                :description="comp.description"
                editable
                remove-title="删除自定义组件"
                @dragstart="(e: DragEvent) => onDragStart(e, comp)"
                @edit="startEditCustom(comp)"
                @remove="removeCustom(comp)"
              />
            </div>
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
    <HiddenComponentsDialog v-model="showHiddenDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { getComponentsByGroup } from '@/industrial/registry'
import { updateCustomComponent, removeCustomComponent, ensureCustomComponentsLoaded, addCustomComponent } from '@/industrial/customLibrary'
import { loadDeviceTemplates, removeDeviceTemplate } from '@/industrial/templateLibrary'
import { BASIC_GROUPS, INDUSTRY_GROUPS, getGroupName } from '@/industrial/panelRegistry'
import { useComponentSearch, type PanelTabKey } from '@/composables/useComponentSearch'
import { useMostUsedComponents } from '@/composables/useMostUsedComponents'
import { useHiddenComponents } from '@/composables/useHiddenComponents'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { ComponentDefinition, ComponentGroup } from '@/types/scada'
import type { DeviceTemplate } from '@/types/template'

// 注册内置组件（自定义组件从存储恢复后单独注册）
import '@/industrial/panelRegistry'

/** Tab：最常使用 / 基础 / 行业（「自定义组件」Tab 已移除，改由搜索触达） */
const tabs: Array<{ key: PanelTabKey; label: string }> = [
  { key: 'most', label: '最常使用' },
  { key: 'basic', label: '通用组件' },
  { key: 'industry', label: '行业组件' },
]

const activeTab = ref<PanelTabKey>('most')

/** 横向滑动指示条位置：等分，用 translateX 左右流动 */
const indicatorStyle = computed(() => {
  const idx = Math.max(0, tabs.findIndex(t => t.key === activeTab.value))
  const n = tabs.length || 1
  // 与 flex:1 的按钮同宽；left:6px 对齐内边距，再按档位平移
  return {
    width: `calc((100% - 12px) / ${n})`,
    transform: `translateX(calc(100% * ${idx}))`,
  }
})

const customDefs = ref<ComponentDefinition[]>([])
const deviceTemplates = ref<DeviceTemplate[]>([])
const showCustomDialog = ref(false)
const editingDef = ref<ComponentDefinition | null>(null)
const showHiddenDialog = ref(false)

const { mostUsed } = useMostUsedComponents()
const { hiddenCount, hide: hideComponentType, refresh: refreshHidden } = useHiddenComponents()
const {
  searchQuery,
  searching,
  hitTabs,
  anyHits,
  customHasHits,
  mostUsedHits,
  customHits,
  templateHits,
  isShown,
} = useComponentSearch({ activeTab, mostUsed, customDefs, deviceTemplates })

/** 搜索盒展开态（展开/收起与跑马灯测量在 LibrarySearchBox 内） */
const searchOpen = ref(false)
/** 只用到 LibrarySearchBox 暴露的 focus()；不引 SFC，免与自动导入重名 */
const searchBoxRef = ref<{ focus: () => void } | null>(null)

/**
 * 切 Tab：搜索态下把焦点还给搜索框——点 Tab 会让输入框失焦，焦点不回来的话
 * Esc 收起与继续输入都失效，只能去点框内放大镜。`e.detail === 0` 是键盘触发的 click，
 * 不抢焦点（键盘用户的焦点应留在 Tab 按钮上）。
 */
function onTabClick(key: PanelTabKey, e: MouseEvent) {
  activeTab.value = key
  if (searching.value && e.detail > 0) nextTick(() => searchBoxRef.value?.focus())
}

onMounted(async () => {
  // 自定义组件在登录之后才能按用户命名空间读到，这里统一走幂等加载（预览页共用同一份缓存）
  customDefs.value = await ensureCustomComponentsLoaded()
  deviceTemplates.value = await loadDeviceTemplates()
  await refreshHidden()
  window.addEventListener('scada-templates-changed', refreshTemplates)
})

onUnmounted(() => {
  window.removeEventListener('scada-templates-changed', refreshTemplates)
})

/** 刷新设备模板列表 */
async function refreshTemplates() {
  deviceTemplates.value = await loadDeviceTemplates()
}

/** 当前 Tab 下的分组（保持原有组内顺序；搜索态只保留命中项，已从组件库移除的不出现） */
const tabGroups = computed(() => {
  const map = getComponentsByGroup()
  const wanted = activeTab.value === 'basic' ? BASIC_GROUPS : INDUSTRY_GROUPS
  const result: Array<[ComponentGroup, ComponentDefinition[]]> = []
  for (const group of wanted) {
    const list = (map.get(group) ?? []).filter(isShown)
    if (list.length) result.push([group, list])
  }
  return result
})

// 保存自定义组件(创建或编辑): 新 type 走新增, 已有 type 覆盖
async function onCustomSaved(def: ComponentDefinition) {
  const exists = customDefs.value.some(c => c.type === def.type)
  if (exists) {
    await updateCustomComponent(def)
    customDefs.value = customDefs.value.map(c => (c.type === def.type ? def : c))
  } else {
    await addCustomComponent(def)
    customDefs.value = [...customDefs.value, def]
    // 自定义组件没有独立 Tab 了：新建后直接按名字展开搜索，让组件立刻可见
    searchOpen.value = true
    searchQuery.value = def.name
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

const isCustom = (comp: ComponentDefinition) => comp.group === 'custom'

/** 叉叉提示：内置组件是「从组件库移除」，自定义组件是真删除 */
const removeTitleOf = (comp: ComponentDefinition) =>
  isCustom(comp) ? '删除自定义组件' : '从组件库移除'

/**
 * 卡片删除入口：内置组件的定义写死在代码里，删除做成隐藏（可在标题右侧恢复），
 * 注册表保留定义，因此画布上已放置的实例照常渲染取数；自定义组件走真删除。
 */
async function removeComponent(comp: ComponentDefinition) {
  if (isCustom(comp)) {
    await removeCustom(comp)
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定从组件库移除「${comp.name}」吗？移除后组件库不再列出它，画布上已放置的实例不受影响；可在组件库标题右侧恢复。`,
      '移除组件',
      { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  await hideComponentType(comp.type)
  ElMessage.success(`已移除「${comp.name}」`)
}

// 进入编辑模式
function startEditCustom(def: ComponentDefinition) {
  editingDef.value = def
  showCustomDialog.value = true
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
