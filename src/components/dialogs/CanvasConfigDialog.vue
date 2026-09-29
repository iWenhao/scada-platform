<template>
  <el-dialog
    v-model="visible"
    title="画布配置"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="画布宽度">
        <el-input-number
          v-model="form.width"
          :min="800"
          :max="7680"
          :step="100"
        />
        <span class="unit">像素</span>
      </el-form-item>
      
      <el-form-item label="画布高度">
        <el-input-number
          v-model="form.height"
          :min="600"
          :max="4320"
          :step="100"
        />
        <span class="unit">像素</span>
      </el-form-item>
      
      <el-form-item label="背景颜色">
        <el-color-picker v-model="form.backgroundColor" />
      </el-form-item>
      
      <el-form-item label="显示网格">
        <el-switch v-model="form.showGrid" />
      </el-form-item>
      
      <el-form-item label="网格大小">
        <el-input-number
          v-model="form.gridSize"
          :min="10"
          :max="100"
          :step="5"
        />
        <span class="unit">像素</span>
      </el-form-item>
      
      <el-form-item label="网格颜色">
        <el-color-picker v-model="form.gridColor" />
      </el-form-item>

      <el-form-item label="网格吸附">
        <el-switch v-model="form.snapToGrid" />
        <span class="unit">拖动组件时对齐网格</span>
      </el-form-item>
      
      <el-form-item label="缩放范围">
        <div class="zoom-range">
          <el-slider
            v-model="zoomRange"
            range
            :min="0.1"
            :max="5"
            :step="0.1"
            @change="handleZoomRangeChange"
          />
          <span class="zoom-label">
            {{ Math.round(form.minZoom * 100) }}% - {{ Math.round(form.maxZoom * 100) }}%
          </span>
        </div>
      </el-form-item>
      
      <el-form-item label="预设尺寸">
        <el-button-group>
          <el-button @click="setPreset(1920, 1080)">1080P</el-button>
          <el-button @click="setPreset(2560, 1440)">2K</el-button>
          <el-button @click="setPreset(3840, 2160)">4K</el-button>
          <el-button @click="setPreset(2000, 1500)">自定义</el-button>
        </el-button-group>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleReset">重置</el-button>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { defaultCanvasConfig, type CanvasConfig } from '@/types/canvas'
import { useCanvasStore } from '@/stores/canvasStore'
import { useProjectStore } from '@/stores/projectStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const canvasStore = useCanvasStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const form = reactive<CanvasConfig>({ ...canvasStore.canvasConfig })
const zoomRange = ref<[number, number]>([form.minZoom, form.maxZoom])

watch(() => props.modelValue, (val) => {
  if (val) {
    Object.assign(form, canvasStore.canvasConfig)
    zoomRange.value = [form.minZoom, form.maxZoom]
  }
})

function setPreset(width: number, height: number) {
  form.width = width
  form.height = height
}

function handleZoomRangeChange(val: [number, number]) {
  form.minZoom = val[0]
  form.maxZoom = val[1]
}

function handleReset() {
  Object.assign(form, defaultCanvasConfig)
  zoomRange.value = [form.minZoom, form.maxZoom]
}

function handleConfirm() {
  canvasStore.updateCanvasConfig({ ...form })
  // 画布尺寸/网格等属于工程内容，标脏以便保存
  useProjectStore().markDirty()
  visible.value = false
}
</script>

<style scoped lang="scss">
.unit {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.zoom-range {
  width: 100%;
  
  .zoom-label {
    display: block;
    text-align: center;
    color: var(--text-secondary);
    font-size: 12px;
    margin-top: 4px;
  }
}

:deep(.el-button-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
