import { onMounted, onUnmounted } from 'vue'
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

  onMounted(() => {
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
