<template>
  <div>
    <!-- 画面导航 -->
    <div class="property-section">
      <div class="section-title">画面导航</div>
      <div class="property-item">
        <div class="property-label">点击跳转</div>
        <el-select
          :model-value="element.navigateTo || ''"
          size="small"
          clearable
          placeholder="不跳转"
          @change="handleNavigateChange"
        >
          <el-option label="返回上一画面" :value="NAV_BACK" />
          <el-option
            v-for="page in pageOptions"
            :key="page.id"
            :label="page.id === pageStore.activePageId ? `${page.name}（当前）` : page.name"
            :value="page.id"
            :disabled="page.id === pageStore.activePageId"
          />
        </el-select>
      </div>
    </div>

    <!-- 数据绑定 -->
    <div class="property-section">
      <div class="section-title">数据绑定</div>

      <div class="property-item">
        <div class="property-label">数据源设备</div>
        <el-select
          :model-value="element.deviceId || ''"
          size="small"
          clearable
          placeholder="选择设备"
          @change="handleDeviceChange"
        >
          <el-option
            v-for="device in deviceStore.availableDevices"
            :key="device"
            :label="device"
            :value="device"
          />
        </el-select>
      </div>

      <div class="binding-editor">
        <div v-for="(b, idx) in bindings" :key="idx" class="binding-row">
          <el-input
            v-model="b.variable"
            size="small"
            placeholder="变量名"
            @change="commitBindings"
          />
          <span class="binding-value">{{ formatBindingValue(b.variable) }}</span>
          <el-icon
            v-if="element.deviceId && b.variable"
            class="binding-trend"
            title="查看趋势图"
            @click="openTrendChart(element.deviceId!, b.variable)"
          ><TrendCharts /></el-icon>
          <el-icon class="binding-remove" @click="removeBinding(idx)"><Delete /></el-icon>
        </div>
        <el-button size="small" class="binding-add" @click="addBinding">
          <el-icon><Plus /></el-icon>
          添加绑定
        </el-button>
      </div>
    </div>

    <TrendChartDialog v-model="showTrendDialog" :device-id="trendDeviceId" :variable="trendVariable" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { usePageStore } from '@/stores/pageStore'
import TrendChartDialog from '@/components/dialogs/TrendChartDialog.vue'
import { NAV_BACK } from '@/core/canvas/pageNav'
import type { ComponentInstance } from '@/types/scada'

const props = defineProps<{
  element: ComponentInstance
}>()

const emit = defineEmits<{
  update: [patch: Partial<ComponentInstance>]
}>()

const deviceStore = useDeviceStore()
const pageStore = usePageStore()

/** 画面导航候选：排除当前页，避免“跳到自己” */
const pageOptions = computed(() =>
  pageStore.pages.filter(p => p.id !== pageStore.activePageId),
)

const bindings = ref<Array<{ property: string; variable: string }>>([])
const showTrendDialog = ref(false)
const trendDeviceId = ref('')
const trendVariable = ref('')

watch(
  () => props.element,
  (el) => {
    bindings.value = JSON.parse(JSON.stringify(el.dataBindings || []))
  },
  { immediate: true, deep: true },
)

function handleNavigateChange(pageId: string | null) {
  emit('update', { navigateTo: pageId || undefined })
}

function handleDeviceChange(deviceId: string) {
  emit('update', { deviceId: deviceId || undefined })
}

function openTrendChart(deviceId: string, variable: string) {
  trendDeviceId.value = deviceId
  trendVariable.value = variable
  showTrendDialog.value = true
}

function addBinding() {
  bindings.value.push({ property: '', variable: '' })
}

function removeBinding(idx: number) {
  bindings.value.splice(idx, 1)
  commitBindings()
}

function commitBindings() {
  emit('update', {
    dataBindings: bindings.value
      .filter(b => b.variable.trim())
      .map(b => ({ property: b.variable.trim(), variable: b.variable.trim() })),
  })
}

function formatBindingValue(variable: string): string {
  const data = deviceStore.getDeviceData(props.element.deviceId || props.element.id)
  const value = data[variable]
  if (value === undefined) return '-'
  return typeof value === 'number' ? String(Math.round(value * 10) / 10) : String(value)
}
</script>

<style scoped lang="scss">
.property-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-primary);

  &:last-child {
    border-bottom: none;
  }
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
}

.property-item {
  margin-bottom: 12px;
}

.property-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.binding-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;

  .binding-value {
    color: var(--accent-primary, #00d4aa);
    font-family: monospace;
    flex-shrink: 0;
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .binding-trend,
  .binding-remove {
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      color: var(--accent-primary, #00d4aa);
    }
  }

  .binding-remove:hover {
    color: var(--accent-danger, #f56c6c);
  }
}
</style>
