<template>
  <el-dialog
    :model-value="modelValue"
    :title="editingIndex >= 0 ? '编辑点位' : '新增点位'"
    width="480px"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form v-if="draft" label-width="90px">
      <el-form-item label="设备 ID" required>
        <el-select
          v-model="draft.deviceId"
          filterable
          allow-create
          default-first-option
          placeholder="如 motor_1"
        >
          <el-option v-for="d in devices" :key="d" :label="d" :value="d" />
        </el-select>
      </el-form-item>
      <el-form-item label="变量名" required>
        <el-input v-model="draft.name" placeholder="如 speed" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="draft.description" />
      </el-form-item>
      <el-form-item label="单位">
        <el-input v-model="draft.unit" placeholder="如 rpm" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="draft.dataType">
          <el-option label="数值" value="number" />
          <el-option label="字符串" value="string" />
          <el-option label="布尔" value="boolean" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="draft.dataType === 'number'" label="量程">
        <el-input-number v-model="draft.min" class="half" />
        <el-input-number v-model="draft.max" class="half" />
      </el-form-item>
      <el-form-item label="可写">
        <el-select v-model="draft.writable" clearable placeholder="未指定">
          <el-option label="允许写值" :value="true" />
          <el-option label="只读" :value="false" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="draft.note" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TagDef } from '@/types/tag'

const props = defineProps<{
  modelValue: boolean
  form: TagDef | null
  editingIndex: number
  devices: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  confirm: [tag: TagDef]
}>()

/**
 * 表单草稿：prop 是父组件持有的对象，直接 `v-model` 到 prop 的属性是就地改父级状态
 * （vue/no-mutating-props），父组件也无法判断用户究竟改了什么。
 * 这里在 prop 引用变化时复制一份，编辑只动本地，确定时把整份草稿 emit 出去。
 * 父组件每次打开对话框都会新建一个对象（新增走字面量、编辑走深拷贝），故引用变化可靠。
 */
const draft = ref<TagDef | null>(props.form ? { ...props.form } : null)
watch(
  () => props.form,
  (v) => {
    draft.value = v ? { ...v } : null
  },
)

function confirm() {
  if (!draft.value) return
  emit('confirm', draft.value)
}
</script>

<style scoped>
.half {
  width: 45%;
  margin-right: 4%;
}
</style>
