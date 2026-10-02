/**
 * 点表对话框「实时数据」页的行构建与过滤。
 * 从 TagTableDialog 拆出：点表编辑与实时预览是两个独立关注点。
 */
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import { findTag } from '@/types/tag'
import type { TagDef } from '@/types/tag'
import { QUALITY_TEXT, QUALITY_TAG_TYPE, formatAge, isUsable } from '@/types/quality'

export function useTagLivePoints(tags: Ref<TagDef[]>) {
  const deviceStore = useDeviceStore()
  const liveKeyword = ref('')

  /**
   * 实时点位：数据源已推送的所有设备.变量 + 点表元数据 + 质量信息。
   * 依赖 dataTick（每秒跳动的质量时钟）：质量会随时间退化为陈旧，
   * 上报时间的"Xs 前"也要每秒重算，没有它列表会停留在打开瞬间的状态。
   */
  const livePoints = computed(() => {
    void deviceStore.dataTick // pinia 已解包：直接读数值，依赖它每秒触发重算
    const now = Date.now()
    const rows: Array<{
      deviceId: string
      variable: string
      value: unknown
      tag: TagDef | null
      unit: string
      description: string
      qualityText: string
      tagType: 'success' | 'warning' | 'info' | 'danger'
      usable: boolean
      ageText: string
      lastAtFull: string
    }> = []
    const data = deviceStore.deviceData as Record<string, Record<string, unknown>>
    for (const [deviceId, vars] of Object.entries(data)) {
      for (const [variable, value] of Object.entries(vars || {})) {
        const tag = findTag(tags.value, deviceId, variable)
        const quality = deviceStore.qualityOf(deviceId, variable)
        const lastAt = deviceStore.variableMeta[`${deviceId}.${variable}`]?.t
        rows.push({
          deviceId,
          variable,
          value,
          tag,
          unit: tag?.unit || '',
          description: tag?.description || '',
          qualityText: QUALITY_TEXT[quality],
          tagType: QUALITY_TAG_TYPE[quality],
          usable: isUsable(quality),
          ageText: lastAt ? formatAge(lastAt, now) : '-',
          lastAtFull: lastAt ? new Date(lastAt).toLocaleString('zh-CN', { hour12: false }) : '',
        })
      }
    }
    return rows
  })

  const filteredLive = computed(() => {
    const kw = liveKeyword.value.trim().toLowerCase()
    if (!kw) return livePoints.value
    return livePoints.value.filter(
      r =>
        r.deviceId.toLowerCase().includes(kw) ||
        r.variable.toLowerCase().includes(kw) ||
        (r.description || '').toLowerCase().includes(kw),
    )
  })

  return { deviceStore, liveKeyword, filteredLive }
}
