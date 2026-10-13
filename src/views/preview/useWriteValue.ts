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
  coerceTagValue,
  type TagDef,
} from '@/types/tag'
import type { ComponentInstance } from '@/types/scada'

/**
 * 预览运行态写值（加固版）：
 *   角色 → 写值锁 → 未登记策略 → 点表只读/量程 → 按类型输入 → 二次确认 → 下发 → 审计。
 * 任一环节拒绝都会写审计（值记「被拒绝」），不发起网络请求。
 *
 * 两个入口共用同一套关卡：
 * - `promptWriteValue`  设定值：弹窗按点表类型输入后提交；
 * - `writePresetValue`  操作按钮：下发值写在属性里，点一下即提交，跳过的只有
 *                       「按类型输入」这一环（二次确认仍可在属性里保留）。
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

  /** 写值上下文：走完前置关卡（绑定 / 角色 / 写值锁 / 点表）之后的产物 */
  interface WriteContext {
    deviceId: string
    variable: string
    tag: TagDef | null
    dataType: TagDef['dataType']
    unit: string
    elementName: string
    description: string
    min?: number
    max?: number
    /** 展示用的当前值（取不到为 undefined） */
    current?: string
  }

  /**
   * 前置校验：绑定 → 角色 → 运行态锁 → 点表（未登记策略 / 只读）。
   *
   * 弹窗输入与按钮直发共用这一段，保证「按钮只是省掉手输这一步」，不是绕过
   * 关卡的捷径。任一环节拒绝都会写审计并返回 null。
   */
  function prepareWrite(element: ComponentInstance): WriteContext | null {
    const binding = element.dataBindings?.[0]
    const deviceId = element.deviceId
    if (!binding || !deviceId) {
      ElMessage.info('该元素未绑定目标变量，请在编辑器的属性面板中绑定设备与变量')
      return null
    }
    const variable = binding.variable

    // 1. 角色
    if (!authStore.canWrite) {
      reject(deviceId, variable, '当前账号无写值权限（需要操作员及以上）')
      return null
    }

    // 2. 运行态锁
    if (uiStore.writeLocked) {
      reject(deviceId, variable, '写值已被锁定，无法下发；点击右上角锁形按钮解锁')
      return null
    }

    // 3. 点表：未登记策略 / 只读
    const tag: TagDef | null = findTag(projectStore.tagTable, deviceId, variable)
    const policyError = checkUnregisteredPolicy(projectStore.writePolicy, tag)
    if (policyError) {
      reject(deviceId, variable, policyError)
      return null
    }
    if (tag?.writable === false) {
      reject(deviceId, variable, `「${deviceId}.${variable}」在点表中为只读，禁止写值`)
      return null
    }

    const rawCurrent = deviceStore.getVariableValue(deviceId, variable)
    return {
      deviceId,
      variable,
      tag,
      dataType: tag?.dataType ?? 'number',
      unit: tag?.unit || element.properties?.unit || '',
      elementName: element.name,
      description: tag?.description ?? '',
      min: tag?.min,
      max: tag?.max,
      current: rawCurrent === undefined ? undefined : String(rawCurrent),
    }
  }

  /**
   * 提交写值：量程校验 → 未登记提示 → 二次确认 → 下发 → 审计。
   * @returns 是否成功下发
   */
  async function commitWrite(
    ctx: WriteContext,
    value: number | string | boolean,
    options: { skipConfirm?: boolean } = {},
  ): Promise<boolean> {
    const { deviceId, variable, tag, unit } = ctx
    const rawCurrent = ctx.current

    // 4. 类型一致与量程校验（输入后仍要过一遍，防绕过 UI）
    const rangeError = checkWriteAllowed(tag, value)
    if (rangeError) {
      reject(deviceId, variable, rangeError)
      return false
    }
    // warn 策略：放行但明确告知未登记（审计里也要能看出这笔是未登记点位）
    const unregisteredNote =
      projectStore.writePolicy === 'warn' && !tag ? '未登记点位（策略: 提示后允许）' : undefined
    if (unregisteredNote) {
      ElMessage.warning(`「${deviceId}.${variable}」未在点表中登记，请确认后再下发`)
    }

    // 5. 二次确认：明确当前值 → 目标值
    if (!options.skipConfirm) {
      try {
        await ElMessageBox.confirm(
          [
            `设备/变量：${deviceId}.${variable}`,
            `当前值：${rawCurrent !== undefined ? rawCurrent : '-'}${unit ? ` ${unit}` : ''}`,
            `下发值：${value}${unit ? ` ${unit}` : ''}`,
            ctx.description ? `点位说明：${ctx.description}` : '',
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
        return false
      }
    }

    // 6. 下发
    try {
      await deviceStore.writeValue(deviceId, variable, value)
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable,
        value,
        ok: true,
        error: unregisteredNote,
      })
      ElMessage.success(`已向 ${deviceId}.${variable} 下发 ${value}`)
      return true
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      auditStore.record({
        operator: authStore.operatorName(),
        deviceId,
        variable,
        value,
        ok: false,
        error: reason,
      })
      ElMessage.error(`写值失败: ${reason}`)
      return false
    }
  }

  /** 设定值：弹窗按点表类型输入，再提交 */
  async function promptWriteValue(element: ComponentInstance) {
    const ctx = prepareWrite(element)
    if (!ctx) return

    const mode: WriteDialogState['mode'] =
      ctx.dataType === 'boolean' ? 'switch' : ctx.dataType === 'string' ? 'text' : 'number'

    // 3'. 按类型输入
    const input = await openInputDialog({
      mode,
      deviceId: ctx.deviceId,
      variable: ctx.variable,
      elementName: ctx.elementName,
      unit: ctx.unit,
      description: ctx.description,
      min: ctx.min,
      max: ctx.max,
      current: ctx.current,
    })
    if (input === null) return
    await commitWrite(ctx, input)
  }

  /**
   * 操作按钮：下发值写在属性里（properties.writeValue），点一下直接提交，
   * 跳过的只有输入对话框这一环。
   */
  async function writePresetValue(element: ComponentInstance) {
    const ctx = prepareWrite(element)
    if (!ctx) return

    const raw = String(element.properties?.writeValue ?? '').trim()
    if (!raw) {
      ElMessage.warning(`「${ctx.elementName}」未配置下发值，请在属性面板的「下发值」中填写`)
      return
    }
    const value = coerceTagValue(raw, ctx.dataType)
    if (value === null) {
      ElMessage.warning(
        `下发值「${raw}」无法按点位类型 ${ctx.dataType} 解析，请检查属性面板的「下发值」`,
      )
      return
    }
    await commitWrite(ctx, value, { skipConfirm: element.properties?.confirm === false })
  }

  return { promptWriteValue, writePresetValue }
}
