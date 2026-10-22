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
   * 运行态写值锁定（会话级，不持久化）：锁定后预览页拒绝一切写值下发。
   * 现场大屏长期挂机时防误触，比"每次写值弹确认"更强的兜底。
   */
  const writeLocked = ref<boolean>(false)

  /**
   * 本标签页是否存在编辑会话（内存里有需要保护的编辑现场）。
   * 编辑器 setup 置位、首页挂载复位；只活在内存里，刷新即消失——正好等于「编辑会话」的生命周期。
   * 预览页据此决定要不要在离开时还原现场：从首页直接进预览时，内存里那份是空工程，
   * 还原它反而会把预览加载好的工程抹掉。
   */
  const hasEditSession = ref<boolean>(false)

  function markEditSession() {
    hasEditSession.value = true
  }

  function clearEditSession() {
    hasEditSession.value = false
  }

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
    activeDialog,
    activeTool,
    showGrid,
    showPorts,
    showRuler,
    showMinimap,
    writeLocked,
    hasEditSession,
    markEditSession,
    clearEditSession,
    toggleWriteLock,
    toggleLeftPanel,
    toggleRightPanel,
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
