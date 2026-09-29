<template>
  <div>
    <div class="live-header">
      <el-tag :type="connTagType" size="small">{{ connText }}</el-tag>
      <span class="hint">共 {{ points.length }} 个在线点位</span>
      <div class="spacer" />
      <el-input
        :model-value="keyword"
        size="small"
        placeholder="搜索设备 / 变量"
        clearable
        class="search"
        @update:model-value="emit('update:keyword', $event)"
      />
    </div>
    <el-table :data="points" size="small" max-height="420" empty-text="连接数据源后此处列出实时点位">
      <el-table-column prop="deviceId" label="设备" width="130" show-overflow-tooltip />
      <el-table-column prop="variable" label="变量" width="130" show-overflow-tooltip />
      <el-table-column label="当前值" width="140">
        <template #default="{ row }">
          <span class="live-value">{{ formatVal(row.value) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="点表" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.tag" size="small" type="success">已登记</el-tag>
          <el-tag v-else size="small" type="info">未登记</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="单位" width="80">
        <template #default="{ row }">{{ row.tag?.unit || '-' }}</template>
      </el-table-column>
      <el-table-column label="可写" width="70">
        <template #default="{ row }">
          <template v-if="row.tag">
            <el-tag v-if="row.tag.writable" size="small" type="success">可写</el-tag>
            <el-tag v-else-if="row.tag.writable === false" size="small" type="danger">只读</el-tag>
            <span v-else>-</span>
          </template>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.tag?.description || '-' }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TagDef } from '@/types/tag'

type LivePointRow = {
  deviceId: string
  variable: string
  value: unknown
  tag: TagDef | null
  unit: string
  description: string
}

const props = defineProps<{
  points: LivePointRow[]
  keyword: string
  connectionStatus: string
}>()

const emit = defineEmits<{ 'update:keyword': [v: string] }>()

const connTagType = computed(() => {
  switch (props.connectionStatus) {
    case 'connected': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
})

const connText = computed(() => {
  switch (props.connectionStatus) {
    case 'connected': return '已连接'
    case 'error': return '连接错误'
    default: return '未连接'
  }
})

function formatVal(v: unknown): string {
  if (v === undefined || v === null) return '-'
  if (typeof v === 'number') return String(Math.round(v * 100) / 100)
  return String(v)
}
</script>
