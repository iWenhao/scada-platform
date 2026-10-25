import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import { useHistory } from '@/core/canvas/useHistory'

// 自动写草稿的间隔：太短会频繁写存储，太长则崩溃时丢得多
const AUTO_SAVE_INTERVAL = 30_000

/**
 * 编辑会话的数据安全：定时写草稿、离开页面前拦截、重进时提示恢复。
 *
 * 组态画面是重资产（排一张工艺图往往几十分钟），浏览器崩溃或误关标签页
 * 不该让这些工作白做，所以这里用「草稿」把损失窗口压到 30 秒以内。
 */
export function useAutoSave() {
  const projectStore = useProjectStore()
  const route = useRoute()
  const { clearHistory, saveState } = useHistory()

  let timer: number | null = null

  function startAutoSave() {
    stopAutoSave()
    timer = window.setInterval(() => {
      // 只在确有改动时写草稿，避免无意义的存储写入
      if (projectStore.hasUnsavedChanges) {
        void projectStore.saveDraft()
      }
    }, AUTO_SAVE_INTERVAL)
  }

  function stopAutoSave() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (!projectStore.hasUnsavedChanges) return
    // 有未保存改动时触发浏览器原生的离开确认
    e.preventDefault()
    e.returnValue = ''
  }

  /**
   * 恢复草稿后要重建撤销基线：历史栈里仍是旧内容的快照，
   * 不重置的话一按 Ctrl+Z 就会把刚恢复的画面搞乱。
   */
  async function tryRestoreDraft() {
    if (!(await projectStore.hasDraft())) return

    try {
      await ElMessageBox.confirm(
        '检测到上次未正式保存的自动草稿，是否恢复？选择「丢弃」会删除这份草稿。',
        '恢复草稿',
        {
          type: 'warning',
          confirmButtonText: '恢复草稿',
          cancelButtonText: '丢弃',
        },
      )
    } catch {
      await projectStore.clearDraft()
      return
    }

    if (await projectStore.restoreDraft()) {
      clearHistory()
      saveState()
      ElMessage.success('已恢复到上次编辑状态，记得保存')
    }
  }

  /**
   * 按 URL 的 project 参数恢复工程。刷新后 Pinia store 清空，若不重新加载，
   * 编辑器会停在空白画布（工程数据其实在存储里）——主页跳转时把工程名写进了
   * query，这里就是刷新/直链打开的恢复入口。
   *
   * 必须在 tryRestoreDraft 之前完成：草稿键带工程名（scada_draft_<名>），
   * 先恢复工程名，30 秒自动草稿的「未保存改动」才能被查到并弹恢复框。
   * 从主页正常进入时 store 已灌好同一工程，跳过重复读盘。
   */
  async function restoreProjectFromRoute() {
    const name = route.query.project
    if (typeof name !== 'string' || !name) return
    // 「已加载」必须看认领标志而不是工程名：新建工程的默认名就是「未命名项目」，
    // 刷新后 store 复位成的默认名与 query 恰好同名，按名判断会把「未加载」误判成
    // 「已加载」而跳过恢复——表现为刷新后画布空白。loadProject 成功会认领工程名，
    // 刷新后它是 null，只有从主页正常进入时才与 query 相等。
    if (projectStore.ownedProjectName === name) return
    try {
      if (await projectStore.loadProject(name)) return
      ElMessage.warning(`未能恢复工程「${name}」：可能已被删除，当前是空白画布`)
    } catch (e) {
      // 存储故障不该白屏，提示后留在空白画布，用户可回主页重试
      console.error('Failed to restore project from route:', e)
      ElMessage.error(`恢复工程「${name}」失败，请检查存储服务后刷新重试`)
    }
  }

  onMounted(async () => {
    await restoreProjectFromRoute()
    startAutoSave()
    window.addEventListener('beforeunload', handleBeforeUnload)
    void tryRestoreDraft()
  })

  onUnmounted(() => {
    stopAutoSave()
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return { startAutoSave, stopAutoSave }
}
