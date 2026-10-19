import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'

/** 顶栏用户下拉：用户管理入口 + 退出登录 */
export function useUserMenu() {
  const authStore = useAuthStore()
  const projectStore = useProjectStore()
  const showUserManage = ref(false)

  async function handleUserCommand(cmd: string) {
    if (cmd === 'users') {
      showUserManage.value = true
      return
    }
    if (cmd !== 'logout') return

    // 退登走整页跳转，编辑现场（未保存改动与历史栈）必然丢失，确认文案要把代价说清楚
    const message = projectStore.hasUnsavedChanges
      ? '退出登录？当前项目有未保存的更改，退出后将丢失。'
      : '退出登录？'
    try {
      await ElMessageBox.confirm(message, '退出登录', {
        type: 'warning',
        confirmButtonText: '退出',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    await authStore.logout()
    window.location.href = '/login'
  }

  return { showUserManage, handleUserCommand }
}
