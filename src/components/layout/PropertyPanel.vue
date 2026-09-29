<template>
  <div class="property-panel">
    <div class="panel-header">属性面板</div>

    <!-- 连线属性（选中连线时优先显示） -->
    <div v-if="selectedConnection" class="panel-content">
      <div class="property-section">
        <div class="section-title">连线类型</div>
        <el-select
          :model-value="selectedConnection.type"
          @change="handleConnTypeChange"
        >
          <el-option label="直线" value="straight" />
          <el-option label="折线" value="polyline" />
          <el-option label="曲线" value="curve" />
        </el-select>
      </div>

      <div class="property-section">
        <div class="section-title">样式</div>
        <div class="property-item">
          <div class="property-label">颜色</div>
          <el-color-picker
            :model-value="selectedConnection.style.stroke"
            @change="(v: any) => updateConnStyle({ stroke: v || '#666666' })"
          />
        </div>
        <div class="property-item">
          <div class="property-label">线宽</div>
          <el-input-number
            :model-value="selectedConnection.style.strokeWidth"
            :min="1"
            :max="10"
            @change="(v: any) => updateConnStyle({ strokeWidth: v || 2 })"
          />
        </div>
        <div class="property-item">
          <div class="property-label">流动动画</div>
          <el-switch
            :model-value="selectedConnection.style.animated"
            @change="(v: any) => updateConnStyle({ animated: !!v })"
          />
        </div>
        <template v-if="selectedConnection.style.animated">
          <div class="property-item">
            <div class="property-label">流速</div>
            <el-slider
              :model-value="selectedConnection.style.flowSpeed || 1"
              :min="0.5"
              :max="5"
              :step="0.5"
              @change="(v: any) => updateConnStyle({ flowSpeed: v })"
            />
          </div>
          <div class="property-item">
            <div class="property-label">方向</div>
            <el-select
              :model-value="selectedConnection.style.flowDirection || 'forward'"
              @change="(v: any) => updateConnStyle({ flowDirection: v })"
            >
              <el-option label="正向" value="forward" />
              <el-option label="反向" value="reverse" />
            </el-select>
          </div>
        </template>
      </div>

      <div class="property-section">
        <el-button type="danger" size="small" class="delete-btn" @click="handleDeleteConnection">
          <el-icon><Delete /></el-icon>
          删除连线
        </el-button>
      </div>
    </div>

    <div v-else-if="selectedElement" class="panel-content">
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
            :step="prop.step ?? 1"
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
              v-if="selectedElement.deviceId && b.variable"
              class="binding-trend"
              title="查看趋势图"
              @click="openTrendChart(selectedElement.deviceId!, b.variable)"
            ><TrendCharts /></el-icon>
            <el-icon class="binding-remove" @click="removeBinding(idx)"><Delete /></el-icon>
          </div>
          <el-button size="small" class="binding-add" @click="addBinding">
            <el-icon><Plus /></el-icon>
            添加绑定
          </el-button>
        </div>
      </div>

      <!-- 趋势图弹窗 -->
      <TrendChartDialog
        v-model="showTrendDialog"
        :device-id="trendDeviceId"
        :variable="trendVariable"
      />

      <!-- 状态规则配置 -->
      <div class="property-section">
        <div class="section-title">状态规则</div>
        <el-button size="small" @click="openStatusRuleDialog">
          配置状态规则
        </el-button>
      </div>

      <!-- 删除组件 -->
      <div class="property-section">
        <el-button type="danger" size="small" class="delete-btn" @click="handleDeleteElement">
          <el-icon><Delete /></el-icon>
          删除组件
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
import { useConnectionStore } from '@/stores/connectionStore'
import { getComponentDefinition } from '@/industrial/registry'
import { useHistory } from '@/core/canvas/useHistory'
import StatusRuleDialog from '@/components/dialogs/StatusRuleDialog.vue'
import TrendChartDialog from '@/components/dialogs/TrendChartDialog.vue'
import type { StatusRule } from '@/types/scada'
import type { ConnectionStyle, ConnectionType } from '@/types/connection'

const canvasStore = useCanvasStore()
const deviceStore = useDeviceStore()
const connectionStore = useConnectionStore()
const { saveState } = useHistory()

const selectedElement = computed(() => canvasStore.selectedElement)

// 选中的连线（连接选中优先于元素选中，两者互斥清除）
const selectedConnection = computed(() =>
  connectionStore.connections.find(c => c.id === connectionStore.selectedConnectionId)
)

function updateConnStyle(patch: Partial<ConnectionStyle>) {
  if (selectedConnection.value) {
    connectionStore.updateConnectionStyle(selectedConnection.value.id, patch)
  }
}

function handleConnTypeChange(type: ConnectionType) {
  const conn = selectedConnection.value
  if (!conn) return
  connectionStore.updateConnection(conn.id, { type })
  connectionStore.recalcConnection(conn.id)
  saveState()
}

function handleDeleteConnection() {
  const conn = selectedConnection.value
  if (!conn) return
  connectionStore.deleteConnection(conn.id)
  saveState()
}
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

// 趋势图弹窗
const showTrendDialog = ref(false)
const trendDeviceId = ref('')
const trendVariable = ref('')

function openTrendChart(deviceId: string, variable: string) {
  trendDeviceId.value = deviceId
  trendVariable.value = variable
  showTrendDialog.value = true
}

// 监听选中元素变化
// 数据绑定编辑（本地草稿, 变更即写回元素）
const bindings = ref<Array<{ property: string; variable: string }>>([])

watch(selectedElement, (newVal) => {
  if (newVal) {
    name.value = newVal.name
    x.value = newVal.x
    y.value = newVal.y
    width.value = newVal.width
    height.value = newVal.height
    rotation.value = newVal.rotation
    properties.value = { ...newVal.properties }
    bindings.value = JSON.parse(JSON.stringify(newVal.dataBindings || []))
  }
}, { immediate: true })

function addBinding() {
  bindings.value.push({ property: '', variable: '' })
}

function removeBinding(idx: number) {
  bindings.value.splice(idx, 1)
  commitBindings()
}

function commitBindings() {
  if (!selectedElement.value) return
  canvasStore.updateElement(selectedElement.value.id, {
    dataBindings: bindings.value
      .filter(b => b.variable.trim())
      .map(b => ({ property: b.variable.trim(), variable: b.variable.trim() })),
  })
  saveState()
}

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

// 删除全部选中组件（连同相关连线）
function handleDeleteElement() {
  const ids = [...canvasStore.selectedIds]
  if (!ids.length) return
  canvasStore.removeElements(ids)
  ids.forEach(id => connectionStore.deleteConnectionsByElement(id))
  saveState()
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

.delete-btn {
  width: 100%;
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
