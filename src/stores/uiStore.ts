import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStorage } from '@/storage'

export type ThemeName = 'dark' | 'light'

export const useUiStore = defineStore('ui', () => {
  // 主题（持久化，main.ts 挂载前已应用；此处异步恢复到 ref 供切换按钮显示）
  const theme = ref<ThemeName>('dark')
  getStorage()
    .get('scada_theme')
    .then(v => {
      if (v === 'light' || v === 'dark') {
        theme.value = v
        applyTheme()
      }
    })
    .catch(() => {})

  function applyTheme() {
    document.documentElement.dataset.theme = theme.value
    // 同步 Element Plus 官方暗色类, 驱动 dark/css-vars.css 的变量体系
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }
  applyTheme()

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme()
    void getStorage().set('scada_theme', theme.value)
  }
  // 左侧面板是否展开
  const leftPanelOpen = ref<boolean>(true)
  
  // 右侧面板是否展开
  const rightPanelOpen = ref<boolean>(true)
  
  // 底部面板是否展开
  const bottomPanelOpen = ref<boolean>(true)
  
  // 当前激活的对话框
  const activeDialog = ref<string | null>(null)
  
  // 工具栏激活的工具
  const activeTool = ref<string>('select')
  
  // 是否显示网格
  const showGrid = ref<boolean>(true)
  
  // 是否显示端口
  const showPorts = ref<boolean>(true)
  
  // 是否显示标尺
  const showRuler = ref<boolean>(false)
  
  // 是否显示小地图
  const showMinimap = ref<boolean>(false)

  /**
   * 组件渲染风格：2d 平面 / 25d 立体感（投影+侧面+高光）。
   * 会话级偏好，不随工程保存，避免老工程打开画风突变。
   */
  const viewMode = ref<'2d' | '25d'>('2d')

  function setViewMode(mode: '2d' | '25d') {
    viewMode.value = mode
  }

  function toggleViewMode() {
    viewMode.value = viewMode.value === '2d' ? '25d' : '2d'
  }

  /**
   * 运行态写值锁定（会话级，不持久化）：锁定后预览页拒绝一切写值下发。
   * 现场大屏长期挂机时防误触，比"每次写值弹确认"更强的兜底。
   */
  const writeLocked = ref<boolean>(false)

  function toggleWriteLock() {
    writeLocked.value = !writeLocked.value
  }

  /**
   * 切换左侧面板
   */
  function toggleLeftPanel() {
    leftPanelOpen.value = !leftPanelOpen.value
  }

  /**
   * 切换右侧面板
   */
  function toggleRightPanel() {
    rightPanelOpen.value = !rightPanelOpen.value
  }

  /**
   * 切换底部面板
   */
  function toggleBottomPanel() {
    bottomPanelOpen.value = !bottomPanelOpen.value
  }

  /**
   * 打开对话框
   */
  function openDialog(name: string) {
    activeDialog.value = name
  }

  /**
   * 关闭对话框
   */
  function closeDialog() {
    activeDialog.value = null
  }

  /**
   * 设置活动工具
   */
  function setActiveTool(tool: string) {
    activeTool.value = tool
  }

  /**
   * 切换网格显示
   */
  function toggleGrid() {
    showGrid.value = !showGrid.value
  }

  /**
   * 切换端口显示
   */
  function togglePorts() {
    showPorts.value = !showPorts.value
  }

  /**
   * 切换标尺显示
   */
  function toggleRuler() {
    showRuler.value = !showRuler.value
  }

  /**
   * 切换小地图显示
   */
  function toggleMinimap() {
    showMinimap.value = !showMinimap.value
  }

  return {
    theme,
    leftPanelOpen,
    rightPanelOpen,
    bottomPanelOpen,
    activeDialog,
    activeTool,
    showGrid,
    showPorts,
    showRuler,
    showMinimap,
    viewMode,
    setViewMode,
    toggleViewMode,
    writeLocked,
    toggleWriteLock,
    toggleLeftPanel,
    toggleRightPanel,
    toggleBottomPanel,
    openDialog,
    closeDialog,
    setActiveTool,
    toggleTheme,
    toggleGrid,
    togglePorts,
    toggleRuler,
    toggleMinimap,
  }
})
