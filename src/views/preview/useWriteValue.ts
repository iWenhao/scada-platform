import { ElMessage, ElMessageBox } from 'element-plus'
import { useDeviceStore } from '@/stores/deviceStore'
import { useUiStore } from '@/stores/uiStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { findTag, checkWriteAllowed, type TagDef } from '@/types/tag'
import type { ComponentInstance } from '@/types/scada'

/**
 * 预览运行态写值（加固版）：
 *   角色 → 写值锁 → 点表只读/量程 → 输入 → 二次确认 → 下发 → 审计。
 * 任一环节拒绝都会写审计（值记「被拒绝」），不发起网络请求。
 */
export function useWriteValue() {
  const deviceStore = useDeviceStore()
  const uiStore = useUiStore()
  const auditStore = useAuditStore()
  const authStore = useAuthStore()
  const projectStore = useProjectStore()

  function reject(deviceId: string, variable: string, reason: string) {
    ElMessage.warning(reason)
    auditStore.record({
      operator: authStore.operatorName(),
      deviceId,
      variable,
      value: '(被拒绝)',
      ok: false,
      error: reason,
    })
  }

  async function promptWriteValue(element: ComponentInstance) {
    const binding = element.dataBindings?.[0]
    const deviceId = element.deviceId
    if (!binding || !deviceId) {
      ElMessage.info('该设定值未绑定目标变量，请在编辑器的属性面板中绑定设备与变量')
      return
    }
    const variable = binding.variable

    // 1. 角色
    if (!authStore.canWrite) {
      reject(deviceId, variable, '当前账号无写值权限（需要操作员及以上）')
      return
    }

    // 2. 运行态锁
    if (uiStore.writeLocked) {
      reject(deviceId, variable, '写值已被锁定，无法下发；点击右上角锁形按钮解锁')
      return
    }

    // 3. 点表：只读 / 量程
    const tag: TagDef | null = findTag(projectStore.tagTable, deviceId, variable)
    if (tag?.writable === false) {
      reject(deviceId, variable, `「${deviceId}.${variable}」在点表中为只读，禁止写值`)
      return
    }

    const unit = tag?.unit || element.properties?.unit || ''
    const current = deviceStore.getVariableValue(deviceId, variable)

    // 4. 输入
    let input: string
    try {
      const result = await ElMessageBox.prompt(
        `向 ${deviceId}.${variable} 下发新值${unit ? `（${unit}）` : ''}` +
          (tag?.min !== undefined || tag?.max !== undefined
            ? `，量程 ${tag.min ?? '-'} ~ ${tag.max ?? '-'}`
            : ''),
        element.name,
        {
          inputValue: current !== undefined ? String(current) : '',
          confirmButtonText: '下一步',
          cancelButtonText: '取消',
          inputPattern: /^-?\d+(\.\d+)?$/,
          inputErrorMessage: '请输入数字',
        },
      )
      input = result.value
    } catch {
      return
    }

    const nextValue = Number(input)

    // 5. 点表量程（输入后再校验一次）
    const rangeError = checkWriteAllowed(tag, nextValue)
    if (rangeError) {
      reject(deviceId, variable, rangeError)
      return
    }

    // 6. 二次确认：明确当前值 → 目标值
    try {
      await ElMessageBox.confirm(
        [
          `设备/变量：${deviceId}.${variable}`,
          `当前值：${current !== undefined ? current : '-'}${unit ? ` ${unit}` : ''}`,
          `下发值：${nextValue}${unit ? ` ${unit}` : ''}`,
          tag?.description ? `点位说明：${tag.description}` : '',
          '',
          '确认后将立即下发到现场设备。',
        ]
          .filter(Boolean)
          .join('\n'),
        '确认写值',
        {
          type: 'warning',
          confirmButtonText: '确认下发',
          cancelButtonText: '取消',
          distinguishCancelAndClose: true,
        },
      )
    } catch {
      return
    }

    // 7. 下发
    try {
      await deviceStore.writeValue(deviceId, variable, nextValue)
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable,
        value: input,
        ok: true,
      })
      ElMessage.success(`已向 ${deviceId}.${variable} 下发 ${input}`)
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable,
        value: input,
        ok: false,
        error: reason,
      })
      ElMessage.error(`写值失败: ${reason}`)
    }
  }

  return { promptWriteValue }
}
