import { ElMessage, ElMessageBox } from 'element-plus'
import { useDeviceStore } from '@/stores/deviceStore'
import { useUiStore } from '@/stores/uiStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import {
  findTag,
  checkWriteAllowed,
  checkUnregisteredPolicy,
  type TagDef,
} from '@/types/tag'
import type { ComponentInstance } from '@/types/scada'

/**
 * 预览运行态写值（加固版）：
 *   角色 → 写值锁 → 未登记策略 → 点表只读/量程 → 按类型输入 → 二次确认 → 下发 → 审计。
 * 任一环节拒绝都会写审计（值记「被拒绝」），不发起网络请求。
 *
 * 输入界面为 WriteValueDialog（按点表 dataType 切换数值/开关/文本），
 * 状态是模块级单例：全局同一时刻只有一个写值流程在进行。
 */

export interface WriteDialogState {
  visible: boolean
  mode: 'number' | 'switch' | 'text'
  deviceId: string
  variable: string
  elementName: string
  unit: string
  description: string
  min?: number
  max?: number
  /** 展示用的当前值（字符串化） */
  current?: string
  onConfirm?: (value: number | string | boolean) => void
  onCancel?: () => void
}

/** 模块级单例：写值对话框同一时刻只有一个 */
export const writeDialogState: WriteDialogState = {
  visible: false,
  mode: 'number',
  deviceId: '',
  variable: '',
  elementName: '',
  unit: '',
  description: '',
}

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

  /**
   * 打开类型化的输入对话框。
   * @returns 用户确认的输入值；取消返回 null
   */
  function openInputDialog(info: {
    mode: WriteDialogState['mode']
    deviceId: string
    variable: string
    elementName: string
    unit: string
    description: string
    min?: number
    max?: number
    current?: string
  }): Promise<number | string | boolean | null> {
    return new Promise(resolve => {
      Object.assign(writeDialogState, info, {
        visible: true,
        onConfirm: (value: number | string | boolean) => {
          writeDialogState.visible = false
          resolve(value)
        },
        onCancel: () => {
          writeDialogState.visible = false
          resolve(null)
        },
      })
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

    // 3. 点表：未登记策略 / 只读
    const tag: TagDef | null = findTag(projectStore.tagTable, deviceId, variable)
    const policyError = checkUnregisteredPolicy(projectStore.writePolicy, tag)
    if (policyError) {
      reject(deviceId, variable, policyError)
      return
    }
    if (tag?.writable === false) {
      reject(deviceId, variable, `「${deviceId}.${variable}」在点表中为只读，禁止写值`)
      return
    }

    const dataType = tag?.dataType ?? 'number'
    const mode: WriteDialogState['mode'] =
      dataType === 'boolean' ? 'switch' : dataType === 'string' ? 'text' : 'number'
    const unit = tag?.unit || element.properties?.unit || ''
    const rawCurrent = deviceStore.getVariableValue(deviceId, variable)

    // 4. 按类型输入
    const input = await openInputDialog({
      mode,
      deviceId,
      variable,
      elementName: element.name,
      unit,
      description: tag?.description ?? '',
      min: tag?.min,
      max: tag?.max,
      current: rawCurrent === undefined ? undefined : String(rawCurrent),
    })
    if (input === null) return

    // 5. 类型一致与量程校验（输入后仍要过一遍，防绕过 UI）
    const rangeError = checkWriteAllowed(tag, input)
    if (rangeError) {
      reject(deviceId, variable, rangeError)
      return
    }
    // warn 策略：放行但明确告知未登记（审计里也要能看出这笔是未登记点位）
    const unregisteredNote =
      projectStore.writePolicy === 'warn' && !tag ? '未登记点位（策略: 提示后允许）' : undefined
    if (unregisteredNote) {
      ElMessage.warning(`「${deviceId}.${variable}」未在点表中登记，请确认后再下发`)
    }

    // 6. 二次确认：明确当前值 → 目标值
    try {
      await ElMessageBox.confirm(
        [
          `设备/变量：${deviceId}.${variable}`,
          `当前值：${rawCurrent !== undefined ? rawCurrent : '-'}${unit ? ` ${unit}` : ''}`,
          `下发值：${input}${unit ? ` ${unit}` : ''}`,
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
      await deviceStore.writeValue(deviceId, variable, input)
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable,
        value: input,
        ok: true,
        error: unregisteredNote,
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
