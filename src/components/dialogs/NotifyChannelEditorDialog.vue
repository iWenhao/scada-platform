<template>
  <el-dialog
    :model-value="modelValue"
    :title="draft ? `配置通道：${draft.name}` : '配置通道'"
    width="560px"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form v-if="draft" label-width="110px" class="ch-form">
      <el-form-item label="名称">
        <el-input v-model="draft.name" />
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
      <template v-if="draft.type === 'webhook'">
        <el-form-item label="请求 URL">
          <el-input v-model="draft.config.url" placeholder="https://example.com/hook" />
        </el-form-item>
        <el-form-item label="方法">
          <el-select v-model="draft.config.method">
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
          </el-select>
        </el-form-item>
        <el-form-item label="请求头 JSON">
          <el-input v-model="draft.config.headers" type="textarea" :rows="2" placeholder="{&quot;Authorization&quot;:&quot;Bearer ...&quot;}" />
        </el-form-item>
        <el-form-item label="Body 模板">
          <el-input
            v-model="draft.config.bodyTemplate"
            type="textarea"
            :rows="3"
            placeholder="留空则发送默认 JSON；可用 {{title}} {{message}} {{level}} {{time}}"
          />
        </el-form-item>
      </template>

      <!-- 企微 / 钉钉 -->
      <template v-if="draft.type === 'wecom' || draft.type === 'dingtalk'">
        <el-form-item label="机器人 Webhook">
          <el-input v-model="draft.config.webhookUrl" placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
        </el-form-item>
        <el-form-item v-if="draft.type === 'dingtalk'" label="加签 Secret">
          <el-input v-model="draft.config.secret" placeholder="SEC 开头；未开启加签可留空" />
        </el-form-item>
      </template>

      <!-- 邮件 -->
      <template v-if="draft.type === 'email'">
        <el-form-item label="SMTP 服务器">
          <el-input v-model="draft.config.smtpHost" placeholder="smtp.example.com" />
        </el-form-item>
        <el-form-item label="端口 / SSL">
          <el-input-number v-model="draft.config.smtpPort" :min="25" :max="65535" />
          <el-checkbox v-model="draft.config.smtpSecure" class="ml">SSL (465)</el-checkbox>
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="draft.config.smtpUser" />
        </el-form-item>
        <el-form-item label="口令/授权码">
          <el-input v-model="draft.config.smtpPass" type="password" show-password />
        </el-form-item>
        <el-form-item label="发件人">
          <el-input v-model="draft.config.from" placeholder="默认同账号" />
        </el-form-item>
        <el-form-item label="收件人">
          <el-input v-model="draft.config.to" placeholder="a@x.com,b@x.com" />
        </el-form-item>
        <el-form-item label="标题模板">
          <el-input v-model="draft.config.subjectTemplate" placeholder="【SCADA】{{level}} {{title}}" />
        </el-form-item>
      </template>

      <!-- 短信 -->
      <template v-if="draft.type === 'sms'">
        <el-form-item label="网关 URL">
          <el-input v-model="draft.config.url" placeholder="https://sms.example.com/send" />
        </el-form-item>
        <el-form-item label="方法">
          <el-select v-model="draft.config.method">
            <el-option label="POST" value="POST" />
            <el-option label="GET" value="GET" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="draft.config.phones" placeholder="13800000000,13900000000" />
        </el-form-item>
        <el-form-item label="请求头 JSON">
          <el-input v-model="draft.config.headers" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="Body 模板">
          <el-input
            v-model="draft.config.bodyTemplate"
            type="textarea"
            :rows="3"
            placeholder="默认 {&quot;phones&quot;:&quot;{{phones}}&quot;,&quot;content&quot;:&quot;{{message}}&quot;}"
          />
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="handleOk">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// 通道编辑子弹窗：从 NotifyConfigDialog 拆出（主文件超行数阈值，按「对话框按区块拆子组件」约定）。
// 父组件传入的 channel 已是深拷贝草稿；本组件再拷一次作本地 draft，
// 确定时以 submit 把成品通道交回父组件落列表，取消则整体丢弃。
import { ref, watch } from 'vue'
import type { NotifyChannel, NotifyKind, NotifyLevel } from '@/types/notify'

const props = defineProps<{ modelValue: boolean; channel: NotifyChannel | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [channel: NotifyChannel]
}>()

const draft = ref<NotifyChannel | null>(null)
const levelDraft = ref<NotifyLevel[]>([])
const kindDraft = ref<NotifyKind[]>([])

// 每次打开都从父草稿重新取底，避免上次未提交的字段串到新通道
watch(
  () => props.modelValue,
  (v) => {
    if (!v || !props.channel) return
    draft.value = JSON.parse(JSON.stringify(props.channel))
    levelDraft.value = [...(props.channel.levels || ['critical', 'warning'])]
    kindDraft.value = [...(props.channel.notifyOn || ['active', 'recover'])]
  },
)

function handleOk() {
  if (!draft.value) return
  const final: NotifyChannel = JSON.parse(JSON.stringify(draft.value))
  final.levels = [...levelDraft.value]
  final.notifyOn = [...kindDraft.value]
  emit('submit', final)
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss" src="./notify-config.scss"></style>
