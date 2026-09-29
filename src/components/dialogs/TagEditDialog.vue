<template>
  <el-dialog
    :model-value="modelValue"
    :title="editingIndex >= 0 ? '编辑点位' : '新增点位'"
    width="480px"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form v-if="form" label-width="90px">
      <el-form-item label="设备 ID" required>
        <el-select
          v-model="form.deviceId"
          filterable
          allow-create
          default-first-option
          placeholder="如 motor_1"
        >
          <el-option v-for="d in devices" :key="d" :label="d" :value="d" />
        </el-select>
      </el-form-item>
      <el-form-item label="变量名" required>
        <el-input v-model="form.name" placeholder="如 speed" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" />
      </el-form-item>
      <el-form-item label="单位">
        <el-input v-model="form.unit" placeholder="如 rpm" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="form.dataType">
          <el-option label="数值" value="number" />
          <el-option label="字符串" value="string" />
          <el-option label="布尔" value="boolean" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="form.dataType === 'number'" label="量程">
        <el-input-number v-model="form.min" class="half" />
        <el-input-number v-model="form.max" class="half" />
      </el-form-item>
      <el-form-item label="可写">
        <el-select v-model="form.writable" clearable placeholder="未指定">
          <el-option label="允许写值" :value="true" />
          <el-option label="只读" :value="false" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.note" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="emit('confirm')">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { TagDef } from '@/types/tag'

defineProps<{
  modelValue: boolean
  form: TagDef | null
  editingIndex: number
  devices: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  confirm: []
}>()
</script>

<style scoped>
.half {
  width: 45%;
  margin-right: 4%;
}
</style>
