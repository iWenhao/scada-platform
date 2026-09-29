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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ComponentInstance } from '@/types/scada'
import { getComponentDefinition } from '@/industrial/registry'

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
    properties.value = { ...el.properties }
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

.property-row {
  display: flex;
  gap: 12px;

  .property-item {
    flex: 1;
  }
}
</style>
