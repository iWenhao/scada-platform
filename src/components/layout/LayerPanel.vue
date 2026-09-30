<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span>图层管理</span>
      <div class="header-actions">
        <el-tooltip content="添加图层" placement="top">
          <el-button size="small" @click="handleAddLayer">
            <el-icon><Plus /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
    
    <div class="layer-list">
      <div v-if="!layerStore.layers.length" class="empty-tip">暂无图层，点 + 添加</div>
      <div
        v-for="layer in layerStore.layers"
        :key="layer.id"
        class="layer-item"
        :class="{ active: layer.id === layerStore.activeLayerId }"
        @click="layerStore.setActiveLayer(layer.id)"
      >
        <!-- 可见性 -->
        <el-icon
          class="layer-action"
          @click.stop="layerStore.toggleVisibility(layer.id)"
        >
          <View v-if="layer.visible" />
          <Hide v-else />
        </el-icon>
        
        <!-- 锁定状态 -->
        <el-icon
          class="layer-action"
          @click.stop="layerStore.toggleLock(layer.id)"
        >
          <Lock v-if="layer.locked" />
          <Unlock v-else />
        </el-icon>
        
        <!-- 图层名称 -->
        <span class="layer-name">{{ layer.name }}</span>
        
        <!-- 图层类型标签 -->
        <el-tag size="small" :type="getTagType(layer.type)">
          {{ getTypeName(layer.type) }}
        </el-tag>
        
        <!-- 操作按钮 -->
        <div class="layer-actions">
          <el-tooltip content="上移" placement="top">
            <el-icon @click.stop="layerStore.moveUp(layer.id)">
              <Top />
            </el-icon>
          </el-tooltip>
          
          <el-tooltip content="下移" placement="top">
            <el-icon @click.stop="layerStore.moveDown(layer.id)">
              <Bottom />
            </el-icon>
          </el-tooltip>
          
          <el-tooltip v-if="layer.type !== 'background'" content="删除" placement="top">
            <el-icon class="delete-btn" @click.stop="handleDeleteLayer(layer.id)">
              <Delete />
            </el-icon>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayerStore } from '@/stores/layerStore'
import { ElMessageBox, ElMessage } from 'element-plus'

const layerStore = useLayerStore()

const typeNames: Record<string, string> = {
  background: '背景',
  pipeline: '管道',
  device: '设备',
  annotation: '标注',
}

function getTypeName(type: string): string {
  return typeNames[type] || type
}

function getTagType(type: string): string {
  switch (type) {
    case 'background': return 'info'
    case 'pipeline': return 'warning'
    case 'device': return 'success'
    case 'annotation': return 'primary'
    default: return ''
  }
}

function handleAddLayer() {
  layerStore.addLayer({
    name: `图层 ${layerStore.layers.length}`,
    type: 'annotation',
    visible: true,
    locked: false,
  })
}

async function handleDeleteLayer(layerId: string) {
  try {
    await ElMessageBox.confirm('确定要删除此图层吗？', '确认', {
      type: 'warning',
    })
    layerStore.removeLayer(layerId)
    ElMessage.success('图层已删除')
  } catch {
    // 取消操作
  }
}
</script>

<style scoped lang="scss">
.layer-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  
  span {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }
}

.layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  
  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-secondary);
    
    .layer-actions {
      opacity: 1;
    }
  }
  
  &.active {
    border-color: var(--accent-primary);
    background: var(--bg-tertiary);
  }
}

.layer-action {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  
  &:hover {
    color: var(--accent-primary);
  }
}

.layer-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.layer-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  
  .el-icon {
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 14px;
    
    &:hover {
      color: var(--accent-primary);
    }
    
    &.delete-btn:hover {
      color: var(--accent-danger);
    }
  }
}

:deep(.el-tag) {
  font-size: 11px;
}

.empty-tip {
  padding: 28px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
