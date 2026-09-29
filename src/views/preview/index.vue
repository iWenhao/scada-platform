<template>
  <div class="preview-container">
    <div class="preview-header">
      <div class="header-left">
        <el-button @click="backToEditor">
          <el-icon><Back /></el-icon>
          返回编辑器
        </el-button>
        <span class="project-name">{{ projectStore.projectName }} - 预览模式</span>
      </div>
      
      <div class="header-right">
        <el-badge :value="alarmStore.unackedCount" :hidden="!alarmStore.unackedCount" class="alarm-badge">
          <el-popover placement="bottom" :width="320" trigger="click">
            <template #reference>
              <el-button size="small" circle :type="alarmStore.activeCount ? 'danger' : 'default'" title="报警列表">
                <el-icon><Bell /></el-icon>
              </el-button>
            </template>
            <AlarmPanel />
          </el-popover>
        </el-badge>
        <el-tag :type="connectionStatusType">
          {{ connectionStatusText }}
        </el-tag>
        <span class="last-update">
          最后更新: {{ lastUpdateTime }}
        </span>
      </div>
    </div>
    
    <div class="preview-canvas">
      <v-stage :config="stageConfig">
        <!-- 连线图层 -->
        <v-layer>
          <ConnectionLine
            v-for="conn in connectionStore.connections"
            :key="conn.id"
            :connection="conn"
          />
        </v-layer>


        <v-layer>
          <template v-for="element in canvasStore.elements" :key="element.id">
            <v-group
              :config="{
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                rotation: element.rotation,
                visible: isLayerVisible(element.layerId),
              }"
              @click="handleElementClick(element)"
            >
              <v-rect
                :config="{
                  width: element.width,
                  height: element.height,
                  fill: getElementColor(element),
                  stroke: '#444',
                  strokeWidth: 1,
                  cornerRadius: 4,
                }"
              />
              <v-image
                v-if="getIconImageConfig(element)"
                :config="getIconImageConfig(element)"
              />
              <v-rect
                :config="{
                  y: element.height - getLabelHeight(element),
                  width: element.width,
                  height: getLabelHeight(element),
                  fill: 'rgba(10,14,26,0.55)',
                  cornerRadius: [0, 0, 4, 4],
                }"
              />
              <v-text
                :config="{
                  text: element.name,
                  fontSize: 11,
                  fill: '#e0e0e0',
                  width: element.width,
                  align: 'center',
                  y: element.height - getLabelHeight(element) + 2,
                }"
              />
              <v-text
                v-if="isDisplayElement(element)"
                :config="{
                  text: getDisplayValueText(element),
                  fontSize: 18,
                  fontStyle: 'bold',
                  fill: '#8fe6d3',
                  width: element.width,
                  align: 'center',
                  y: (element.height - getLabelHeight(element)) / 2 - 9,
                }"
              />
              <v-text
                v-else-if="getElementValueText(element)"
                :config="{
                  text: getElementValueText(element),
                  fontSize: 9,
                  fill: '#8fe6d3',
                  width: element.width,
                  align: 'center',
                  y: element.height - 11,
                }"
              />
            </v-group>
          </template>
        </v-layer>
      </v-stage>

      <!-- 图表 overlay：与编辑器一致的 ECharts 实体渲染 -->
      <div class="chart-overlay">
        <div
          v-for="element in chartElements"
          :key="element.id"
          class="chart-slot"
          :style="chartSlotStyle(element)"
        >
          <ChartElement :element="element" />
        </div>
      </div>
    </div>

    <!-- 运行期查看历史曲线 -->
    <TrendChartDialog
      v-model="showTrendDialog"
      :device-id="trendDeviceId"
      :variable="trendVariable"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCanvasStore } from '@/stores/canvasStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useProjectStore } from '@/stores/projectStore'
import { useLayerStore } from '@/stores/layerStore'
import { useAlarmStore } from '@/stores/alarmStore'
import { useElementVisuals } from '@/core/canvas/useElementVisuals'
import AlarmPanel from '@/components/layout/AlarmPanel.vue'
import TrendChartDialog from '@/components/dialogs/TrendChartDialog.vue'
import ConnectionLine from '@/core/connection/ConnectionLine.vue'
import ChartElement from '@/industrial/chart/ChartElement.vue'
import type { ComponentInstance } from '@/types/scada'

const router = useRouter()
const route = useRoute()
const canvasStore = useCanvasStore()
const connectionStore = useConnectionStore()
const deviceStore = useDeviceStore()
const projectStore = useProjectStore()
const layerStore = useLayerStore()
const alarmStore = useAlarmStore()

// 与编辑器共用同一套元素呈现逻辑，避免运行视图与编辑视图的渲染 gradually 漂移
const {
  getElementColor,
  getElementValueText,
  isDisplayElement,
  getDisplayValueText,
  getLabelHeight,
  getIconImageConfig,
  isLayerVisible,
} = useElementVisuals({ deviceStore, layerStore })

// 图表 overlay：ECharts 实体渲染，坐标跟随画布变换（与编辑器逻辑一致）
const CHART_TYPES = ['chart-trend', 'chart-bar', 'chart-pie']

const chartElements = computed(() =>
  canvasStore.elements.filter(el => CHART_TYPES.includes(el.type)),
)

function chartSlotStyle(element: ComponentInstance) {
  const { zoom, offset } = canvasStore
  return {
    left: `${element.x * zoom + offset.x}px`,
    top: `${element.y * zoom + offset.y}px`,
    width: `${element.width * zoom}px`,
    height: `${element.height * zoom}px`,
    visibility: isLayerVisible(element.layerId) ? ('visible' as const) : ('hidden' as const),
  }
}

// 趋势图弹窗：运行期点击元素即可查看该变量的近期曲线
const showTrendDialog = ref(false)
const trendDeviceId = ref('')
const trendVariable = ref('')

function handleElementClick(element: ComponentInstance) {
  // 设定值控件走写值流程，其余元素查看趋势
  if (element.type === 'setpoint') {
    promptWriteValue(element)
    return
  }

  const variable = element.dataBindings?.[0]?.variable
  if (!variable) {
    ElMessage.info('该元素没有绑定数据变量，无法查看趋势')
    return
  }
  trendDeviceId.value = element.deviceId || element.id
  trendVariable.value = variable
  showTrendDialog.value = true
}

/**
 * 写值交互：输入新值 → 确认后经数据源下发。
 * prompt 确认框本身就是操作确认；不支持写值的数据源在下发时明确报错。
 */
async function promptWriteValue(element: ComponentInstance) {
  const binding = element.dataBindings?.[0]
  const deviceId = element.deviceId
  if (!binding || !deviceId) {
    ElMessage.info('该设定值未绑定目标变量，请在编辑器的属性面板中绑定设备与变量')
    return
  }

  const current = deviceStore.getVariableValue(deviceId, binding.variable)
  let input: string
  try {
    const result = await ElMessageBox.prompt(
      `向 ${deviceId}.${binding.variable} 下发新值${element.properties?.unit ? `（${element.properties.unit}）` : ''}`,
      element.name,
      {
        inputValue: current !== undefined ? String(current) : '',
        confirmButtonText: '下发',
        cancelButtonText: '取消',
        inputPattern: /^-?\d+(\.\d+)?$/,
        inputErrorMessage: '请输入数字',
      },
    )
    input = result.value
  } catch {
    return // 用户取消
  }

  try {
    await deviceStore.writeValue(deviceId, binding.variable, Number(input))
    ElMessage.success(`已向 ${deviceId}.${binding.variable} 下发 ${input}`)
  } catch (e) {
    ElMessage.error(`写值失败: ${e instanceof Error ? e.message : e}`)
  }
}

const stageConfig = computed(() => ({
  width: window.innerWidth,
  height: window.innerHeight - 60,
  scaleX: canvasStore.zoom,
  scaleY: canvasStore.zoom,
  x: canvasStore.offset.x,
  y: canvasStore.offset.y,
}))

const connectionStatusType = computed(() => {
  switch (deviceStore.connectionStatus) {
    case 'connected': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
})

const connectionStatusText = computed(() => {
  switch (deviceStore.connectionStatus) {
    case 'connected': return '已连接'
    case 'error': return '连接错误'
    default: return '未连接'
  }
})

const lastUpdateTime = ref('')

function backToEditor() {
  router.push('/editor')
}

function updateLastUpdateTime() {
  if (deviceStore.lastUpdateTime) {
    const date = new Date(deviceStore.lastUpdateTime)
    lastUpdateTime.value = date.toLocaleTimeString()
  }
}

let updateInterval: number | null = null

onMounted(async () => {
  // 支持 /preview?project=xxx 直接打开指定工程，刷新或长期挂在大屏上时也能回到同一画面
  const target = (route.query.project as string) || projectStore.projectName
  const ok = await projectStore.loadProject(target)
  if (!ok) {
    // 长期挂在大屏上的页面最怕静默白屏，这里必须看得见失败原因
    ElMessage.error(`未能加载工程「${target}」，请从编辑器重新进入预览`)
    return
  }

  // 用工程里保存的数据源配置连接，不再写死 mock
  deviceStore.initDataSource(projectStore.dataSourceConfig)

  // 定时更新显示
  updateInterval = window.setInterval(updateLastUpdateTime, 1000)
})

// 工程切换后（如导入/打开别的工程）跟随切换数据源
watch(
  () => projectStore.dataSourceConfig,
  (config) => {
    deviceStore.initDataSource(config)
  },
)

onUnmounted(() => {
  deviceStore.disconnect()
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped lang="scss">
.preview-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.preview-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .project-name {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .last-update {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.preview-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg-canvas);

  /* 图表 overlay：铺满画布区域，只读展示 */
  .chart-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 5;
  }

  .chart-slot {
    position: absolute;
    pointer-events: none;
  }
  
  // 网格背景
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(var(--grid-color) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
    background-size: 20px 20px;
    opacity: 0.5;
    pointer-events: none;
  }
}

:deep(.el-button) {
  background: var(--bg-primary);
  border-color: var(--border-primary);
  color: var(--text-primary);
  
  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-active);
  }
}
</style>
