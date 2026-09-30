<template>
  <div class="property-panel">
    <div class="panel-header">属性面板</div>

    <!-- 连线属性（选中连线时优先显示） -->
    <ConnectionProperties
      v-if="selectedConnection"
      :connection="selectedConnection"
      @update-style="updateConnStyle"
      @change-type="handleConnTypeChange"
      @delete="handleDeleteConnection"
    />

    <!-- 元素属性 -->
    <div v-else-if="selectedElement" class="panel-content">
      <ElementGeometry :element="selectedElement" @update="updateElement" />
      <ElementBinding :element="selectedElement" @update="updateElement" />

      <div class="property-section">
        <div class="section-title">显示</div>
        <div class="property-item">
          <div class="property-label">名称与实时数值</div>
          <el-switch
            :model-value="selectedElement.showLabel !== false"
            @change="(v: any) => updateElement({ showLabel: !!v })"
          />
        </div>
      </div>

      <div class="property-section">
        <div class="section-title">状态规则</div>
        <el-button size="small" @click="showStatusRuleDialog = true">
          配置状态规则
        </el-button>
      </div>

      <div class="property-section">
        <el-button type="danger" size="small" class="delete-btn" @click="handleDeleteElement">
          <el-icon><Delete /></el-icon>
          删除组件
        </el-button>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">⊞</div>
      <p class="empty-title">未选中对象</p>
      <p class="empty-sub">点击画布上的组件或连线，这里会显示属性</p>
    </div>

    <StatusRuleDialog
      v-model="showStatusRuleDialog"
      :initial-rules="selectedElement?.statusRules || []"
      @confirm="handleStatusRulesConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useHistory } from '@/core/canvas/useHistory'
import StatusRuleDialog from '@/components/dialogs/StatusRuleDialog.vue'
import ConnectionProperties from './property/ConnectionProperties.vue'
import ElementGeometry from './property/ElementGeometry.vue'
import ElementBinding from './property/ElementBinding.vue'
import type { ComponentInstance, StatusRule } from '@/types/scada'
import type { ConnectionStyle, ConnectionType } from '@/types/connection'

const canvasStore = useCanvasStore()
const connectionStore = useConnectionStore()
const { saveState } = useHistory()

const selectedElement = computed(() => canvasStore.selectedElement)

// 选中的连线（连接选中优先于元素选中，两者互斥清除）
const selectedConnection = computed(() =>
  connectionStore.connections.find(c => c.id === connectionStore.selectedConnectionId)
)

const showStatusRuleDialog = ref(false)

function updateElement(patch: Partial<ComponentInstance>) {
  if (!selectedElement.value) return
  canvasStore.updateElement(selectedElement.value.id, patch)
  saveState()
}

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

// 删除全部选中组件（连同相关连线）
function handleDeleteElement() {
  const ids = [...canvasStore.selectedIds]
  if (!ids.length) return
  canvasStore.removeElements(ids)
  ids.forEach(id => connectionStore.deleteConnectionsByElement(id))
  saveState()
}

function handleStatusRulesConfirm(rules: StatusRule[]) {
  updateElement({ statusRules: rules })
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
  padding: 24px;
  text-align: center;
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: 1px dashed var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--accent-primary);
  background: rgba(0, 212, 170, 0.08);
  margin-bottom: 12px;
}

.empty-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.empty-sub {
  font-size: 12px;
  color: var(--text-muted);
}

:deep(.el-input__wrapper) {
  background: var(--bg-primary);
  border-color: var(--border-primary);
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
