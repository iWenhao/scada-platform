import { ElMessage, ElMessageBox } from 'element-plus'
import { useDeviceStore } from '@/stores/deviceStore'
import { useUiStore } from '@/stores/uiStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import type { ComponentInstance } from '@/types/scada'

/**
 * 预览运行态写值：输入 → 确认 → 下发，并记入审计。
 * 锁定时直接拒绝并留痕，不发起网络请求。
 */
export function useWriteValue() {
  const deviceStore = useDeviceStore()
  const uiStore = useUiStore()
  const auditStore = useAuditStore()
  const authStore = useAuthStore()

  async function promptWriteValue(element: ComponentInstance) {
    const binding = element.dataBindings?.[0]
    const deviceId = element.deviceId
    if (!binding || !deviceId) {
      ElMessage.info('该设定值未绑定目标变量，请在编辑器的属性面板中绑定设备与变量')
      return
    }

    // 角色：操作员及以上才允许写值
    if (!authStore.canWrite) {
      ElMessage.warning('当前账号无写值权限（需要操作员及以上）')
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable: binding.variable,
        value: '(被拒绝)',
        ok: false,
        error: '无写值权限',
      })
      return
    }

    if (uiStore.writeLocked) {
      ElMessage.warning('写值已被锁定，无法下发；点击右上角锁形按钮解锁')
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable: binding.variable,
        value: '(被拒绝)',
        ok: false,
        error: '写值锁定中',
      })
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
      return
    }

    try {
      await deviceStore.writeValue(deviceId, binding.variable, Number(input))
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable: binding.variable,
        value: input,
        ok: true,
      })
      ElMessage.success(`已向 ${deviceId}.${binding.variable} 下发 ${input}`)
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable: binding.variable,
        value: input,
        ok: false,
        error: reason,
      })
      ElMessage.error(`写值失败: ${reason}`)
    }
  }

  return { promptWriteValue }
}
