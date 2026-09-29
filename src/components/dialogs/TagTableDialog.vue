<template>
  <el-dialog
    :model-value="modelValue"
    title="点表管理"
    width="920px"
    @update:model-value="emit('update:modelValue', $event)"
  >
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

    <el-dialog
      v-model="editVisible"
      :title="editingIndex >= 0 ? '编辑点位' : '新增点位'"
      width="480px"
      append-to-body
    >
      <el-form v-if="editing" label-width="90px">
        <el-form-item label="设备 ID" required>
          <el-select
            v-model="editing.deviceId"
            filterable
            allow-create
            default-first-option
            placeholder="如 motor_1"
          >
            <el-option v-for="d in deviceStore.availableDevices" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
        <el-form-item label="变量名" required>
          <el-input v-model="editing.name" placeholder="如 speed" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editing.description" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="editing.unit" placeholder="如 rpm" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editing.dataType">
            <el-option label="数值" value="number" />
            <el-option label="字符串" value="string" />
            <el-option label="布尔" value="boolean" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editing.dataType === 'number'" label="量程">
          <el-input-number v-model="editing.min" class="half" />
          <el-input-number v-model="editing.max" class="half" />
        </el-form-item>
        <el-form-item label="可写">
          <el-select v-model="editing.writable" clearable placeholder="未指定">
            <el-option label="允许写值" :value="true" />
            <el-option label="只读" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editing.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="commitEdit">确定</el-button>
      </template>
    </el-dialog>

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
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import { usePageStore } from '@/stores/pageStore'
import { useDeviceStore } from '@/stores/deviceStore'
import {
  parseTagCsv,
  tagsToCsv,
  tagKey,
  createTagId,
  type TagDef,
} from '@/types/tag'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const projectStore = useProjectStore()
const pageStore = usePageStore()
const deviceStore = useDeviceStore()

const tags = ref<TagDef[]>([])
const keyword = ref('')
const saving = ref(false)

const editVisible = ref(false)
const editing = ref<TagDef | null>(null)
const editingIndex = ref(-1)

const bindVisible = ref(false)
const bindings = ref<Array<{ pageName: string; elementName: string; type: string }>>([])

const fileInput = ref<HTMLInputElement | null>(null)

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

function collectBindings(tag: TagDef) {
  const rows: Array<{ pageName: string; elementName: string; type: string }> = []
  for (const page of pageStore.pages) {
    for (const el of page.elements) {
      const hit = el.dataBindings?.some(
        b =>
          b.variable === tagKey(tag) ||
          (b.variable === tag.name && (el.deviceId === tag.deviceId || !el.deviceId)),
      )
      if (hit) {
        rows.push({ pageName: page.name, elementName: el.name, type: el.type })
      }
    }
  }
  return rows
}

function bindingCount(tag: TagDef) {
  return collectBindings(tag).length
}

function showBindings(tag: TagDef) {
  bindings.value = collectBindings(tag)
  bindVisible.value = true
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
    const map = new Map<string, TagDef>()
    for (const t of tags.value) map.set(tagKey(t), t)
    for (const t of parsed) map.set(tagKey(t), t)
    tags.value = [...map.values()]
    ElMessage.success(`已导入 ${parsed.length} 个点位`)
  }
  reader.readAsText(file, 'utf-8')
  input.value = ''
}

function handleExport() {
  const csv = tagsToCsv(tags.value)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectStore.projectName}-点表.csv`
  a.click()
  URL.revokeObjectURL(url)
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

<style scoped lang="scss">
.tag-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .spacer {
    flex: 1;
  }

  .search {
    width: 220px;
  }
}

.hidden-input {
  display: none;
}

.half {
  width: 45%;
  margin-right: 4%;
}
</style>
