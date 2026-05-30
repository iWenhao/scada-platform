import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
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
    leftPanelOpen,
    rightPanelOpen,
    bottomPanelOpen,
    activeDialog,
    activeTool,
    showGrid,
    showPorts,
    showRuler,
    showMinimap,
    toggleLeftPanel,
    toggleRightPanel,
    toggleBottomPanel,
    openDialog,
    closeDialog,
    setActiveTool,
    toggleGrid,
    togglePorts,
    toggleRuler,
    toggleMinimap,
  }
})
