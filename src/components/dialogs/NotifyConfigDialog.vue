<template>
  <el-dialog
    :model-value="modelValue"
    title="报警通知"
    width="900px"
    @update:model-value="emit('update:modelValue', $event)"
  >
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
      <span class="hint">触发节流</span>
      <el-input-number
        v-model="minIntervalSec"
        size="small"
        :min="0"
        :max="3600"
        :step="10"
      />
      <span class="hint">秒内同通道不重复发送</span>
    </div>

    <el-table :data="channels" size="small" empty-text="尚未配置通知通道">
      <el-table-column prop="name" label="名称" width="120" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          {{ NOTIFY_TYPE_LABELS[row.type as NotifyChannelType] || row.type }}
        </template>
      </el-table-column>
      <el-table-column label="级别" width="120">
        <template #default="{ row }">
          <el-tag v-for="l in row.levels" :key="l" size="small" class="lvl">
            {{ l === 'critical' ? '报警' : '预警' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="70">
        <template #default="{ row }">
          <el-switch v-model="row.enabled" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="操作">
        <template #default="{ row, $index }">
          <el-button size="small" text type="primary" @click="editChannel(row)">配置</el-button>
          <el-button size="small" text @click="handleTest(row)">测试</el-button>
          <el-button size="small" text type="danger" @click="removeAt($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 通道编辑 -->
    <el-dialog
      v-model="editVisible"
      :title="editing ? `配置通道：${editing.name}` : '配置通道'"
      width="560px"
      append-to-body
    >
      <el-form v-if="editing" label-width="110px" class="ch-form">
        <el-form-item label="名称">
          <el-input v-model="editing.name" />
        </el-form-item>
        <el-form-item label="通知级别">
          <el-checkbox-group v-model="levelDraft">
            <el-checkbox value="critical">报警</el-checkbox>
            <el-checkbox value="warning">预警</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="触发时机">
          <el-checkbox-group v-model="kindDraft">
            <el-checkbox value="active">触发时</el-checkbox>
            <el-checkbox value="recover">恢复时</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- Webhook -->
        <template v-if="editing.type === 'webhook'">
          <el-form-item label="请求 URL">
            <el-input v-model="editing.config.url" placeholder="https://example.com/hook" />
          </el-form-item>
          <el-form-item label="方法">
            <el-select v-model="editing.config.method">
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
            </el-select>
          </el-form-item>
          <el-form-item label="请求头 JSON">
            <el-input v-model="editing.config.headers" type="textarea" :rows="2" placeholder='{"Authorization":"Bearer ..."}' />
          </el-form-item>
          <el-form-item label="Body 模板">
            <el-input
              v-model="editing.config.bodyTemplate"
              type="textarea"
              :rows="3"
              placeholder="留空则发送默认 JSON；可用 {{title}} {{message}} {{level}} {{time}}"
            />
          </el-form-item>
        </template>

        <!-- 企微 / 钉钉 -->
        <template v-if="editing.type === 'wecom' || editing.type === 'dingtalk'">
          <el-form-item label="机器人 Webhook">
            <el-input v-model="editing.config.webhookUrl" placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
          </el-form-item>
          <el-form-item v-if="editing.type === 'dingtalk'" label="加签 Secret">
            <el-input v-model="editing.config.secret" placeholder="SEC 开头；未开启加签可留空" />
          </el-form-item>
        </template>

        <!-- 邮件 -->
        <template v-if="editing.type === 'email'">
          <el-form-item label="SMTP 服务器">
            <el-input v-model="editing.config.smtpHost" placeholder="smtp.example.com" />
          </el-form-item>
          <el-form-item label="端口 / SSL">
            <el-input-number v-model="editing.config.smtpPort" :min="25" :max="65535" />
            <el-checkbox v-model="editing.config.smtpSecure" class="ml">SSL (465)</el-checkbox>
          </el-form-item>
          <el-form-item label="账号">
            <el-input v-model="editing.config.smtpUser" />
          </el-form-item>
          <el-form-item label="口令/授权码">
            <el-input v-model="editing.config.smtpPass" type="password" show-password />
          </el-form-item>
          <el-form-item label="发件人">
            <el-input v-model="editing.config.from" placeholder="默认同账号" />
          </el-form-item>
          <el-form-item label="收件人">
            <el-input v-model="editing.config.to" placeholder="a@x.com,b@x.com" />
          </el-form-item>
          <el-form-item label="标题模板">
            <el-input v-model="editing.config.subjectTemplate" placeholder="【SCADA】{{level}} {{title}}" />
          </el-form-item>
        </template>

        <!-- 短信 -->
        <template v-if="editing.type === 'sms'">
          <el-form-item label="网关 URL">
            <el-input v-model="editing.config.url" placeholder="https://sms.example.com/send" />
          </el-form-item>
          <el-form-item label="方法">
            <el-select v-model="editing.config.method">
              <el-option label="POST" value="POST" />
              <el-option label="GET" value="GET" />
            </el-select>
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="editing.config.phones" placeholder="13800000000,13900000000" />
          </el-form-item>
          <el-form-item label="请求头 JSON">
            <el-input v-model="editing.config.headers" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="Body 模板">
            <el-input
              v-model="editing.config.bodyTemplate"
              type="textarea"
              :rows="3"
              placeholder='默认 {"phones":"{{phones}}","content":"{{message}}"}'
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="commitEdit">确定</el-button>
      </template>
      </el-dialog>
      </el-tab-pane>

      <el-tab-pane label="发送记录" name="log">
        <div class="notify-toolbar">
          <el-button size="small" @click="refreshLog">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button size="small" type="danger" plain @click="handleClearLog">清空记录</el-button>
          <div class="spacer" />
          <span class="hint">仅保留最近 500 条</span>
        </div>
        <el-table :data="logs" size="small" max-height="360" empty-text="暂无发送记录">
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatTime(row.t) }}</template>
          </el-table-column>
          <el-table-column label="类型" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.kind === 'recover' ? 'info' : 'warning'">
                {{ row.kind === 'recover' ? '恢复' : row.note || '触发' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="channelName" label="通道" width="110" />
          <el-table-column label="级别" width="80">
            <template #default="{ row }">
              {{ row.level === 'critical' ? '报警' : '预警' }}
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
          <el-table-column label="结果" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.ok ? 'success' : 'danger'">
                {{ row.ok ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="error" label="说明" min-width="120" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
    </template>
    </el-dialog>
  </template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  loadNotifyConfig,
  saveNotifyConfig,
  testNotifyChannel,
  emptyChannel,
  loadNotifyLog,
  clearNotifyLog,
  type NotifyLogEntry,
} from '@/notify/notifyClient'
import {
  NOTIFY_TYPE_LABELS,
  type NotifyChannel,
  type NotifyChannelType,
  type NotifyKind,
  type NotifyLevel,
} from '@/types/notify'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const channels = ref<NotifyChannel[]>([])
const minIntervalSec = ref(60)
const newType = ref<NotifyChannelType>('webhook')
const saving = ref(false)
const activeTab = ref<'channels' | 'log'>('channels')
const logs = ref<NotifyLogEntry[]>([])

const editVisible = ref(false)
const editing = ref<NotifyChannel | null>(null)
const levelDraft = ref<NotifyLevel[]>([])
const kindDraft = ref<NotifyKind[]>([])

function formatTime(t: number) {
  return new Date(t).toLocaleString('zh-CN')
}

async function refreshLog() {
  try {
    logs.value = await loadNotifyLog(200)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载发送记录失败')
  }
}

async function handleClearLog() {
  try {
    await clearNotifyLog()
    logs.value = []
    ElMessage.success('已清空')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '清空失败')
  }
}

async function refresh() {
  try {
    const cfg = await loadNotifyConfig()
    channels.value = cfg.channels
    minIntervalSec.value = Math.round((cfg.minIntervalMs || 60000) / 1000)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载通知配置失败')
  }
}

watch(activeTab, (t) => {
  if (t === 'log') void refreshLog()
})

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      void refresh()
      if (activeTab.value === 'log') void refreshLog()
    }
  },
)

function addChannel() {
  const base = emptyChannel(newType.value)
  const ch: NotifyChannel = {
    ...base,
    id: `local_${Date.now()}`,
    config: { ...base.config },
  }
  channels.value.push(ch)
  editChannel(ch)
}

function editChannel(row: NotifyChannel) {
  editing.value = JSON.parse(JSON.stringify(row))
  levelDraft.value = [...(row.levels || ['critical', 'warning'])]
  kindDraft.value = [...(row.notifyOn || ['active', 'recover'])]
  editVisible.value = true
}

function commitEdit() {
  if (!editing.value) return
  editing.value.levels = [...levelDraft.value]
  editing.value.notifyOn = [...kindDraft.value]
  const idx = channels.value.findIndex(c => c.id === editing.value!.id)
  if (idx >= 0) channels.value[idx] = JSON.parse(JSON.stringify(editing.value))
  editVisible.value = false
}

function removeAt(index: number) {
  channels.value.splice(index, 1)
}

async function handleTest(row: NotifyChannel) {
  try {
    // 先保存临时 id 的通道，便于服务端测试
    const cfg = await saveNotifyConfig({
      channels: channels.value,
      minIntervalMs: minIntervalSec.value * 1000,
    })
    const target = cfg.channels.find(c => c.name === row.name && c.type === row.type) || row
    const result = await testNotifyChannel(target.id)
    if (result.ok) ElMessage.success(`「${row.name}」发送成功`)
    else ElMessage.error(result.error || '发送失败')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '测试失败')
  }
}

async function handleSave() {
  saving.value = true
  try {
    const saved = await saveNotifyConfig({
      channels: channels.value,
      minIntervalMs: minIntervalSec.value * 1000,
    })
    channels.value = saved.channels
    ElMessage.success('通知配置已保存')
    emit('update:modelValue', false)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.notify-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .type-select {
    width: 140px;
  }

  .spacer {
    flex: 1;
  }

  .hint {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.lvl {
  margin-right: 4px;
}

.ml {
  margin-left: 12px;
}

.ch-form {
  max-height: 55vh;
  overflow-y: auto;
}
</style>
