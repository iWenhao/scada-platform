<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="720px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="88px">
      <el-form-item label="名称">
        <el-input v-model="form.name" placeholder="例如：高位水箱" maxlength="12" style="width: 200px" />
      </el-form-item>

      <el-form-item label="图标 SVG">
        <el-input
          v-model="form.svg"
          type="textarea"
          :rows="5"
          spellcheck="false"
          placeholder='<svg viewBox="0 0 100 100">…</svg>'
        />
        <p class="tip">
          粘贴完整 SVG 源码。要能随状态变色，描边/填充必须写成
          <code>currentColor</code>；多色填充稿不会变色。
        </p>
        <ul v-if="warnings.length" class="warn-list">
          <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
        </ul>
      </el-form-item>

      <el-form-item label="尺寸">
        <el-input-number v-model="form.width" :min="20" :max="400" :step="10" />
        <span class="unit">宽</span>
        <el-input-number v-model="form.height" :min="20" :max="400" :step="10" />
        <span class="unit">高</span>
        <el-checkbox v-model="form.lockRatio" :disabled="!aspectRatio">锁定比例</el-checkbox>
      </el-form-item>

      <el-form-item label="组件类型">
        <el-radio-group v-model="form.stateful">
          <el-radio-button :value="false">无状态</el-radio-button>
          <el-radio-button :value="true">有状态</el-radio-button>
        </el-radio-group>
        <p class="tip">
          无状态组件不会变色；有状态组件按下面定义的状态显示不同颜色与动画。
          「未绑定」（元素没接到可信数据）是系统固定档，固定为灰色且不动，不可配置。
        </p>
      </el-form-item>

      <el-form-item v-if="form.stateful" label="状态定义">
        <CustomStateTable v-model="states" />
      </el-form-item>

      <el-form-item label="运转动效">
        <el-switch v-model="motionEnabled" active-text="有旋转部件" />
        <p v-if="motionEnabled" class="tip">
          把旋转部件从上面的主图元里<b>删掉</b>，再贴到这里——主图元是一整张位图，
          位图里的某个圆无法单独旋转，留在主图元里会出现「静止件 + 转动件」重影。
        </p>
      </el-form-item>

      <div v-if="motionEnabled" class="motion-block">
        <el-input
          v-model="motion.svg"
          type="textarea"
          :rows="2"
          spellcheck="false"
          placeholder='旋转部件片段，例如 <circle cx="50" cy="50" r="14" stroke="currentColor" fill="none" />'
        />
        <div class="motion-fields">
          <label>圆心 X
            <el-input-number v-model="motion.cx" :controls="false" size="small" />
          </label>
          <label>圆心 Y
            <el-input-number v-model="motion.cy" :controls="false" size="small" />
          </label>
          <label>方向
            <el-select v-model="motion.direction" size="small">
              <el-option label="顺时针" :value="1" />
              <el-option label="逆时针" :value="-1" />
            </el-select>
          </label>
          <label>角速度
            <el-input-number v-model="motion.degPerUnit" :controls="false" size="small" />
          </label>
          <label>驱动变量
            <el-input v-model="motion.driveVariable" size="small" placeholder="留空取第一个绑定" />
          </label>
        </div>
      </div>

      <el-form-item label="预览">
        <div class="preview-row">
          <div class="icon-preview" v-html="previewSvg"></div>
          <el-select v-model="previewKey" size="small" style="width: 140px">
            <el-option v-for="opt in previewOptions" :key="opt.key" :label="opt.label" :value="opt.key" />
          </el-select>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">{{ props.editing ? '保存' : '创建' }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CustomStateTable from './CustomStateTable.vue'
import {
  buildCustomStatusRules,
  defaultCustomStates,
  normalizeCustomIconSvg,
  parseCustomStates,
  parseSvgSize,
  type CustomStateRow,
} from '@/industrial/customComponent'
import { DEFAULT_ELEMENT_COLOR, UNBOUND_ELEMENT_COLOR } from '@/core/canvas/elementStatus'
import type { ComponentDefinition, CompareCondition } from '@/types/scada'

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

const STARTER_SVG =
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n' +
  '  <g fill="none" stroke="currentColor" stroke-width="3">\n' +
  '    <rect x="15" y="20" width="70" height="60" rx="4" />\n  </g>\n</svg>'

const form = reactive({
  name: '',
  svg: STARTER_SVG,
  width: 80,
  height: 80,
  lockRatio: true,
  stateful: false,
})

const states = ref<CustomStateRow[]>(defaultCustomStates())
const motionEnabled = ref(false)
const motion = reactive({
  svg: '',
  cx: 50,
  cy: 50,
  direction: 1 as 1 | -1,
  degPerUnit: 120,
  driveVariable: '',
})

/** 新组件的 type：打开对话框时定一次，编辑模式沿用原 type（同 type 覆盖） */
const newType = ref(`custom_${Date.now()}`)
const typeKey = computed(() => props.editing?.type || newType.value)

const normalized = computed(() => normalizeCustomIconSvg(form.svg, typeKey.value))
const warnings = computed(() => normalized.value.warnings)
const aspectRatio = computed(() => {
  const size = parseSvgSize(form.svg)
  return size && size.height > 0 ? size.width / size.height : 0
})

// 贴进新 SVG 时自动带出尺寸（用户仍可改）
watch(() => form.svg, (svg) => {
  const size = parseSvgSize(svg)
  if (!size) return
  form.width = size.width
  form.height = size.height
})

// 锁比例时改宽联动高
watch(() => form.width, (w) => {
  if (!form.lockRatio || !aspectRatio.value) return
  form.height = Math.round(Math.min(Math.max(w / aspectRatio.value, 20), 400))
})

const previewOptions = computed(() => {
  if (!form.stateful) return [{ key: 'default', label: '默认', color: DEFAULT_ELEMENT_COLOR }]
  return [
    { key: 'unbound', label: '未绑定', color: UNBOUND_ELEMENT_COLOR },
    ...states.value.map((s, i) => ({ key: `s${i}`, label: s.name || `状态 ${i + 1}`, color: s.color })),
    { key: 'default', label: '未命中', color: DEFAULT_ELEMENT_COLOR },
  ]
})

const previewKey = ref('unbound')
const previewColor = computed(
  () => previewOptions.value.find((o) => o.key === previewKey.value)?.color ?? DEFAULT_ELEMENT_COLOR,
)

const previewSvg = computed(() => {
  const svg = normalized.value.svg
  if (!svg) return ''
  return svg.split('currentColor').join(previewColor.value)
})

const dialogTitle = computed(() => (props.editing ? '编辑自定义组件' : '创建自定义组件'))

watch(() => props.modelValue, (val) => {
  if (!val) return
  const editing = props.editing
  if (editing) {
    form.name = editing.name
    form.svg = editing.icon || STARTER_SVG
    form.width = editing.defaultWidth
    form.height = editing.defaultHeight
    form.stateful = (editing.statusRules?.length ?? 0) > 0
    states.value = parseCustomStates(editing.statusRules ?? [])
    const rotor = editing.motion?.rotors?.[0]
    motionEnabled.value = !!rotor
    if (rotor) {
      motion.svg = rotor.svg
      motion.cx = rotor.cx
      motion.cy = rotor.cy
      motion.direction = rotor.direction ?? 1
      motion.degPerUnit = editing.motion?.degPerUnit ?? 120
      motion.driveVariable = editing.motion?.driveVariable ?? ''
    }
  } else {
    form.name = ''
    form.svg = STARTER_SVG
    newType.value = `custom_${Date.now()}`
    states.value = defaultCustomStates()
    motionEnabled.value = false
    motion.svg = ''
  }
  previewKey.value = form.stateful ? 'unbound' : 'default'
})

function handleConfirm() {
  const name = form.name.trim()
  if (!name) {
    ElMessage.warning('请输入组件名称')
    return
  }
  const icon = normalized.value.svg
  if (!icon) {
    ElMessage.warning(warnings.value[0] || '请粘贴有效的 SVG 源码')
    return
  }

  const statusRules = form.stateful ? buildCustomStatusRules(states.value) : []
  if (form.stateful && !statusRules.length) {
    ElMessage.warning('有状态组件至少要有一条完整的状态（填了状态名与判定变量）')
    return
  }

  // 旋转部件：片段里的 id 同样要加前缀，否则与主图元的 id 撞车
  const rotorRaw = motionEnabled.value ? motion.svg.trim() : ''
  const rotor = rotorRaw ? normalizeCustomIconSvg(rotorRaw, `${typeKey.value}-rotor`) : null
  const motionDef =
    rotor?.svg && rotorRaw
      ? {
          driveVariable: motion.driveVariable.trim() || undefined,
          threshold: 0.1,
          degPerUnit: Number(motion.degPerUnit) || 120,
          rotors: [
            {
              svg: rotor.svg,
              cx: Number(motion.cx) || 0,
              cy: Number(motion.cy) || 0,
              direction: motion.direction,
            },
          ],
        }
      : undefined

  // 把状态里用到的变量预先绑上：元素拖进画布就有绑定，未绑定判定才有意义
  const variables = [
    ...new Set(
      statusRules
        .map((r) => (r.condition as CompareCondition).variable)
        .filter((v): v is string => !!v),
    ),
  ]

  const def: ComponentDefinition = {
    type: typeKey.value,
    name,
    group: 'custom',
    icon,
    defaultWidth: form.width,
    defaultHeight: form.height,
    defaultConfig: motionDef ? { animate: true } : {},
    statusRules,
    dataBindings: variables.map((v) => ({ property: v, variable: v })),
    properties: [
      { key: 'name', label: '名称', type: 'string', default: name, group: '基本' },
      ...(motionDef
        ? [{ key: 'animate', label: '运转动效', type: 'boolean' as const, default: true, group: '基本' }]
        : []),
    ],
    ...(motionDef ? { motion: motionDef } : {}),
  }

  emit('confirm', def)
  ElMessage.success(props.editing ? '已保存修改' : `已创建组件「${name}」`)
  visible.value = false
}
</script>

<style scoped lang="scss">
.unit {
  margin: 0 10px 0 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.tip {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-tertiary);

  code {
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }

  b {
    font-weight: 500;
    color: var(--text-secondary);
  }
}

.warn-list {
  margin: 6px 0 0;
  padding-left: 16px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-color-warning);
}

.motion-block {
  margin: 0 0 18px 88px;

  .motion-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);

    label {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    :deep(.el-input-number),
    :deep(.el-select) {
      width: 92px;
    }

    :deep(.el-input) {
      width: 140px;
    }
  }
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-preview {
  width: 72px;
  height: 72px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;

  :deep(svg) {
    width: 56px;
    height: 56px;
  }
}
</style>
