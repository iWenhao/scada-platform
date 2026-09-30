<template>
  <el-dialog
    v-model="visible"
    title="数据源配置"
    width="640px"
    :close-on-click-modal="false"
  >
    <div class="section">
      <div class="section-title">连接类型</div>
      <div class="type-grid">
        <button
          v-for="opt in typeOptions"
          :key="opt.value"
          type="button"
          class="type-card"
          :class="{ active: form.type === opt.value }"
          @click="form.type = opt.value"
        >
          <div class="type-name">{{ opt.label }}</div>
          <div class="type-desc">{{ opt.desc }}</div>
        </button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">基础信息</div>
      <el-form :model="form" label-width="100px" label-position="left">
        <el-form-item label="数据源名称">
          <el-input v-model="form.name" placeholder="请输入数据源名称" />
        </el-form-item>
      </el-form>
    </div>

    <div class="section">
      <div class="section-title">连接参数</div>
      <el-form :model="form" label-width="100px" label-position="left">
        <el-form-item v-if="form.type === 'websocket'" label="服务地址">
          <el-input v-model="form.url" placeholder="ws://localhost:8080/realtime" />
        </el-form-item>

        <template v-if="form.type === 'http'">
          <el-form-item label="请求地址">
            <el-input v-model="form.url" placeholder="http://localhost:3001/api/data" />
          </el-form-item>
          <el-form-item label="轮询间隔">
            <el-input-number v-model="form.interval" :min="1000" :max="60000" :step="1000" />
            <span class="unit">毫秒</span>
          </el-form-item>
        </template>

        <template v-if="form.type === 'opcua'">
          <el-form-item label="网关地址">
            <el-input v-model="form.url" placeholder="ws://localhost:8081/opcua-gateway" />
          </el-form-item>
          <el-form-item label="订阅节点">
            <el-input
              v-model="nodeList"
              type="textarea"
              :rows="3"
              placeholder="每行一个 NodeId，如 ns=2;s=motor_1.speed"
            />
            <div class="hint">NodeId 按「设备.变量」映射到组件绑定</div>
          </el-form-item>
          <el-form-item label="采样间隔">
            <el-input-number v-model="form.interval" :min="500" :max="60000" :step="500" />
            <span class="unit">毫秒</span>
          </el-form-item>
        </template>

        <template v-if="form.type === 'mqtt'">
          <el-form-item label="Broker 地址">
            <el-input v-model="form.url" placeholder="ws://localhost:9001" />
            <div class="hint">浏览器经 WebSocket 直连，无需网关</div>
          </el-form-item>
          <el-form-item label="订阅过滤器">
            <el-input v-model="topicFilter" placeholder="scada/#" />
            <div class="hint">设备 ID = 主题去掉前缀</div>
          </el-form-item>
          <el-form-item label="主题前缀">
            <el-input v-model="topicPrefix" placeholder="如 scada/" />
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="mqttUsername" placeholder="可选" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="mqttPassword" type="password" show-password placeholder="可选" />
          </el-form-item>
        </template>

        <el-form-item v-if="form.type === 'mock'" label="更新间隔">
          <el-input-number v-model="mockInterval" :min="500" :max="10000" :step="500" />
          <span class="unit">毫秒</span>
        </el-form-item>

        <el-form-item
          v-if="form.type === 'websocket' || form.type === 'opcua' || form.type === 'mqtt'"
          label="自动重连"
        >
          <el-switch v-model="autoReconnect" />
          <el-input-number
            v-if="autoReconnect"
            v-model="reconnectInterval"
            :min="1000"
            :max="30000"
            :step="1000"
            size="small"
            class="inline-num"
          />
          <span v-if="autoReconnect" class="hint">毫秒</span>
        </el-form-item>
      </el-form>
    </div>

    <div class="section">
      <div class="section-title">运行状态</div>
      <div class="status-row">
        <el-tag :type="statusType" size="small">{{ statusText }}</el-tag>
        <span class="hint">{{ liveDevices.length }} 台设备在线</span>
      </div>
      <div
        v-if="deviceStore.connectionStatus === 'connected' && liveDevices.length"
        class="live-data"
      >
        <div v-for="dev in liveDevices" :key="dev.id" class="live-device">
          <div class="live-device-name">{{ dev.id }}</div>
          <div v-for="v in dev.vars" :key="v.name" class="live-var">
            <span class="live-var-name">{{ v.name }}</span>
            <span class="live-var-value">{{ v.value }}</span>
          </div>
        </div>
      </div>
      <div v-else class="hint">连接后显示设备实时数据</div>
    </div>

    <template #footer>
      <el-button @click="handleTest">测试连接</el-button>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { useProjectStore } from '@/stores/projectStore'
import { ElMessage } from 'element-plus'
import type { DataSourceConfig, DataSourceType } from '@/datasource/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const deviceStore = useDeviceStore()
const projectStore = useProjectStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const typeOptions = [
  { value: 'mock' as DataSourceType, label: '模拟数据', desc: '内置设备，开箱即用' },
  { value: 'websocket' as DataSourceType, label: 'WebSocket', desc: '实时推送' },
  { value: 'http' as DataSourceType, label: 'HTTP 轮询', desc: '定时拉取 JSON' },
  { value: 'opcua' as DataSourceType, label: 'OPC UA', desc: '经 WebSocket 网关' },
  { value: 'mqtt' as DataSourceType, label: 'MQTT', desc: 'Broker over WS' },
]

const form = reactive({
  type: 'mock' as DataSourceType,
  name: 'default',
  url: '',
  interval: 5000,
})

const autoReconnect = ref(true)
const reconnectInterval = ref(5000)
const mockInterval = ref(1000)
const topicFilter = ref('#')
const topicPrefix = ref('')
const mqttUsername = ref('')
const mqttPassword = ref('')
const nodeList = ref('')

const liveDevices = computed(() => {
  const data = deviceStore.deviceData
  return Object.keys(data)
    .sort()
    .map(id => ({
      id,
      vars: Object.entries(data[id]).map(([name, value]) => ({
        name,
        value: typeof value === 'number' ? String(Math.round(value * 10) / 10) : String(value),
      })),
    }))
})

const statusType = computed(() => {
  switch (deviceStore.connectionStatus) {
    case 'connected': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
})

const statusText = computed(() => {
  switch (deviceStore.connectionStatus) {
    case 'connected': return '已连接'
    case 'error': return '连接错误'
    default: return '未连接'
  }
})

// 打开对话框时用工程中已保存的配置回填
watch(
  () => props.modelValue,
  val => {
    if (!val) return
    const cfg = projectStore.dataSourceConfig
    form.type = cfg.type
    form.name = cfg.name || 'default'
    form.url = cfg.url || ''
    form.interval = cfg.interval || 5000
    autoReconnect.value = cfg.reconnect ?? true
    reconnectInterval.value = cfg.reconnectInterval || 5000
    mockInterval.value = cfg.type === 'mock' ? cfg.interval || 1000 : 1000
    const nodes = (cfg.options?.nodes as string[] | undefined) || []
    nodeList.value = nodes.join('\n')
    topicFilter.value = (cfg.options?.topicFilter as string) || '#'
    topicPrefix.value = (cfg.options?.topicPrefix as string) || ''
    mqttUsername.value = (cfg.options?.username as string) || ''
    mqttPassword.value = (cfg.options?.password as string) || ''
  },
)

function parseNodeList(): string[] {
  return nodeList.value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function buildConfig(): DataSourceConfig {
  return {
    type: form.type,
    name: form.name,
    url: form.url || undefined,
    interval:
      form.type === 'http'
        ? form.interval
        : form.type === 'mock'
          ? mockInterval.value
          : form.type === 'opcua'
            ? form.interval
            : undefined,
    reconnect:
      form.type === 'websocket' || form.type === 'opcua' || form.type === 'mqtt'
        ? autoReconnect.value
        : false,
    reconnectInterval: reconnectInterval.value,
    options:
      form.type === 'opcua'
        ? { nodes: parseNodeList() }
        : form.type === 'mqtt'
          ? {
              topicFilter: topicFilter.value.trim() || '#',
              topicPrefix: topicPrefix.value,
              ...(mqttUsername.value ? { username: mqttUsername.value } : {}),
              ...(mqttPassword.value ? { password: mqttPassword.value } : {}),
            }
          : undefined,
  }
}

async function handleTest() {
  try {
    await deviceStore.initDataSource(buildConfig())
    if (deviceStore.connectionStatus === 'connected') {
      ElMessage.success('连接成功')
    } else {
      ElMessage.warning('连接未完成，请检查地址与网络')
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    ElMessage.error(`连接测试失败: ${error instanceof Error ? error.message : error}`)
  }
}

function handleConfirm() {
  const config = buildConfig()
  projectStore.setDataSource(config)
  deviceStore.initDataSource(config)
  visible.value = false
}
</script>

<style scoped lang="scss">
.section {
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  background: var(--bg-primary);
}

.section-title {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  font-weight: 600;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.type-card {
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--border-active);
  }

  &.active {
    border-color: var(--accent-primary);
    background: rgba(0, 212, 170, 0.1);
    box-shadow: 0 0 0 1px rgba(0, 212, 170, 0.35);
  }
}

.type-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.type-desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.inline-num {
  width: 110px;
  margin-left: 8px;
}

.unit {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

.hint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.live-data {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 8px;
  background: var(--bg-secondary);
}

.live-device {
  margin-bottom: 8px;
}

.live-device-name {
  font-weight: 600;
  color: var(--accent-primary);
  font-size: 12px;
  margin-bottom: 4px;
}

.live-var {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 2px 0;
}

.live-var-name {
  color: var(--text-secondary);
}

.live-var-value {
  color: var(--text-primary);
  font-family: monospace;
}
</style>
