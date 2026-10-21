<template>
  <el-form-item label="图标来源">
    <div class="source-row">
      <el-radio-group v-model="mode" size="small">
        <el-radio-button value="svg">SVG 源码</el-radio-button>
        <el-radio-button value="image">图片转换</el-radio-button>
      </el-radio-group>
      <span class="svg-hint">
        {{ mode === 'svg' ? '粘贴设计稿导出的 SVG，或手写源码' : '上传现场设备图 / 网图，自动转成图标' }}
      </span>
    </div>
  </el-form-item>

  <el-form-item v-if="mode === 'svg'" label="图标 SVG">
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
  </el-form-item>

  <el-form-item v-else label="设备图片">
    <CustomImageSource
      ref="imagePanel"
      :active="props.active"
      :require-recolor="props.requireRecolor"
      @select="handleImageSelect"
    />
  </el-form-item>

  <el-form-item v-if="errors.length || visibleWarnings.length" label=" ">
    <ul v-if="errors.length" class="error-list">
      <li v-for="(e, i) in errors" :key="`e${i}`">{{ e }}</li>
    </ul>
    <ul v-if="visibleWarnings.length" class="warn-list">
      <li v-for="(w, i) in visibleWarnings" :key="`w${i}`">{{ w }}</li>
    </ul>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import CustomImageSource from './CustomImageSource.vue'
import { validateSvgUpload } from '@/industrial/customComponent'

const props = withDefaults(
  defineProps<{
    /** SVG 源码（粘贴或上传来的原文，归一化在父组件统一做） */
    modelValue: string
    /** 归一化产出的告警（如缺 currentColor），由父组件计算后传进来展示 */
    warnings: string[]
    /** 阻断保存的问题（结构不可渲染 / 外链），由父组件计算 */
    errors: string[]
    /** 对话框是否打开：关闭再打开时回到 SVG 页签 */
    active?: boolean
    /** 有状态组件：图片方案只能选可随状态变色的描摹 */
    requireRecolor?: boolean
  }>(),
  { active: false, requireRecolor: false },
)

const emit = defineEmits<{ 'update:modelValue': [svg: string] }>()

type IconSourceMode = 'svg' | 'image'

const mode = ref<IconSourceMode>('svg')
const imagePanel = ref<InstanceType<typeof CustomImageSource> | null>(null)

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

function handleImageSelect(svg: string): void {
  emit('update:modelValue', svg)
}

/**
 * 图片模式下「没有 currentColor」是用户主动选择原图内嵌的必然结果（卡片上已写明
 * 「保持原图」），再顶一条告警只会制造噪声。有状态组件不会走到这里——面板会把
 * 不可变色的方案禁用并自动切到描摹。
 */
const visibleWarnings = computed(() =>
  mode.value === 'image' && !props.requireRecolor
    ? props.warnings.filter((w) => !w.includes('currentColor'))
    : props.warnings,
)

/**
 * 剪贴板/拖拽进来的位图由父对话框转交到这里：先切到图片页签再交给面板。
 * nextTick 是必须的——v-else 分支刚挂载时 ref 还是 null。
 */
async function acceptImageFile(file: File): Promise<void> {
  mode.value = 'image'
  await nextTick()
  imagePanel.value?.acceptFile(file)
}

watch(
  () => props.active,
  (open) => {
    if (open) mode.value = 'svg'
  },
)

defineExpose({ acceptImageFile })
</script>

<style src="./custom-component.scss" scoped lang="scss"></style>
<style scoped lang="scss">
.source-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
