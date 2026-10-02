<template>
  <el-dialog
    :model-value="modelValue"
    title="点表管理"
    width="960px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="点表" name="tags">
    <div class="policy-row">
      <span class="policy-label">未登记点位写值策略</span>
      <el-radio-group v-model="writePolicy" size="small" @change="onPolicyChange">
        <el-radio-button value="allow">允许</el-radio-button>
        <el-radio-button value="warn">提示后允许</el-radio-button>
        <el-radio-button value="deny">禁止</el-radio-button>
      </el-radio-group>
      <span class="policy-hint">控制点表中没有登记的点位能否在预览页下发写值，随工程保存</span>
    </div>
    <div class="tag-toolbar">
      <el-button type="primary" size="small" @click="addTag">
        <el-icon><Plus /></el-icon>
        新增点位
      </el-button>
      <el-button size="small" @click="triggerImport">
        <el-icon><Upload /></el-icon>
        导入 CSV
      </el-button>
      <el-button size="small" @click="handleExport">
        <el-icon><Download /></el-icon>
        导出 CSV
      </el-button>
      <input ref="fileInput" type="file" accept=".csv,text/csv" class="hidden-input" @change="onFileChange" />
      <div class="spacer" />
      <el-input
        v-model="keyword"
        size="small"
        placeholder="搜索设备 / 变量 / 描述"
        clearable
        class="search"
      />
    </div>

    <el-table :data="filtered" size="small" max-height="420" empty-text="暂无点位，可新增或导入 CSV">
      <el-table-column prop="deviceId" label="设备" width="110" show-overflow-tooltip />
      <el-table-column prop="name" label="变量" width="110" show-overflow-tooltip />
      <el-table-column prop="description" label="描述" min-width="120" show-overflow-tooltip />
      <el-table-column prop="unit" label="单位" width="80" />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ typeLabel(row.dataType) }}</template>
      </el-table-column>
      <el-table-column label="量程" width="110">
        <template #default="{ row }">
          {{ row.min !== undefined || row.max !== undefined ? `${row.min ?? '-'} ~ ${row.max ?? '-'}` : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="可写" width="60">
        <template #default="{ row }">
          <el-tag v-if="row.writable" size="small" type="success">是</el-tag>
          <el-tag v-else-if="row.writable === false" size="small" type="info">否</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="绑定数" width="70">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="showBindings(row)">
            {{ bindingCount(row) }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row, $index }">
          <el-button size="small" text type="primary" @click="editTag(row, $index)">编辑</el-button>
          <el-button size="small" text type="danger" @click="removeAt($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
      </el-tab-pane>

      <el-tab-pane label="实时数据" name="live">
        <LivePointsTable
          :points="filteredLive"
          :keyword="liveKeyword"
          :connection-status="deviceStore.connectionStatus"
          @update:keyword="liveKeyword = $event"
        />
      </el-tab-pane>
    </el-tabs>

    <TagEditDialog
      v-model="editVisible"
      :form="editing"
      :editing-index="editingIndex"
      :devices="deviceStore.availableDevices"
      @confirm="commitEdit"
    />


    <el-dialog v-model="bindVisible" title="画布绑定" width="520px" append-to-body>
      <el-table :data="bindings" size="small" empty-text="该点位未被任何画布元素绑定">
        <el-table-column prop="pageName" label="画面" width="100" />
        <el-table-column prop="elementName" label="元素" min-width="120" />
        <el-table-column prop="type" label="类型" width="100" />
      </el-table>
    </el-dialog>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import LivePointsTable from './LivePointsTable.vue'
import TagEditDialog from './TagEditDialog.vue'
import { exportTagsCsv } from './useTagCsv'
import { useTagLivePoints } from './useTagLivePoints'
import { useTagBindings } from './useTagBindings'
import {
  parseTagCsv,
  tagKey,
  computeImportSummary,
  WRITE_POLICY_TEXT,
  type TagDef,
  type WritePolicy,
} from '@/types/tag'
import { createTagId } from '@/utils/id'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const projectStore = useProjectStore()

const tags = ref<TagDef[]>([])
const keyword = ref('')
const activeTab = ref<'tags' | 'live'>('tags')
const saving = ref(false)
const writePolicy = ref<WritePolicy>('allow')

// 实时数据页与绑定反查各自成模块，点表编辑逻辑留在本组件
const { deviceStore, liveKeyword, filteredLive } = useTagLivePoints(tags)
const { bindVisible, bindings, showBindings, bindingCount } = useTagBindings()

const editVisible = ref(false)
const editing = ref<TagDef | null>(null)
const editingIndex = ref(-1)

const fileInput = ref<HTMLInputElement | null>(null)

/** 策略变化即提交（随工程保存） */
function onPolicyChange(policy: WritePolicy) {
  projectStore.setWritePolicy(policy)
  ElMessage.success(`未登记点位写值策略已设为「${WRITE_POLICY_TEXT[policy]}」`)
}

// 打开对话框时从工程同步策略
watch(
  () => props.modelValue,
  (open) => {
    if (open) writePolicy.value = projectStore.writePolicy
  },
)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return tags.value
  return tags.value.filter(
    t =>
      t.deviceId.toLowerCase().includes(kw) ||
      t.name.toLowerCase().includes(kw) ||
      (t.description || '').toLowerCase().includes(kw),
  )
})

function typeLabel(t: string) {
  return t === 'boolean' ? '布尔' : t === 'string' ? '字符串' : '数值'
}

function refresh() {
  tags.value = JSON.parse(JSON.stringify(projectStore.tagTable))
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) refresh()
  },
)

function addTag() {
  editing.value = {
    id: createTagId(),
    deviceId: deviceStore.availableDevices[0] || '',
    name: '',
    dataType: 'number',
  }
  editingIndex.value = -1
  editVisible.value = true
}

function editTag(row: TagDef, index: number) {
  editing.value = JSON.parse(JSON.stringify(row))
  editingIndex.value = index
  editVisible.value = true
}

function commitEdit() {
  if (!editing.value) return
  if (!editing.value.deviceId?.trim() || !editing.value.name?.trim()) {
    ElMessage.warning('设备 ID 与变量名必填')
    return
  }
  const next = [...tags.value]
  if (editingIndex.value >= 0) {
    next[editingIndex.value] = { ...editing.value }
  } else {
    const idx = next.findIndex(
      t => t.deviceId === editing.value!.deviceId && t.name === editing.value!.name,
    )
    if (idx >= 0) {
      next[idx] = { ...editing.value, id: next[idx].id }
    } else {
      next.push({ ...editing.value })
    }
  }
  tags.value = next
  editVisible.value = false
}

function removeAt(index: number) {
  tags.value.splice(index, 1)
}

function triggerImport() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = String(ev.target?.result || '')
    const parsed = parseTagCsv(text)
    if (parsed.length === 0) {
      ElMessage.warning('未解析到有效点位（需包含 deviceId 与 name）')
      return
    }
    // 差异摘要确认：让操作者知道导入会新增/覆盖多少点位，而不是默默合并
    const summary = computeImportSummary(tags.value, parsed)
    if (summary.added.length === 0 && summary.updated === 0) {
      ElMessage.info('CSV 与当前点表内容一致，无需导入')
      return
    }
    ElMessageBox.confirm(
      `新增 ${summary.added.length} 个点位，更新 ${summary.updated} 个已有点位` +
        (summary.unchanged ? `，${summary.unchanged} 个无变化` : ''),
      '确认导入',
      { type: 'info', confirmButtonText: '导入', cancelButtonText: '取消' },
    )
      .then(() => {
        const map = new Map<string, TagDef>()
        for (const t of tags.value) map.set(tagKey(t), t)
        // 更新的保留原 id（绑定反查与外部引用不受影响），新增才生成新 id
        for (const t of summary.added) map.set(tagKey(t), t)
        for (const t of tags.value) {
          const incoming = parsed.find(p => tagKey(p) === tagKey(t))
          if (incoming) map.set(tagKey(t), { ...incoming, id: t.id })
        }
        tags.value = [...map.values()]
        ElMessage.success(`已导入：新增 ${summary.added.length}，更新 ${summary.updated}`)
      })
      .catch(() => {})
  }
  reader.readAsText(file, 'utf-8')
  input.value = ''
}

function handleExport() {
  exportTagsCsv(tags.value, projectStore.projectName)
}

function handleSave() {
  saving.value = true
  try {
    projectStore.setTagTable(JSON.parse(JSON.stringify(tags.value)))
    ElMessage.success('点表已保存')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>

<style src="./tag-table.scss" scoped lang="scss"></style>
