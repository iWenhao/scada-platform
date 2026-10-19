<template>
  <div class="state-table">
    <div class="state-head">
      <span>状态名</span>
      <span>判定变量</span>
      <span>条件</span>
      <span>阈值</span>
      <span>颜色</span>
      <span>报警等级</span>
      <span>动效</span>
      <span />
    </div>

    <div v-for="(row, index) in modelValue" :key="index" class="state-row">
      <el-input
        :model-value="row.name"
        size="small"
        maxlength="8"
        @update:model-value="patch(index, { name: String($event ?? '') })"
      />
      <el-input
        :model-value="row.variable"
        size="small"
        placeholder="state"
        @update:model-value="patch(index, { variable: String($event ?? '') })"
      />
      <el-select
        :model-value="row.operator"
        size="small"
        @update:model-value="patch(index, { operator: $event })"
      >
        <el-option v-for="op in OPERATORS" :key="op" :label="op" :value="op" />
      </el-select>
      <el-input-number
        :model-value="row.value"
        size="small"
        :controls="false"
        @update:model-value="patch(index, { value: Number($event ?? 0) })"
      />
      <el-color-picker
        :model-value="row.color"
        size="small"
        @update:model-value="patch(index, { color: String($event ?? '#8c8c8c') })"
      />
      <el-select
        :model-value="row.severity"
        size="small"
        @update:model-value="patch(index, { severity: $event })"
      >
        <el-option label="正常" value="normal" />
        <el-option label="警告" value="warning" />
        <el-option label="严重" value="critical" />
      </el-select>
      <el-switch
        :model-value="row.stopMotion"
        size="small"
        inline-prompt
        active-text="停"
        inactive-text="转"
        @update:model-value="patch(index, { stopMotion: !!$event })"
      />
      <div class="row-ops">
        <el-button link size="small" :disabled="index === 0" @click="move(index, -1)">↑</el-button>
        <el-button
          link
          size="small"
          :disabled="index === modelValue.length - 1"
          @click="move(index, 1)"
        >
          ↓
        </el-button>
        <el-button link size="small" type="danger" @click="remove(index)">✕</el-button>
      </div>
    </div>

    <el-button size="small" class="add-btn" @click="add">+ 添加状态</el-button>

    <p class="hint">
      自上而下判定，<b>第一条命中即生效</b>；都不命中时显示默认青绿。
      报警等级决定这一档是否进报警面板——「严重/警告」才进，「正常」不进。
    </p>
  </div>
</template>

<script setup lang="ts">
import type { CustomStateRow } from '@/industrial/customComponent'
import type { AlarmSeverity } from '@/types/scada'

const props = defineProps<{ modelValue: CustomStateRow[] }>()
const emit = defineEmits<{ 'update:modelValue': [rows: CustomStateRow[]] }>()

const OPERATORS = ['>', '>=', '<', '<=', '=', '!='] as const

function patch(index: number, partial: Partial<CustomStateRow>) {
  emit(
    'update:modelValue',
    props.modelValue.map((row, i) => (i === index ? { ...row, ...partial } : row)),
  )
}

function add() {
  emit('update:modelValue', [
    ...props.modelValue,
    {
      name: '新状态',
      variable: 'state',
      operator: '=',
      value: 0,
      color: '#8c8c8c',
      severity: 'normal' as AlarmSeverity,
      stopMotion: false,
    },
  ])
}

function remove(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}

function move(index: number, delta: number) {
  const next = [...props.modelValue]
  const target = index + delta
  if (target < 0 || target >= next.length) return
  ;[next[index], next[target]] = [next[target], next[index]]
  emit('update:modelValue', next)
}
</script>

<style scoped lang="scss">
.state-table {
  width: 100%;
}

.state-head,
.state-row {
  display: grid;
  grid-template-columns: 72px 84px 66px 56px 44px 84px 56px 76px;
  gap: 6px;
  align-items: center;
}

.state-head {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.state-row {
  margin-bottom: 6px;
}

.state-row :deep(.el-input-number),
.state-row :deep(.el-select) {
  width: 100%;
}

.row-ops {
  display: flex;
  gap: 2px;
}

.add-btn {
  margin-top: 2px;
}

.hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-tertiary);

  b {
    color: var(--text-secondary);
    font-weight: 500;
  }
}
</style>
