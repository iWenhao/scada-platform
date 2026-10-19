<template>
  <el-dialog
    :model-value="modelValue"
    width="900px"
    :before-close="handleBeforeClose"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="dlg-title-block">
        <div class="t">报警通知</div>
        <div class="sub">外发通道 · 触发节流 · 发送记录</div>
      </div>
    </template>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="通道配置" name="channels">
        <div class="notify-toolbar">
          <el-select v-model="newType" class="type-select" size="small">
            <el-option
              v-for="(label, key) in NOTIFY_TYPE_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
          <el-button type="primary" size="small" @click="addChannel">
            <el-icon><Plus /></el-icon>
            添加通道
          </el-button>
          <div class="spacer" />
          <span class="pill-bar">
            触发节流
            <el-input-number
              v-model="minIntervalSec"
              size="small"
              :min="0"
              :max="3600"
              :step="10"
              :controls="false"
              class="interval-input"
            />
            秒 · 同通道去重
          </span>
        </div>

        <el-table
          v-loading="loading"
          :data="channels"
          size="small"
          max-height="360"
          empty-text="尚未配置通知通道"
          :row-class-name="channelRowClass"
        >
          <el-table-column prop="name" label="名称" width="120" />
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <span class="tdot" :class="row.type" />{{ NOTIFY_TYPE_LABELS[row.type as NotifyChannelType] || row.type }}
            </template>
          </el-table-column>
          <el-table-column label="级别" width="120">
            <template #default="{ row }">
              <span v-for="l in row.levels" :key="l" class="chip" :class="l === 'critical' ? 'crit' : 'warn'">
                {{ l === 'critical' ? '报警' : '预警' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="触发时机" width="100">
            <template #default="{ row }"><span class="hint">{{ kindLabel(row.notifyOn) }}</span></template>
          </el-table-column>
          <el-table-column label="启用" width="70">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="操作" align="right">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="editChannel(row)">配置</el-button>
              <el-button size="small" text :loading="testingId === row.id" @click="handleTest(row)">测试</el-button>
              <el-button size="small" text type="danger" @click="removeChannel(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 通道编辑（子组件，deep 草稿由本组件持有；submit 回落成列表项） -->
        <NotifyChannelEditorDialog v-model="editVisible" :channel="editing" @submit="applyEdit" />
      </el-tab-pane>

      <el-tab-pane label="发送记录" name="log">
        <NotifyLogPanel ref="logPanel" />
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dlg-foot">
        <span v-if="dirty" class="dirty-pill">● 有未保存改动</span>
        <el-button @click="requestClose">关闭</el-button>
        <!-- 保存只作用于「通道配置」tab，记录 tab 下不显示，避免语义错位 -->
        <el-button
          v-if="activeTab === 'channels'"
          type="primary"
          :loading="saving"
          :disabled="!dirty"
          @click="handleSave"
        >
          保存配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import NotifyChannelEditorDialog from './NotifyChannelEditorDialog.vue'
import NotifyLogPanel from './NotifyLogPanel.vue'
import {
  loadNotifyConfig,
  saveNotifyConfig,
  testNotifyChannel,
  emptyChannel,
} from '@/notify/notifyClient'
import {
  NOTIFY_TYPE_LABELS,
  type NotifyChannel,
  type NotifyChannelType,
  type NotifyKind,
} from '@/types/notify'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const channels = ref<NotifyChannel[]>([])
const minIntervalSec = ref(60)
const newType = ref<NotifyChannelType>('webhook')
const saving = ref(false)
const loading = ref(false)
const testingId = ref('')
const activeTab = ref<'channels' | 'log'>('channels')
const logPanel = ref<InstanceType<typeof NotifyLogPanel> | null>(null)

const editVisible = ref(false)
const editing = ref<NotifyChannel | null>(null)
// 新增通道不再先塞进列表：编辑框取消即整体丢弃，避免残留一条空通道
const editingIsNew = ref(false)

// 脏状态：与「上次加载/保存后的快照」比对，覆盖开关直改内存却忘保存的情况
const loaded = ref(false)
const savedSnapshot = ref('')
function currentSnapshot() {
  return JSON.stringify({ channels: channels.value, minIntervalSec: minIntervalSec.value })
}
const dirty = computed(() => loaded.value && currentSnapshot() !== savedSnapshot.value)

function kindLabel(k?: NotifyKind[]) {
  if (!k || k.length === 0) return '—'
  if (k.includes('active') && k.includes('recover')) return '触发/恢复'
  return k.includes('active') ? '触发时' : '恢复时'
}

// 未启用的通道整行压暗，状态在列表层面就能看出来
function channelRowClass({ row }: { row: NotifyChannel }) {
  return row.enabled ? '' : 'row-off'
}

async function refresh() {
  loading.value = true
  try {
    const cfg = await loadNotifyConfig()
    channels.value = cfg.channels
    minIntervalSec.value = Math.round((cfg.minIntervalMs || 60000) / 1000)
    loaded.value = true
    savedSnapshot.value = currentSnapshot()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载通知配置失败')
  } finally {
    loading.value = false
  }
}

function loadLog() {
  void nextTick(() => logPanel.value?.load())
}

watch(activeTab, (t) => {
  if (t === 'log') loadLog()
})

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      void refresh()
      if (activeTab.value === 'log') loadLog()
    } else {
      // 外层关闭时嵌套的通道编辑框不会自己收起，须联动关掉
      editVisible.value = false
    }
  },
  // immediate 必须有：父组件用 `v-if` + `v-model` 挂载本组件，挂载时 modelValue 已经是 true，
  // 不会再来一次 false→true 变化。没有 immediate 时首次打开根本不拉配置，
  // 已存在的通道恒显示「尚未配置通知通道」，只有手动添加一条才看得见。
  { immediate: true },
)

function addChannel() {
  const base = emptyChannel(newType.value)
  editing.value = {
    ...base,
    id: `local_${Date.now()}`,
    config: { ...base.config },
  }
  editingIsNew.value = true
  editVisible.value = true
}

function editChannel(row: NotifyChannel) {
  editing.value = JSON.parse(JSON.stringify(row))
  editingIsNew.value = false
  editVisible.value = true
}

// 编辑子弹窗确认后回落：新增 push、已有按 id 原位替换
function applyEdit(ch: NotifyChannel) {
  if (editingIsNew.value) {
    channels.value.push(ch)
  } else {
    const idx = channels.value.findIndex((c) => c.id === ch.id)
    if (idx >= 0) channels.value[idx] = ch
  }
}

// 删除通道与删除用户同属破坏性操作，一律二次确认
async function removeChannel(row: NotifyChannel) {
  try {
    await ElMessageBox.confirm(`删除通知通道「${row.name}」？保存后该通道将不再外发报警。`, '删除通道', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const idx = channels.value.findIndex((c) => c.id === row.id)
  if (idx >= 0) channels.value.splice(idx, 1)
}

async function handleTest(row: NotifyChannel) {
  testingId.value = row.id
  try {
    // 通道对象内联传给服务端测试，不再先保存全量配置（旧实现点「测试」会静默落盘未保存改动）
    // 发送失败时 testNotifyChannel 抛错，服务端给的中文原因由下面的 catch 直接展示
    await testNotifyChannel(row)
    ElMessage.success(`「${row.name}」发送成功`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '测试失败')
  } finally {
    testingId.value = ''
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}

function tryClose(proceed: () => void) {
  if (!dirty.value) {
    proceed()
    return
  }
  ElMessageBox.confirm('通知配置有未保存的改动，关闭将丢弃这些改动。', '未保存的改动', {
    type: 'warning',
    confirmButtonText: '放弃并关闭',
    cancelButtonText: '留下继续编辑',
  })
    .then(proceed)
    .catch(() => {})
}

// X/遮罩/ESC 关闭走 before-close，footer 按钮走 requestClose，两条路径同一判据
function handleBeforeClose(done: () => void) {
  tryClose(done)
}

function requestClose() {
  tryClose(closeDialog)
}

async function handleSave() {
  saving.value = true
  try {
    const saved = await saveNotifyConfig({
      channels: channels.value,
      minIntervalMs: minIntervalSec.value * 1000,
    })
    channels.value = saved.channels
    savedSnapshot.value = currentSnapshot()
    ElMessage.success('通知配置已保存')
    closeDialog()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style src="./notify-config.scss" scoped lang="scss"></style>
