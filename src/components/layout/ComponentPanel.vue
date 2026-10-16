<template>
  <div class="component-panel">
    <div class="panel-top">
      <div class="panel-header">
        <span>组件库</span>
        <div class="header-actions">
          <!-- 搜索：默认只显示图标，点击展开为输入框；收起即清除 -->
          <div class="header-search" :class="{ open: searchVisible }">
            <button
              class="search-toggle"
              type="button"
              :title="searchVisible ? '收起搜索' : '搜索组件'"
              :aria-label="searchVisible ? '收起搜索' : '搜索组件'"
              @click="toggleSearch"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            <input
              v-if="searchVisible"
              ref="searchInputRef"
              v-model="searchQuery"
              class="search-input"
              type="text"
              placeholder="搜索组件"
              aria-label="搜索组件"
              @keydown.esc="collapseSearch"
            />
            <button
              v-if="searchVisible && searchQuery"
              class="search-clear"
              type="button"
              title="清除搜索"
              aria-label="清除搜索"
              @click="clearSearch"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <el-tooltip content="创建自定义组件" placement="bottom">
            <el-button size="small" circle @click="showCustomDialog = true">
              <el-icon><Plus /></el-icon>
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
          @click="activeTab = tab.key"
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
            <div v-if="mostUsedHits.length" class="component-group custom-group">
              <div class="component-items">
                <div
                  v-for="comp in mostUsedHits"
                  :key="comp.type"
                  class="component-item"
                  :class="{ hit: searching }"
                  draggable="true"
                  @dragstart="(e) => onDragStart(e, comp)"
                >
                  <div class="component-icon" v-html="comp.icon"></div>
                  <span class="component-name">{{ comp.name }}</span>
                </div>
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
                <div
                  v-for="comp in components"
                  :key="comp.type"
                  class="component-item"
                  :class="{ hit: searching }"
                  draggable="true"
                  @dragstart="(e) => onDragStart(e, comp)"
                >
                  <div class="component-icon" v-html="comp.icon"></div>
                  <span class="component-name">{{ comp.name }}</span>
                </div>
              </div>
            </div>
            <div v-if="!tabGroups.length && !customHasHits" class="search-empty">
              {{ searching ? '该分类下没有匹配的组件' : '该分类下暂无组件' }}
            </div>
          </template>

          <!-- 自定义组件（已无独立 Tab）：搜索命中时附在结果末尾，卡片保留编辑/删除 -->
          <div v-if="searching && customHasHits" class="component-group custom-group">
            <div class="group-title">自定义组件</div>
            <div class="component-items">
              <div
                v-for="tpl in templateHits"
                :key="tpl.id"
                class="component-item custom-card template-card hit"
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
              <div
                v-for="comp in customHits"
                :key="comp.type"
                class="component-item custom-card hit"
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { getComponentsByGroup } from '@/industrial/registry'
import { updateCustomComponent, removeCustomComponent, loadCustomComponents, addCustomComponent } from '@/industrial/customLibrary'
import { loadDeviceTemplates, removeDeviceTemplate } from '@/industrial/templateLibrary'
import { BASIC_GROUPS, INDUSTRY_GROUPS, getGroupName } from '@/industrial/panelRegistry'
import { useComponentSearch, type PanelTabKey } from '@/composables/useComponentSearch'
import { useMostUsedComponents } from '@/composables/useMostUsedComponents'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { ComponentDefinition, ComponentGroup } from '@/types/scada'
import type { DeviceTemplate } from '@/types/template'

// 注册内置组件（自定义组件从存储恢复后单独注册）
import '@/industrial/panelRegistry'

/** Tab：最常使用 / 基础 / 行业（「自定义组件」Tab 已移除，改由搜索触达） */
const tabs: Array<{ key: PanelTabKey; label: string }> = [
  { key: 'most', label: '最常使用' },
  { key: 'basic', label: '基础组件' },
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

const { mostUsed } = useMostUsedComponents()
const {
  searchQuery,
  searching,
  hitTabs,
  anyHits,
  customHasHits,
  mostUsedHits,
  customHits,
  templateHits,
  isHit,
} = useComponentSearch({ activeTab, mostUsed, customDefs, deviceTemplates })

/** 搜索框展开态：默认只显示图标；有查询时强制展开（避免筛了却看不到原因） */
const searchOpen = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchVisible = computed(() => searchOpen.value || searching.value)

function toggleSearch() {
  if (searchVisible.value) {
    collapseSearch()
  } else {
    searchOpen.value = true
    nextTick(() => searchInputRef.value?.focus())
  }
}

/** 收起即清除：避免输入框看不见了、过滤却还在生效 */
function collapseSearch() {
  searchOpen.value = false
  searchQuery.value = ''
}

/** 清空文本但保持展开，继续可输入 */
function clearSearch() {
  searchQuery.value = ''
  nextTick(() => searchInputRef.value?.focus())
}

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

/** 当前 Tab 下的分组（保持原有组内顺序；搜索态只保留命中项，空组不展示） */
const tabGroups = computed(() => {
  const map = getComponentsByGroup()
  const wanted = activeTab.value === 'basic' ? BASIC_GROUPS : INDUSTRY_GROUPS
  const result: Array<[ComponentGroup, ComponentDefinition[]]> = []
  for (const group of wanted) {
    const list = (map.get(group) ?? []).filter(isHit)
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
