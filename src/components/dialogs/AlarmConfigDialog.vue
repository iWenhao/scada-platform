<template>
  <el-dialog
    v-model="visible"
    title="报警配置"
    width="760px"
    :close-on-click-modal="false"
    @open="onOpen"
  >
    <!-- 列表态 -->
    <template v-if="!editing">
      <el-table :data="defs" size="small" empty-text="暂无报警定义，点击「新增报警」创建">
        <el-table-column prop="name" label="名称" min-width="110" />
        <el-table-column label="绑定变量" min-width="150">
          <template #default="{ row }">{{ row.deviceId }}.{{ row.variable }}</template>
        </el-table-column>
        <el-table-column label="触发条件" min-width="130">
          <template #default="{ row }">{{ describeCondition(row.condition) }}</template>
        </el-table-column>
        <el-table-column label="级别" width="70">
          <template #default="{ row }">
            <el-tag :type="row.severity === 'critical' ? 'danger' : 'warning'" size="small">
              {{ row.severity === 'critical' ? '报警' : '预警' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="死区" width="60">
          <template #default="{ row }">{{ row.deadband || '-' }}</template>
        </el-table-column>
        <el-table-column label="延时" width="70">
          <template #default="{ row }">{{ row.onDelayMs ? `${row.onDelayMs / 1000}s` : '-' }}</template>
        </el-table-column>
        <el-table-column label="启用" width="70">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="commit()" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ $index }">
            <el-button size="small" text type="primary" @click="startEdit($index)">编辑</el-button>
            <el-button size="small" text type="danger" @click="remove($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-button class="add-btn" @click="startEdit(-1)">
        <el-icon><Plus /></el-icon>
        新增报警
      </el-button>
    </template>

    <!-- 编辑态 -->
    <template v-else>
      <el-form label-width="90px" size="default">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如：储罐液位过高" maxlength="30" />
        </el-form-item>
        <el-form-item label="设备">
          <el-select v-model="form.deviceId" filterable placeholder="选择数据源设备" @change="onDeviceChange">
            <el-option v-for="d in devices" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
        <el-form-item label="变量">
          <el-select
            v-model="form.variable"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入变量名"
          >
            <el-option v-for="v in variableOptions" :key="v" :label="v" :value="v" />
          </el-select>
          <div class="form-hint">候选来自设备最近一次上报的数据；数据源未连接时可直接手填</div>
        </el-form-item>
        <el-form-item label="级别">
          <el-radio-group v-model="form.severity">
            <el-radio value="warning">预警</el-radio>
            <el-radio value="critical">报警</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="触发条件">
          <div class="cond-row">
            <el-select v-model="form.operator" class="cond-op">
              <el-option label="大于" value=">" />
              <el-option label="小于" value="<" />
              <el-option label="大于等于" value=">=" />
              <el-option label="小于等于" value="<=" />
              <el-option label="等于" value="=" />
              <el-option label="介于" value="range" />
            </el-select>
            <el-input-number v-model="form.value1" :controls="false" class="cond-val" placeholder="阈值" />
            <template v-if="form.operator === 'range'">
              <span class="cond-sep">至</span>
              <el-input-number v-model="form.value2" :controls="false" class="cond-val" placeholder="上限" />
            </template>
          </div>
        </el-form-item>
        <el-form-item label="死区">
          <el-input-number v-model="form.deadband" :min="0" :step="0.5" :controls="false" />
          <div class="form-hint">恢复需偏离触发值至少该幅度，0 = 立即恢复；用于抑制临界抖动</div>
        </el-form-item>
        <el-form-item label="延时">
          <el-input-number v-model="form.onDelaySec" :min="0" :step="1" :controls="false" />
          <span class="form-hint" style="margin-left: 6px">秒</span>
          <div class="form-hint">条件持续满足该时长才真正报警；0 = 立即；用于过滤瞬时毛刺</div>
        </el-form-item>
      </el-form>
      <div class="edit-actions">
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </div>
    </template>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import { useDeviceStore } from '@/stores/deviceStore'
import type { AlarmDefinition } from '@/types/alarm'
import type { Condition } from '@/types/scada'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const projectStore = useProjectStore()
const deviceStore = useDeviceStore()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const defs = ref<AlarmDefinition[]>([])
const editing = ref(false)
const editIndex = ref(-1)

interface AlarmForm {
  name: string
  deviceId: string
  variable: string
  severity: 'warning' | 'critical'
  operator: '>' | '<' | '>=' | '<=' | '=' | 'range'
  value1: number
  value2: number
  deadband: number
  onDelaySec: number
}

function emptyForm(): AlarmForm {
  return {
    name: '',
    deviceId: '',
    variable: '',
    severity: 'warning',
    operator: '>',
    value1: 0,
    value2: 0,
    deadband: 0,
    onDelaySec: 0,
  }
}

const form = ref<AlarmForm>(emptyForm())

const devices = computed(() => deviceStore.availableDevices)

/** 候选变量来自该设备最近一次上报的数据字段 */
const variableOptions = computed(() => {
  if (!form.value.deviceId) return []
  return Object.keys(deviceStore.getDeviceData(form.value.deviceId))
})

watch(visible, (open) => {
  if (open) editing.value = false
})

function onOpen() {
  // 每次打开从工程取最新，编辑未提交的改动随关闭丢弃
  defs.value = JSON.parse(JSON.stringify(projectStore.alarmDefs))
}

function onDeviceChange() {
  form.value.variable = ''
}

function describeCondition(cond: Condition): string {
  if (cond.type === 'compare') return `${cond.variable} ${cond.operator} ${cond.value}`
  if (cond.type === 'range') return `${cond.min} ≤ ${cond.variable} ≤ ${cond.max}`
  if (cond.type === 'expression') return cond.expr
  return '复杂条件'
}

function startEdit(index: number) {
  editIndex.value = index
  if (index >= 0) {
    const def = defs.value[index]
    const cond = def.condition
    form.value = {
      name: def.name,
      deviceId: def.deviceId,
      variable: def.variable,
      severity: def.severity,
      operator: cond.type === 'range' ? 'range' : (cond as any).operator ?? '>',
      value1: cond.type === 'range' ? cond.min : (cond as any).value ?? 0,
      value2: cond.type === 'range' ? cond.max : 0,
      deadband: def.deadband,
      onDelaySec: def.onDelayMs / 1000,
    }
  } else {
    form.value = emptyForm()
  }
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

function buildCondition(): Condition | null {
  const { operator, value1, value2 } = form.value
  const variable = form.value.variable.trim()
  if (operator === 'range') {
    return { type: 'range', variable, min: value1, max: value2 }
  }
  return { type: 'compare', variable, operator, value: value1 }
}

function save() {
  const f = form.value
  if (!f.name.trim() || !f.deviceId.trim() || !f.variable.trim()) {
    ElMessage.warning('请填写名称、设备与变量')
    return
  }
  const condition = buildCondition()
  if (!condition) {
    ElMessage.warning('触发条件不完整')
    return
  }
  if (f.operator === 'range' && f.value1 > f.value2) {
    ElMessage.warning('区间下限不能大于上限')
    return
  }

  const def: AlarmDefinition = {
    id: editIndex.value >= 0 ? defs.value[editIndex.value].id : `alm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: f.name.trim(),
    deviceId: f.deviceId.trim(),
    variable: f.variable.trim(),
    severity: f.severity,
    condition,
    deadband: f.deadband || 0,
    onDelayMs: Math.round((f.onDelaySec || 0) * 1000),
    enabled: editIndex.value >= 0 ? defs.value[editIndex.value].enabled : true,
  }

  if (editIndex.value >= 0) {
    defs.value.splice(editIndex.value, 1, def)
  } else {
    defs.value.push(def)
  }
  commit()
  editing.value = false
}

function remove(index: number) {
  defs.value.splice(index, 1)
  commit()
}

/** 提交到工程：报警定义属于工程内容，保存工程时一并落盘 */
function commit() {
  projectStore.setAlarmDefs(JSON.parse(JSON.stringify(defs.value)))
}
</script>

<style scoped lang="scss">
.add-btn {
  width: 100%;
  margin-top: 10px;
  border-style: dashed;
}

.cond-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.cond-op {
  width: 120px;
}

.cond-val {
  width: 110px;
}

.cond-sep {
  color: var(--text-secondary);
}

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
