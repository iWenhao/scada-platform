<template>
  <div>
    <!-- 基本属性 -->
    <div class="property-section">
      <div class="section-title">基本属性</div>

      <div class="property-item">
        <div class="property-label">名称</div>
        <el-input v-model="name" size="small" @change="handleNameChange" />
      </div>

      <div class="property-item">
        <div class="property-label">类型</div>
        <el-input :model-value="element.type" size="small" disabled />
      </div>
    </div>

    <!-- 位置属性 -->
    <div class="property-section">
      <div class="section-title">位置</div>

      <div class="property-row">
        <div class="property-item">
          <div class="property-label">X</div>
          <el-input-number v-model="x" size="small" :step="1" @change="handlePositionChange" />
        </div>
        <div class="property-item">
          <div class="property-label">Y</div>
          <el-input-number v-model="y" size="small" :step="1" @change="handlePositionChange" />
        </div>
      </div>

      <div class="property-row">
        <div class="property-item">
          <div class="property-label">宽度</div>
          <el-input-number v-model="width" size="small" :min="10" :step="10" @change="handleSizeChange" />
        </div>
        <div class="property-item">
          <div class="property-label">高度</div>
          <el-input-number v-model="height" size="small" :min="10" :step="10" @change="handleSizeChange" />
        </div>
      </div>

      <div class="property-item">
        <div class="property-label">旋转</div>
        <el-slider v-model="rotation" :min="0" :max="360" :step="1" @change="handleRotationChange" />
      </div>
    </div>

    <!-- 组件自定义属性 -->
    <div v-if="componentDef" class="property-section">
      <div class="section-title">组件属性</div>

      <div v-for="prop in componentDef.properties" :key="prop.key" class="property-item">
        <div class="property-label">{{ prop.label }}</div>

        <el-input
          v-if="prop.type === 'string'"
          v-model="properties[prop.key]"
          size="small"
          :placeholder="prop.placeholder"
          :maxlength="prop.maxLength"
          :show-word-limit="!!prop.maxLength"
          @change="handlePropertyChange"
        />
        <el-input-number
          v-else-if="prop.type === 'number'"
          v-model="properties[prop.key]"
          size="small"
          :min="prop.min"
          :max="prop.max"
          :step="prop.step ?? 1"
          @change="handlePropertyChange"
        />
        <el-switch
          v-else-if="prop.type === 'boolean'"
          v-model="properties[prop.key]"
          @change="handlePropertyChange"
        />
        <el-color-picker
          v-else-if="prop.type === 'color'"
          v-model="properties[prop.key]"
          size="small"
          @change="handlePropertyChange"
        />
        <el-select
          v-else-if="prop.type === 'select'"
          v-model="properties[prop.key]"
          size="small"
          @change="handlePropertyChange"
        >
          <el-option
            v-for="opt in prop.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-slider
          v-else-if="prop.type === 'range'"
          v-model="properties[prop.key]"
          :min="prop.min"
          :max="prop.max"
          :step="prop.step"
          @change="handlePropertyChange"
        />

        <div v-if="prop.hint" class="property-hint">{{ prop.hint }}</div>
        <!-- 取值不在可选项内（手改工程 JSON 或导入他方文件）：已按默认回显，明说原值 -->
        <div v-if="notices[prop.key]" class="property-notice">
          原值「{{ notices[prop.key].raw }}」不在可选项中，已按默认显示
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ComponentInstance } from '@/types/scada'
import { getComponentDefinition } from '@/industrial/registry'
import { normalizeProperties, type PropertyNotice } from '@/core/canvas/elementDefaults'

const props = defineProps<{
  element: ComponentInstance
}>()

const emit = defineEmits<{
  update: [patch: Partial<ComponentInstance>]
}>()

const name = ref('')
const x = ref(0)
const y = ref(0)
const width = ref(0)
const height = ref(0)
const rotation = ref(0)
const properties = ref<Record<string, any>>({})
/** 取值非法的属性（按 key 索引）：面板回显已按默认兜底，这里只负责提示 */
const notices = ref<Record<string, PropertyNotice>>({})

const componentDef = computed(() => getComponentDefinition(props.element.type) || null)

watch(
  () => props.element,
  (el) => {
    name.value = el.name
    x.value = el.x
    y.value = el.y
    width.value = el.width
    height.value = el.height
    rotation.value = el.rotation
    // 用定义的 default 补齐缺失项、按取值域修正非法项：新建元素的 properties
    // 来自 defaultConfig（多半是空的），不修正的话面板显示空 / 显示原值而画面
    // 按默认值渲染，两边对不上（详见 elementDefaults.ts）
    const normalized = normalizeProperties(el, componentDef.value)
    properties.value = normalized.values
    notices.value = normalized.notices
  },
  { immediate: true, deep: true },
)

function handleNameChange(val: string) {
  emit('update', { name: val })
}

function handlePositionChange() {
  emit('update', { x: x.value, y: y.value })
}

function handleSizeChange() {
  emit('update', { width: width.value, height: height.value })
}

function handleRotationChange(val: number) {
  emit('update', { rotation: val })
}

function handlePropertyChange() {
  emit('update', { properties: { ...properties.value } })
}
</script>

<style scoped lang="scss">
.property-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-primary);

  &:last-child {
    border-bottom: none;
  }
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
}

.property-item {
  margin-bottom: 12px;
}

.property-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.property-hint {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted);
  margin-top: 4px;
  word-break: break-all;
}

/* 取值非法的告警提示：比 hint 醒目一档，用警示色而非中性灰 */
.property-notice {
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-color-warning, #e6a23c);
  margin-top: 4px;
  word-break: break-all;
}

.property-row {
  display: flex;
  gap: 12px;

  .property-item {
    flex: 1;
  }
}
</style>
