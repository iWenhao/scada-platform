<template>
  <el-form-item label="图标 SVG">
    <el-input
      v-model="svgText"
      type="textarea"
      :rows="5"
      spellcheck="false"
      placeholder='<svg viewBox="0 0 100 100">…</svg>'
    />
    <div class="svg-actions">
      <el-upload
        accept=".svg,image/svg+xml"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleSvgFile"
      >
        <el-button size="small">选择 .svg 文件</el-button>
      </el-upload>
      <span class="svg-hint">与粘贴等效，宽高按 viewBox 自动带出</span>
    </div>
    <p class="tip">
      粘贴完整 SVG 源码，或上传 .svg 文件。要能随状态变色，描边/填充必须写成
      <code>currentColor</code>；画布以 data URI 渲染图标，不能引用外部资源（图片请内嵌为 data URI）。
    </p>
    <ul v-if="errors.length" class="error-list">
      <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
    </ul>
    <ul v-if="warnings.length" class="warn-list">
      <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
    </ul>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { validateSvgUpload } from '@/industrial/customComponent'

const props = defineProps<{
  /** SVG 源码（粘贴或上传来的原文，归一化在父组件统一做） */
  modelValue: string
  /** 归一化产出的告警（如缺 currentColor），由父组件计算后传进来展示 */
  warnings: string[]
  /** 阻断保存的问题（结构不可渲染 / 外链），由父组件计算 */
  errors: string[]
}>()

const emit = defineEmits<{ 'update:modelValue': [svg: string] }>()

const svgText = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})

/**
 * 上传 .svg 文件：校验后读成文本回填，与粘贴走同一条 normalizeCustomIconSvg 管线
 * （id 加前缀 / xlink 收敛 / currentColor 告警），父组件 watch form.svg 时顺带把
 * viewBox 同步成宽高。
 *
 * 只收 SVG：位图没有 currentColor，状态变色对它无效（判据见 validateSvgUpload）。
 */
async function handleSvgFile(uploadFile: UploadFile): Promise<void> {
  const file = uploadFile.raw
  if (!file) return
  const err = validateSvgUpload(file)
  if (err) {
    ElMessage.error(err)
    return
  }
  try {
    emit('update:modelValue', await file.text())
    ElMessage.success(`已载入 ${file.name}`)
  } catch {
    ElMessage.error('读取文件失败')
  }
}
</script>

<style src="./custom-component.scss" scoped lang="scss"></style>
