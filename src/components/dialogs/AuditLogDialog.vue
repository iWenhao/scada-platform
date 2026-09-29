<template>
  <el-dialog v-model="visible" title="写值审计日志" width="720px">
    <el-table :data="auditStore.entries" size="small" empty-text="暂无写值记录" max-height="420">
      <el-table-column label="时间" width="95">
        <template #default="{ row }">{{ formatTime(row.t) }}</template>
      </el-table-column>
      <el-table-column prop="operator" label="操作者" width="80" />
      <el-table-column label="目标" min-width="150">
        <template #default="{ row }">
          <span class="audit-target">{{ row.deviceId }}.{{ row.variable }}</span>
        </template>
      </el-table-column>
      <el-table-column label="写入值" width="90">
        <template #default="{ row }">
          <span class="audit-value">{{ row.value }}</span>
        </template>
      </el-table-column>
      <el-table-column label="结果" min-width="120">
        <template #default="{ row }">
          <el-tag :type="row.ok ? 'success' : 'danger'" size="small">
            {{ row.ok ? '成功' : '失败' }}
          </el-tag>
          <span v-if="row.error" class="audit-error">{{ row.error }}</span>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="auditStore.clear()">清空日志</el-button>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAuditStore } from '@/stores/auditStore'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const auditStore = useAuditStore()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

// 每次打开时从存储恢复最新日志
watch(visible, (open) => {
  if (open) void auditStore.load()
})

function formatTime(t: number): string {
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped lang="scss">
.audit-target {
  font-family: monospace;
  color: var(--text-primary);
}

.audit-value {
  font-family: monospace;
  font-weight: 600;
  color: var(--accent-primary);
}

.audit-error {
  margin-left: 6px;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
