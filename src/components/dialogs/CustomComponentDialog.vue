<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="440px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="例如：高位水箱" maxlength="12" />
      </el-form-item>

      <el-form-item label="基础形状">
        <el-select v-model="form.shape">
          <el-option label="矩形" value="rect" />
          <el-option label="圆形" value="circle" />
          <el-option label="三角形" value="triangle" />
          <el-option label="菱形" value="diamond" />
          <el-option label="竖线" value="vline" />
          <el-option label="横线" value="hline" />
        </el-select>
      </el-form-item>

      <el-form-item label="宽度">
        <el-input-number v-model="form.width" :min="20" :max="400" :step="10" />
        <span class="unit">像素</span>
      </el-form-item>

      <el-form-item label="高度">
        <el-input-number v-model="form.height" :min="20" :max="400" :step="10" />
        <span class="unit">像素</span>
      </el-form-item>

      <el-form-item label="线条颜色">
        <el-color-picker v-model="form.color" />
      </el-form-item>

      <el-form-item label="预览">
        <div class="icon-preview" v-html="previewSvg"></div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentDefinition } from '@/types/scada'

const props = defineProps<{
  modelValue: boolean
  /** 编辑模式：传入要修改的自定义组件定义 */
  editing?: ComponentDefinition | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 创建/保存成功，返回组件定义 */
  confirm: [def: ComponentDefinition]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const form = reactive({
  name: '',
  shape: 'rect',
  width: 80,
  height: 80,
  color: '#00d4aa',
})

const SHAPES: Record<string, string> = {
  rect: '<rect x="20" y="25" width="60" height="50" rx="4" />',
  circle: '<circle cx="50" cy="50" r="28" />',
  triangle: '<polygon points="50,20 80,75 20,75" />',
  diamond: '<polygon points="50,18 82,50 50,82 18,50" />',
  vline: '<line x1="50" y1="15" x2="50" y2="85" />',
  hline: '<line x1="15" y1="50" x2="85" y2="50" />',
}

// 预览用 SVG（直接内嵌所选颜色）
const previewSvg = computed(
  () =>
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${form.color}" stroke-width="3">${SHAPES[form.shape] || ''}</g></svg>`,
)

const dialogTitle = computed(() => (props.editing ? '编辑自定义组件' : '创建自定义组件'))

// 从已有图标反解形状与颜色（编辑模式回填用）
function parseIcon(icon: string): { shape: string; color: string } {
  const shape = Object.entries(SHAPES).find(([, markup]) => icon.includes(markup))?.[0] || 'rect'
  const color = icon.match(/stroke="([^"]+)"/)?.[1] || '#00d4aa'
  return { shape, color }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.editing) {
      form.name = props.editing.name
      form.width = props.editing.defaultWidth
      form.height = props.editing.defaultHeight
      const parsed = parseIcon(props.editing.icon)
      form.shape = parsed.shape
      form.color = parsed.color
    } else {
      form.name = ''
      form.shape = 'rect'
      form.width = 80
      form.height = 80
    }
  }
})

function handleConfirm() {
  const name = form.name.trim()
  if (!name) {
    ElMessage.warning('请输入组件名称')
    return
  }

  const def: ComponentDefinition = {
    // 编辑模式保持原 type，创建模式生成新 type
    type: props.editing?.type || `custom_${Date.now()}`,
    name,
    group: 'custom',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="3">${SHAPES[form.shape] || ''}</g></svg>`,
    defaultWidth: form.width,
    defaultHeight: form.height,
    defaultConfig: {},
    statusRules: props.editing?.statusRules || [],
    dataBindings: props.editing?.dataBindings || [],
    properties: [
      { key: 'name', label: '名称', type: 'string', default: name, group: '基本' },
    ],
  }

  emit('confirm', def)
  ElMessage.success(props.editing ? '已保存修改' : `已创建组件「${name}」`)
  visible.value = false
}
</script>

<style scoped lang="scss">
.unit {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.icon-preview {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--accent-primary);

  :deep(svg) {
    width: 48px;
    height: 48px;
  }
}
</style>
