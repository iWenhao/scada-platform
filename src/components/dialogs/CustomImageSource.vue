<template>
  <div class="image-source">
    <el-upload
      class="image-drop"
      drag
      :auto-upload="false"
      :show-file-list="false"
      accept="image/png,image/jpeg,image/webp"
      :on-change="onFileChange"
    >
      <div class="drop-inner">
        <el-icon :size="22"><UploadFilled /></el-icon>
        <span>拖入或点击选择设备图片</span>
      </div>
    </el-upload>

    <div class="url-row">
      <el-input
        v-model="urlInput"
        size="small"
        placeholder="或粘贴图片 URL，例如 https://…/pump.png"
        @keyup.enter="importUrl"
      />
      <el-button size="small" :loading="busy" @click="importUrl">导入</el-button>
    </div>

    <p class="tip">
      支持 PNG / JPG / WebP，单张不超过 10MB；也可以直接 <b>Ctrl+V</b> 粘贴剪贴板里的截图。
      纯色/透明背景会自动裁掉并去底，背景杂乱的现场照片会保留整张图。
    </p>

    <div v-if="busy" class="image-busy">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在生成预览…</span>
    </div>

    <div v-if="results.length" class="pick-list">
      <div
        v-for="item in results"
        :key="item.strategy.id"
        class="pick-card"
        :class="{
          active: item.strategy.id === selectedId,
          blocked: isBlocked(item),
        }"
        role="button"
        tabindex="0"
        @click="choose(item)"
        @keyup.enter="choose(item)"
      >
        <div class="pick-preview" v-html="item.svg"></div>
        <div class="pick-title">
          <strong>{{ item.strategy.label }}</strong>
          <span>{{ formatSize(item.bytes) }}</span>
        </div>
        <p class="pick-hint">{{ item.strategy.hint }}</p>
        <span class="pick-badge" :class="item.strategy.recolorable ? 'ok' : 'plain'">
          {{ item.strategy.recolorable ? '可随状态变色' : '保持原图' }}
        </span>
        <span v-if="item.strategy.id === selectedId" class="pick-check">
          <el-icon><Check /></el-icon>
        </span>
      </div>
    </div>

    <p v-if="requireRecolor && results.length" class="tip">
      当前是<b>有状态</b>组件：只有「矢量描摹」能随状态换色，原图内嵌方案已禁用。
    </p>
    <p v-for="(note, i) in notes" :key="`n${i}`" class="tip">{{ note }}</p>
    <ul v-if="failures.length" class="error-list">
      <li v-for="(failure, i) in failures" :key="`f${i}`">{{ failure.label }}：{{ failure.message }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import {
  convertImageToSvg,
  fetchImageBlob,
  normalizeImageUrl,
  validateImageUpload,
  type ImageConversionFailure,
  type ImageConversionItem,
  type ImageConversionOutcome,
} from '@/industrial/imageVectorize'

const props = withDefaults(
  defineProps<{
    /** 对话框是否打开：关闭时清掉上次的预览，避免下次打开看到过期结果 */
    active?: boolean
    /** 有状态组件：只能选可随 currentColor 变色的方案 */
    requireRecolor?: boolean
  }>(),
  { active: false, requireRecolor: false },
)

const emit = defineEmits<{ select: [svg: string] }>()

const busy = ref(false)
const results = ref<ImageConversionItem[]>([])
const failures = ref<ImageConversionFailure[]>([])
const notes = ref<string[]>([])
const selectedId = ref('')
const urlInput = ref('')

/** 取消/关闭对话框时让在途转换的结果失效，避免晚到的结果覆盖新一轮状态 */
let runToken = 0

function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

function isBlocked(item: ImageConversionItem): boolean {
  return props.requireRecolor && !item.strategy.recolorable
}

function applySelection(id: string): void {
  const hit = results.value.find((item) => item.strategy.id === id)
  if (!hit) return
  selectedId.value = id
  emit('select', hit.svg)
}

function choose(item: ImageConversionItem): void {
  if (isBlocked(item)) {
    ElMessage.warning('有状态组件需要可随状态变色的图标，请选「矢量描摹」')
    return
  }
  applySelection(item.strategy.id)
}

async function run(
  task: () => Promise<ImageConversionOutcome>,
): Promise<void> {
  if (busy.value) return
  const token = ++runToken
  busy.value = true
  try {
    const outcome = await task()
    if (token !== runToken) return
    results.value = outcome.results
    failures.value = outcome.failures
    notes.value = outcome.notes
    if (!outcome.results.length) ElMessage.error('没能生成可用图标，请查看下方原因')
  } catch (error) {
    if (token !== runToken) return
    results.value = []
    failures.value = []
    notes.value = []
    selectedId.value = ''
    ElMessage.error(error instanceof Error ? error.message : '图片转换失败')
  } finally {
    if (token === runToken) busy.value = false
  }
}

async function acceptFile(file: File): Promise<void> {
  const invalid = validateImageUpload(file)
  if (invalid) {
    ElMessage.error(invalid)
    return
  }
  await run(() => convertImageToSvg(file))
}

function onFileChange(file: UploadFile): void {
  if (file.raw) void acceptFile(file.raw)
}

async function importUrl(): Promise<void> {
  if (!normalizeImageUrl(urlInput.value)) {
    ElMessage.error('请输入 http(s) 图片链接')
    return
  }
  await run(async () => {
    const blob = await fetchImageBlob(urlInput.value)
    return convertImageToSvg(blob)
  })
}

// 新结果到达时自动选一个合法方案：有状态组件优先可变色方案，其余优先原图内嵌
watch(results, (list) => {
  if (!list.length) {
    selectedId.value = ''
    return
  }
  const preferred =
    list.find((item) => !isBlocked(item)) ?? list[0]
  applySelection(preferred.strategy.id)
})

// 用户在已有结果后切到「有状态」，自动从原图内嵌切到矢量描摹
watch(
  () => props.requireRecolor,
  (need) => {
    if (!need) return
    const current = results.value.find((item) => item.strategy.id === selectedId.value)
    if (current && !current.strategy.recolorable) {
      const alt = results.value.find((item) => item.strategy.recolorable)
      if (alt) applySelection(alt.strategy.id)
    }
  },
)

watch(
  () => props.active,
  (open) => {
    if (open) return
    runToken++
    busy.value = false
    results.value = []
    failures.value = []
    notes.value = []
    selectedId.value = ''
  },
)

defineExpose({ acceptFile })
</script>

<style src="./custom-component.scss" scoped lang="scss"></style>
<style scoped lang="scss">
.image-source {
  width: 100%;
}

.image-drop {
  :deep(.el-upload) {
    width: 100%;
  }

  :deep(.el-upload-dragger) {
    padding: 14px 12px;
    background: var(--bg-primary);
  }
}

.drop-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.url-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.image-busy {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.pick-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.pick-card {
  position: relative;
  padding: 10px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: var(--el-color-primary);
  }

  &.active {
    border-color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, var(--bg-primary));
  }

  &.blocked {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.pick-preview {
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8fe6d3;

  :deep(svg) {
    width: 88px;
    height: 88px;
  }
}

.pick-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-primary);

  span {
    font-size: 12px;
    color: var(--text-tertiary);
  }
}

.pick-hint {
  margin: 4px 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-tertiary);
}

.pick-badge {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;

  &.ok {
    color: var(--el-color-success);
    background: color-mix(in srgb, var(--el-color-success) 14%, transparent);
  }

  &.plain {
    color: var(--text-tertiary);
    background: color-mix(in srgb, var(--text-tertiary) 14%, transparent);
  }
}

.pick-check {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--el-color-primary);
  font-size: 14px;
}
</style>
