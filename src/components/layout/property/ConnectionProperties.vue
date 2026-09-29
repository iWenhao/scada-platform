<template>
  <div class="panel-content">
    <div class="property-section">
      <div class="section-title">连线类型</div>
      <el-select :model-value="connection.type" @change="handleTypeChange">
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
          :model-value="connection.style.stroke"
          @change="(v: any) => emit('update-style', { stroke: v || '#666666' })"
        />
      </div>
      <div class="property-item">
        <div class="property-label">线宽</div>
        <el-input-number
          :model-value="connection.style.strokeWidth"
          :min="1"
          :max="10"
          @change="(v: any) => emit('update-style', { strokeWidth: v || 2 })"
        />
      </div>
      <div class="property-item">
        <div class="property-label">流动动画</div>
        <el-switch
          :model-value="connection.style.animated"
          @change="(v: any) => emit('update-style', { animated: !!v })"
        />
      </div>
      <template v-if="connection.style.animated">
        <div class="property-item">
          <div class="property-label">流速</div>
          <el-slider
            :model-value="connection.style.flowSpeed || 1"
            :min="0.5"
            :max="5"
            :step="0.5"
            @change="(v: any) => emit('update-style', { flowSpeed: v })"
          />
        </div>
        <div class="property-item">
          <div class="property-label">方向</div>
          <el-select
            :model-value="connection.style.flowDirection || 'forward'"
            @change="(v: any) => emit('update-style', { flowDirection: v })"
          >
            <el-option label="正向" value="forward" />
            <el-option label="反向" value="reverse" />
          </el-select>
        </div>
      </template>
    </div>

    <div class="property-section">
      <el-button type="danger" size="small" class="delete-btn" @click="emit('delete')">
        <el-icon><Delete /></el-icon>
        删除连线
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Connection, ConnectionStyle, ConnectionType } from '@/types/connection'

defineProps<{
  connection: Connection
}>()

const emit = defineEmits<{
  'update-style': [patch: Partial<ConnectionStyle>]
  'change-type': [type: ConnectionType]
  delete: []
}>()

function handleTypeChange(type: ConnectionType) {
  emit('change-type', type)
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

.delete-btn {
  width: 100%;
}
</style>
