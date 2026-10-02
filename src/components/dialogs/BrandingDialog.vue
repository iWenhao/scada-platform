<template>
  <el-dialog
    :model-value="modelValue"
    title="站点品牌设置"
    width="480px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="syncForm"
  >
    <el-form label-width="90px" @submit.prevent>
      <el-form-item label="平台名称">
        <el-input
          v-model="form.name"
          maxlength="30"
          :placeholder="`留空使用默认「${DEFAULT_BRAND_NAME}」`"
          clearable
        />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input
          v-model="form.subtitle"
          maxlength="30"
          :placeholder="`留空使用默认「${DEFAULT_BRAND_SUBTITLE}」`"
          clearable
        />
      </el-form-item>
      <el-form-item label="图标">
        <div class="icon-editor">
          <img :src="form.icon || DEFAULT_BRAND_ICON" alt="品牌图标" class="icon-preview" />
          <div class="icon-actions">
            <el-upload
              action="#"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleIconFile"
            >
              <el-button size="small">上传图片</el-button>
            </el-upload>
            <el-button v-if="form.icon" size="small" text type="danger" @click="form.icon = null">
              移除
            </el-button>
            <span class="icon-hint">PNG / JPG / SVG，位图自动缩放为 256×256</span>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="效果预览">
        <div class="brand-preview">
          <img :src="form.icon || DEFAULT_BRAND_ICON" alt="" class="preview-logo" />
          <div>
            <div class="preview-title">{{ form.name.trim() || DEFAULT_BRAND_NAME }}</div>
            <div class="preview-sub">{{ form.subtitle.trim() || DEFAULT_BRAND_SUBTITLE }}</div>
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :loading="saving" @click="handleReset">恢复默认</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'
import {
  useBrandingStore,
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SUBTITLE,
  DEFAULT_BRAND_ICON,
} from '@/stores/brandingStore'

defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const branding = useBrandingStore()
const saving = ref(false)
const form = reactive<{ name: string; subtitle: string; icon: string | null }>({
  name: '',
  subtitle: '',
  icon: null,
})

/** 打开对话框时从 store 同步当前设置 */
function syncForm(): void {
  form.name = branding.name ?? ''
  form.subtitle = branding.subtitle ?? ''
  form.icon = branding.icon
}

/** 上传图标统一转成 data URL：SVG 矢量原样保留清晰度，位图居中裁剪缩放为 256×256 PNG */
async function handleIconFile(file: UploadFile): Promise<void> {
  const raw = file.raw
  if (!raw) return
  try {
    form.icon = await fileToIconDataUrl(raw)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '图片处理失败')
  }
}

async function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(blob)
  })
}

async function fileToIconDataUrl(file: File): Promise<string> {
  if (file.type === 'image/svg+xml') {
    // SVG 无需栅格化；限制原始体积，避免把超大矢量塞进存储
    if (file.size > 100 * 1024) throw new Error('SVG 图标请控制在 100KB 以内')
    return readAsDataUrl(file)
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('图片请控制在 5MB 以内')
  const dataUrl = await readAsDataUrl(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片解析失败'))
    image.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持图片处理')
  canvas.width = canvas.height = 256
  // 等比缩放后居中裁剪（cover），图标不会变形也不会留透明边
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const scale = Math.max(256 / w, 256 / h)
  ctx.drawImage(img, (256 - w * scale) / 2, (256 - h * scale) / 2, w * scale, h * scale)
  return canvas.toDataURL('image/png')
}

async function handleSave(): Promise<void> {
  saving.value = true
  try {
    await branding.save({ name: form.name, subtitle: form.subtitle, icon: form.icon })
    ElMessage.success('已保存')
    emit('update:modelValue', false)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleReset(): Promise<void> {
  try {
    await ElMessageBox.confirm('恢复默认品牌？当前的名称与图标设置将被清除。', '恢复默认', {
      type: 'warning',
      confirmButtonText: '恢复默认',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  saving.value = true
  try {
    await branding.reset()
    syncForm()
    ElMessage.success('已恢复默认品牌')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.icon-editor {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.icon-preview {
  width: 48px;
  height: 48px;
  flex: none;
  border-radius: 8px;
  object-fit: contain;
  background: var(--el-fill-color-light);
  padding: 4px;
  box-sizing: border-box;
}

.icon-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.icon-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.brand-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}

.preview-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.preview-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
