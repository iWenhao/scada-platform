/**
 * 站点品牌设置：平台名称 / 副标题 / 图标（部署级，不随用户与项目变化）。
 * 同一套代码部署到不同现场时，在首页「系统设置 → 站点品牌」里即可改成各自的
 * 「A组态」「B组态」，无需改代码重新构建。
 *
 * 存储语义（与用户隔离的项目数据不同，品牌必须全部署一致、登录前可见）：
 * - 远程模式走公开的 `GET /api/branding`（未鉴权可读，服务端落 u/global/ 全局命名空间）
 *   与仅管理员可写的 `PUT /api/branding`；
 * - 本地/内存模式走存储抽象的全局键 SITE_BRANDING_KEY（不参与用户命名空间）。
 *
 * 加载/保存后通过 applyDocument() 同步浏览器标签页标题与 favicon，
 * 页面上的品牌展示统一读 displayName / displaySubtitle / displayIcon。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getStorage, SITE_BRANDING_KEY, resolveApiBase, storageMode } from '@/storage'
import { authHeaders } from '@/auth/session'

/** 默认品牌：与 index.html 的静态标题保持一致，挂载后由品牌设置接管 */
export const DEFAULT_BRAND_NAME = 'SCADA Platform'
export const DEFAULT_BRAND_SUBTITLE = '工业组态可视化平台'
/** 默认图标：public/logo.svg */
export const DEFAULT_BRAND_ICON = '/logo.svg'

interface BrandingPayload {
  name: string | null
  subtitle: string | null
  /** 图标 data URL（位图已在前端缩放为 256×256 PNG，SVG 原样透传） */
  icon: string | null
}

export const useBrandingStore = defineStore('branding', () => {
  const name = ref<string | null>(null)
  const subtitle = ref<string | null>(null)
  const icon = ref<string | null>(null)
  const loaded = ref(false)

  /** 展示用品牌：未设置/为空时回落默认值 */
  const displayName = computed(() => (name.value ?? '').trim() || DEFAULT_BRAND_NAME)
  const displaySubtitle = computed(() => (subtitle.value ?? '').trim() || DEFAULT_BRAND_SUBTITLE)
  const displayIcon = computed(() => icon.value || DEFAULT_BRAND_ICON)

  /** 把品牌同步到浏览器标签页标题与 favicon（无 document 的环境静默跳过） */
  function applyDocument(): void {
    if (typeof document === 'undefined') return
    document.title = `${displayName.value} - ${displaySubtitle.value}`
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    const href = displayIcon.value
    link.href = href
    // MIME 跟随数据形态：默认路径与 SVG data URL 均为 SVG，位图缩放后是 PNG
    link.type = href.startsWith('data:image/svg') || href.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  }

  /** 校验并归一化持久化数据：字段缺失/损坏一律回落默认，避免脏数据影响页面 */
  function normalize(raw: string | null): void {
    name.value = subtitle.value = icon.value = null
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<BrandingPayload>
      if (typeof parsed.name === 'string' && parsed.name.trim()) name.value = parsed.name
      if (typeof parsed.subtitle === 'string' && parsed.subtitle.trim()) subtitle.value = parsed.subtitle
      if (typeof parsed.icon === 'string' && parsed.icon.startsWith('data:image/')) icon.value = parsed.icon
    } catch {
      // 损坏的配置按未设置处理
    }
  }

  /** 启动时加载品牌（main.ts 在挂载前调用，登录页也能显示部署品牌） */
  async function init(): Promise<void> {
    if (loaded.value) return
    loaded.value = true
    try {
      if (storageMode() === 'remote') {
        // 远程模式必须走公开接口：KV 按用户隔离，而品牌是部署级的（未登录也要可读）
        const res = await fetch(resolveApiBase() + '/branding', {
          signal: AbortSignal.timeout(3000),
        })
        normalize(res.ok ? ((await res.json()) as { value: string | null }).value : null)
      } else {
        normalize(await getStorage().get(SITE_BRANDING_KEY))
      }
    } catch {
      // 读取失败按默认品牌运行
    }
    applyDocument()
  }

  /** 保存品牌并即时应用到当前页面；远程模式下写权限由服务端校验（admin） */
  async function save(next: { name?: string; subtitle?: string; icon?: string | null }): Promise<void> {
    const payload: BrandingPayload = {
      name: next.name?.trim() || null,
      subtitle: next.subtitle?.trim() || null,
      icon: next.icon ?? null,
    }
    const body = JSON.stringify(payload)
    if (storageMode() === 'remote') {
      const res = await fetch(resolveApiBase() + '/branding', {
        method: 'PUT',
        headers: { ...authHeaders(), 'content-type': 'text/plain; charset=utf-8' },
        body,
      })
      if (!res.ok) {
        throw new Error(res.status === 403 ? '仅管理员可修改站点品牌' : `保存失败（HTTP ${res.status}）`)
      }
    } else {
      await getStorage().set(SITE_BRANDING_KEY, body)
    }
    normalize(body)
    applyDocument()
  }

  /** 恢复默认：清空设置并删除持久化数据 */
  async function reset(): Promise<void> {
    if (storageMode() === 'remote') {
      await save({ name: '', subtitle: '', icon: null })
      return
    }
    await getStorage().remove(SITE_BRANDING_KEY)
    normalize(null)
    applyDocument()
  }

  return {
    name,
    subtitle,
    icon,
    loaded,
    displayName,
    displaySubtitle,
    displayIcon,
    applyDocument,
    init,
    save,
    reset,
  }
})
