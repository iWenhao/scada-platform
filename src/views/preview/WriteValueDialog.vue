<template>
  <el-dialog
    v-model="state.visible"
    :title="`下发设定值 - ${state.elementName}`"
    width="460px"
    :close-on-click-modal="false"
  >
    <el-form label-width="90px" @submit.prevent>
      <el-form-item label="目标点位">
        <span class="mono">{{ state.deviceId }}.{{ state.variable }}</span>
      </el-form-item>

      <!-- 数值型：量程内输入 -->
      <el-form-item v-if="state.mode === 'number'" label="新值">
        <el-input-number
          v-model="numberValue"
          :controls="false"
          class="wide"
          placeholder="数值"
        />
        <div class="hint">
          当前值：{{ state.current ?? '-' }}{{ state.unit ? ` ${state.unit}` : '' }}
          <template v-if="state.min !== undefined || state.max !== undefined">
            ｜量程 {{ state.min ?? '-' }} ~ {{ state.max ?? '-' }}
          </template>
        </div>
      </el-form-item>

      <!-- 开关型 -->
      <el-form-item v-else-if="state.mode === 'switch'" label="新值">
        <el-switch v-model="boolValue" active-text="开" inactive-text="关" />
        <div class="hint">当前值：{{ state.current ?? '-' }}</div>
      </el-form-item>

      <!-- 字符串型 -->
      <el-form-item v-else label="新值">
        <el-input
          v-model="textValue"
          maxlength="120"
          show-word-limit
          placeholder="输入文本"
          @keyup.enter="state.onConfirm?.(collectValue())"
        />
        <div class="hint">当前值：{{ state.current ?? '-' }}</div>
      </el-form-item>

      <el-form-item v-if="state.description" label="点位说明">
        <span class="hint">{{ state.description }}</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="state.onCancel?.()">取消</el-button>
      <el-button type="primary" @click="state.onConfirm?.(collectValue())">下一步</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { writeDialogState as state } from './useWriteValue'

/**
 * 写值输入对话框：按点表 dataType 切换输入方式（数值/开关/文本）。
 * 状态与回调由 useWriteValue 提供（模块级单例），本组件只负责呈现与收集。
 */

const numberValue = ref<number | undefined>(undefined)
const boolValue = ref(false)
const textValue = ref('')

watch(
  () => state.visible,
  async (open) => {
    if (!open) return
    // 按当前值预填
    const cur = state.current
    const hasCurrent = cur !== undefined && cur !== '-'
    numberValue.value = state.mode === 'number' && hasCurrent ? Number(cur) : undefined
    boolValue.value = state.mode === 'switch' && cur === 'true'
    textValue.value = state.mode === 'text' && hasCurrent ? cur : ''
    await nextTick()
    const el = document.querySelector<HTMLInputElement>(
      '.el-dialog .el-input-number input, .el-dialog .el-input input',
    )
    el?.focus()
  },
)

function collectValue(): number | string | boolean {
  if (state.mode === 'switch') return boolValue.value
  if (state.mode === 'text') return textValue.value
  return numberValue.value ?? Number.NaN
}
</script>

<style scoped lang="scss">
.mono {
  font-family: monospace;
  color: var(--text-primary);
}

.wide {
  width: 100%;
}

.hint {
  font-size: 11px;
  color: var(--text-muted);
  width: 100%;
  line-height: 1.6;
}
</style>
