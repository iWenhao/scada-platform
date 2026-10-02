/**
 * 数据源对话框的表单状态与「配置 ↔ 表单」双向映射。
 * 从 DataSourceDialog 拆出：对话框只管布局与提交动作，字段映射集中在这里，
 * 新增数据源类型时只改这个文件。
 */
import { reactive, ref } from 'vue'
import type { DataSourceConfig, DataSourceType } from '@/datasource/types'

export function useDataSourceForm() {
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

  /** 打开对话框时用工程中已保存的配置回填表单 */
  function applyConfig(cfg: DataSourceConfig) {
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
  }

  function parseNodeList(): string[] {
    return nodeList.value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  }

  /** 把表单组装成数据源配置；与各适配器的取数字段一一对应 */
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

  return {
    form,
    autoReconnect,
    reconnectInterval,
    mockInterval,
    topicFilter,
    topicPrefix,
    mqttUsername,
    mqttPassword,
    nodeList,
    applyConfig,
    buildConfig,
  }
}
