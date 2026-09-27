<template>
  <div class="property-panel">
    <div class="panel-header">属性面板</div>
    
    <div v-if="selectedElement" class="panel-content">
      <!-- 基本属性 -->
      <div class="property-section">
        <div class="section-title">基本属性</div>
        
        <div class="property-item">
          <div class="property-label">名称</div>
          <el-input
            v-model="name"
            size="small"
            @change="handleNameChange"
          />
        </div>
        
        <div class="property-item">
          <div class="property-label">类型</div>
          <el-input
            :model-value="selectedElement.type"
            size="small"
            disabled
          />
        </div>
      </div>
      
      <!-- 位置属性 -->
      <div class="property-section">
        <div class="section-title">位置</div>
        
        <div class="property-row">
          <div class="property-item">
            <div class="property-label">X</div>
            <el-input-number
              v-model="x"
              size="small"
              :step="1"
              @change="handlePositionChange"
            />
          </div>
          
          <div class="property-item">
            <div class="property-label">Y</div>
            <el-input-number
              v-model="y"
              size="small"
              :step="1"
              @change="handlePositionChange"
            />
          </div>
        </div>
        
        <div class="property-row">
          <div class="property-item">
            <div class="property-label">宽度</div>
            <el-input-number
              v-model="width"
              size="small"
              :min="10"
              :step="10"
              @change="handleSizeChange"
            />
          </div>
          
          <div class="property-item">
            <div class="property-label">高度</div>
            <el-input-number
              v-model="height"
              size="small"
              :min="10"
              :step="10"
              @change="handleSizeChange"
            />
          </div>
        </div>
        
        <div class="property-item">
          <div class="property-label">旋转</div>
          <el-slider
            v-model="rotation"
            :min="0"
            :max="360"
            :step="1"
            @change="handleRotationChange"
          />
        </div>
      </div>
      
      <!-- 组件自定义属性 -->
      <div v-if="componentDef" class="property-section">
        <div class="section-title">组件属性</div>
        
        <div
          v-for="prop in componentDef.properties"
          :key="prop.key"
          class="property-item"
        >
          <div class="property-label">{{ prop.label }}</div>
          
          <!-- 字符串类型 -->
          <el-input
            v-if="prop.type === 'string'"
            v-model="properties[prop.key]"
            size="small"
            @change="handlePropertyChange"
          />
          
          <!-- 数字类型 -->
          <el-input-number
            v-else-if="prop.type === 'number'"
            v-model="properties[prop.key]"
            size="small"
            :min="prop.min"
            :max="prop.max"
            :step="1"
            @change="handlePropertyChange"
          />
          
          <!-- 布尔类型 -->
          <el-switch
            v-else-if="prop.type === 'boolean'"
            v-model="properties[prop.key]"
            @change="handlePropertyChange"
          />
          
          <!-- 颜色类型 -->
          <el-color-picker
            v-else-if="prop.type === 'color'"
            v-model="properties[prop.key]"
            size="small"
            @change="handlePropertyChange"
          />
          
          <!-- 下拉选择类型 -->
          <el-select
            v-else-if="prop.type === 'select'"
            v-model="properties[prop.key]"
            size="small"
            @change="handlePropertyChange"
          >
            <el-option
              v-for="opt in prop.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          
          <!-- 范围类型 -->
          <el-slider
            v-else-if="prop.type === 'range'"
            v-model="properties[prop.key]"
            :min="prop.min"
            :max="prop.max"
            :step="prop.step"
            @change="handlePropertyChange"
          />
        </div>
      </div>
      
      <!-- 数据绑定 -->
      <div class="property-section">
        <div class="section-title">数据绑定</div>

        <div class="property-item">
          <div class="property-label">数据源设备</div>
          <el-select
            :model-value="selectedElement.deviceId || ''"
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

        <div
          v-for="binding in componentDef?.dataBindings || []"
          :key="binding.variable"
          class="binding-row"
        >
          <span class="binding-label">{{ binding.variable }}</span>
          <span class="binding-value">{{ formatBindingValue(binding.variable) }}</span>
        </div>
      </div>

      <!-- 状态规则配置 -->
      <div class="property-section">
        <div class="section-title">状态规则</div>
        <el-button size="small" @click="openStatusRuleDialog">
          配置状态规则
        </el-button>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <el-icon :size="48"><Select /></el-icon>
      <p>请选择一个组件</p>
    </div>

    <StatusRuleDialog
      v-model="showStatusRuleDialog"
      :initial-rules="selectedElement?.statusRules || []"
      @confirm="handleStatusRulesConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { getComponentDefinition } from '@/industrial/registry'
import { useHistory } from '@/core/canvas/useHistory'
import StatusRuleDialog from '@/components/dialogs/StatusRuleDialog.vue'
import type { StatusRule } from '@/types/scada'

const canvasStore = useCanvasStore()
const deviceStore = useDeviceStore()
const { saveState } = useHistory()

const selectedElement = computed(() => canvasStore.selectedElement)
const componentDef = computed(() => 
  selectedElement.value ? getComponentDefinition(selectedElement.value.type) : null
)

// 属性值
const name = ref('')
const x = ref(0)
const y = ref(0)
const width = ref(0)
const height = ref(0)
const rotation = ref(0)
const properties = ref<Record<string, any>>({})
const showStatusRuleDialog = ref(false)

// 监听选中元素变化
watch(selectedElement, (newVal) => {
  if (newVal) {
    name.value = newVal.name
    x.value = newVal.x
    y.value = newVal.y
    width.value = newVal.width
    height.value = newVal.height
    rotation.value = newVal.rotation
    properties.value = { ...newVal.properties }
  }
}, { immediate: true })

function handleNameChange(val: string) {
  if (selectedElement.value) {
    canvasStore.updateElement(selectedElement.value.id, { name: val })
    saveState()
  }
}

function handlePositionChange() {
  if (selectedElement.value) {
    canvasStore.updateElement(selectedElement.value.id, {
      x: x.value,
      y: y.value,
    })
    saveState()
  }
}

function handleSizeChange() {
  if (selectedElement.value) {
    canvasStore.updateElement(selectedElement.value.id, {
      width: width.value,
      height: height.value,
    })
    saveState()
  }
}

function handleRotationChange(val: number) {
  if (selectedElement.value) {
    canvasStore.updateElement(selectedElement.value.id, { rotation: val })
    saveState()
  }
}

function handlePropertyChange() {
  if (selectedElement.value) {
    canvasStore.updateElement(selectedElement.value.id, {
      properties: { ...properties.value },
    })
    saveState()
  }
}

function openStatusRuleDialog() {
  if (selectedElement.value) {
    showStatusRuleDialog.value = true
  }
}

function handleDeviceChange(deviceId: string) {
  if (selectedElement.value) {
    canvasStore.updateElement(selectedElement.value.id, { deviceId: deviceId || undefined })
    saveState()
  }
}

// 显示绑定变量的实时值
function formatBindingValue(variable: string): string {
  const element = selectedElement.value
  if (!element) return '-'

  const data = deviceStore.getDeviceData(element.deviceId || element.id)
  const value = data[variable]
  if (value === undefined) return '-'
  return typeof value === 'number' ? String(Math.round(value * 10) / 10) : String(value)
}

function handleStatusRulesConfirm(rules: StatusRule[]) {
  if (selectedElement.value) {
    canvasStore.updateElement(selectedElement.value.id, { statusRules: rules })
    saveState()
  }
}
</script>

<style scoped lang="scss">
.property-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

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

.property-row {
  display: flex;
  gap: 12px;

  .property-item {
    flex: 1;
  }
}

.binding-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;

  .binding-label {
    color: var(--text-secondary);
  }

  .binding-value {
    color: var(--accent-primary, #00d4aa);
    font-family: monospace;
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  
  p {
    margin-top: 12px;
    font-size: 14px;
  }
}

:deep(.el-input__wrapper) {
  background: var(--bg-primary);
  border-color: var(--border-primary);
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
