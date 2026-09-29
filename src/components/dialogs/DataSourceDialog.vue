<template>
  <el-dialog
    v-model="visible"
    title="数据源配置"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="数据源类型">
        <el-radio-group v-model="form.type">
          <el-radio value="mock">模拟数据</el-radio>
          <el-radio value="websocket">WebSocket</el-radio>
          <el-radio value="http">HTTP轮询</el-radio>
          <el-radio value="opcua">OPC UA</el-radio>
          <el-radio value="mqtt">MQTT</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item label="数据源名称">
        <el-input v-model="form.name" placeholder="请输入数据源名称" />
      </el-form-item>
      
      <!-- WebSocket配置 -->
      <template v-if="form.type === 'websocket'">
        <el-form-item label="服务地址">
          <el-input
            v-model="form.url"
            placeholder="ws://localhost:8080/realtime"
          />
        </el-form-item>
        
        <el-form-item label="自动重连">
          <el-switch v-model="autoReconnect" />
        </el-form-item>
        
        <el-form-item v-if="autoReconnect" label="重连间隔">
          <el-input-number
            v-model="reconnectInterval"
            :min="1000"
            :max="30000"
            :step="1000"
          />
          <span class="unit">毫秒</span>
        </el-form-item>
      </template>
      
      <!-- HTTP轮询配置 -->
      <template v-if="form.type === 'http'">
        <el-form-item label="请求地址">
          <el-input
            v-model="form.url"
            placeholder="http://localhost:3001/api/data"
          />
        </el-form-item>

        <el-form-item label="轮询间隔">
          <el-input-number
            v-model="form.interval"
            :min="1000"
            :max="60000"
            :step="1000"
          />
          <span class="unit">毫秒</span>
        </el-form-item>
      </template>

      <!-- OPC UA 网关配置 -->
      <template v-if="form.type === 'opcua'">
        <el-form-item label="网关地址">
          <el-input
            v-model="form.url"
            placeholder="ws://localhost:8081/opcua-gateway"
          />
        </el-form-item>

        <el-form-item label="订阅节点">
          <el-input
            v-model="nodeList"
            type="textarea"
            :rows="4"
            placeholder="每行一个 NodeId，例如:&#10;ns=2;s=motor_1.speed&#10;ns=2;s=boiler_1.pressure"
          />
          <span class="hint">NodeId 按"设备.变量"映射到组件绑定</span>
        </el-form-item>

        <el-form-item label="采样间隔">
          <el-input-number
            v-model="form.interval"
            :min="500"
            :max="60000"
            :step="500"
          />
          <span class="unit">毫秒</span>
        </el-form-item>

        <el-form-item label="自动重连">
          <el-switch v-model="autoReconnect" />
        </el-form-item>
      </template>
      
      <!-- MQTT 配置 -->
      <template v-if="form.type === 'mqtt'">
        <el-form-item label="Broker 地址">
          <el-input
            v-model="form.url"
            placeholder="ws://localhost:9001"
          />
          <span class="hint">浏览器经 WebSocket 直连，无需网关</span>
        </el-form-item>

        <el-form-item label="订阅过滤器">
          <el-input v-model="topicFilter" placeholder="#" />
          <span class="hint">MQTT 通配符，如 scada/#；设备 ID = 主题去掉前缀</span>
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

        <el-form-item label="自动重连">
          <el-switch v-model="autoReconnect" />
        </el-form-item>
      </template>

      <!-- 模拟数据配置 -->
      <template v-if="form.type === 'mock'">
        <el-form-item label="更新间隔">
          <el-input-number
            v-model="mockInterval"
            :min="500"
            :max="10000"
            :step="500"
          />
          <span class="unit">毫秒</span>
        </el-form-item>
      </template>
      
      <!-- 连接状态 -->
      <el-form-item label="连接状态">
        <el-tag :type="statusType">
          {{ statusText }}
        </el-tag>
      </el-form-item>

      <!-- 实时数据 -->
      <el-form-item label="实时数据">
        <div v-if="deviceStore.connectionStatus === 'connected' && liveDevices.length" class="live-data">
          <div v-for="dev in liveDevices" :key="dev.id" class="live-device">
            <div class="live-device-name">{{ dev.id }}</div>
            <div v-for="v in dev.vars" :key="v.name" class="live-var">
              <span class="live-var-name">{{ v.name }}</span>
              <span class="live-var-value">{{ v.value }}</span>
            </div>
          </div>
        </div>
        <el-tag v-else size="small" type="info">连接后显示设备实时数据</el-tag>
      </el-form-item>
    </el-form>
    
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

// 实时数据快照（随 Pinia 状态自动刷新）
const liveDevices = computed(() => {
  const data = deviceStore.deviceData
  return Object.keys(data).sort().map(id => ({
    id,
    vars: Object.entries(data[id]).map(([name, value]) => ({
      name,
      value: typeof value === 'number' ? String(Math.round(value * 10) / 10) : String(value),
    })),
  }))
})
const nodeList = ref('')

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

// 打开对话框时用工程中已保存的配置回填，而不是清空表单重新填
watch(() => props.modelValue, (val) => {
  if (!val) return
  const cfg = projectStore.dataSourceConfig
  form.type = cfg.type
  form.name = cfg.name || 'default'
  form.url = cfg.url || ''
  form.interval = cfg.interval || 5000
  autoReconnect.value = cfg.reconnect ?? true
  reconnectInterval.value = cfg.reconnectInterval || 5000
  mockInterval.value = cfg.type === 'mock' ? (cfg.interval || 1000) : 1000
  const nodes = (cfg.options?.nodes as string[] | undefined) || []
  nodeList.value = nodes.join('\n')
  topicFilter.value = (cfg.options?.topicFilter as string) || '#'
  topicPrefix.value = (cfg.options?.topicPrefix as string) || ''
  mqttUsername.value = (cfg.options?.username as string) || ''
  mqttPassword.value = (cfg.options?.password as string) || ''
})

// 组装当前表单对应的数据源配置
function buildConfig(): DataSourceConfig {
  return {
    type: form.type,
    name: form.name,
    url: form.url || undefined,
    interval:
      form.type === 'http' ? form.interval
      : form.type === 'mock' ? mockInterval.value
      : form.type === 'opcua' ? form.interval
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

// 解析节点列表输入（每行一个 NodeId）
function parseNodeList(): string[] {
  return nodeList.value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
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
  // 先落盘到工程，否则保存出去的 JSON 里仍然没有数据源配置
  projectStore.setDataSource(config)
  deviceStore.initDataSource(config)
  visible.value = false
}
</script>

<style scoped lang="scss">
.unit {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.hint {
  width: 100%;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

.live-data {
  width: 100%;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  padding: 8px 10px;
  background: var(--bg-primary);
}

.live-device {
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.live-device-name {
  font-weight: 600;
  color: var(--accent-primary);
  font-size: 13px;
  margin-bottom: 2px;
}

.live-var {
  display: flex;
  justify-content: space-between;
  padding: 1px 8px;
  font-size: 12px;

  .live-var-name {
    color: var(--text-secondary);
  }

  .live-var-value {
    color: var(--text-primary);
    font-family: monospace;
  }
}

:deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
