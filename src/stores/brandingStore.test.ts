import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { MemoryStorageAdapter, setStorage, getStorage, SITE_BRANDING_KEY } from '@/storage'
import {
  useBrandingStore,
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SUBTITLE,
  DEFAULT_BRAND_ICON,
} from './brandingStore'

/** 取当前 favicon link（jsdom 空白文档中由 applyDocument 创建） */
function faviconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')
}

describe('brandingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setStorage(new MemoryStorageAdapter())
    document.title = ''
    faviconLink()?.remove()
  })

  it('未设置时应使用默认品牌并应用到标题与 favicon', async () => {
    const store = useBrandingStore()
    await store.init()

    expect(store.displayName).toBe(DEFAULT_BRAND_NAME)
    expect(store.displaySubtitle).toBe(DEFAULT_BRAND_SUBTITLE)
    expect(store.displayIcon).toBe(DEFAULT_BRAND_ICON)
    expect(document.title).toBe(`${DEFAULT_BRAND_NAME} - ${DEFAULT_BRAND_SUBTITLE}`)
    expect(faviconLink()?.getAttribute('href')).toBe(DEFAULT_BRAND_ICON)
    expect(faviconLink()?.type).toBe('image/svg+xml')
  })

  it('save 应持久化到全局键并即时生效（标题与 favicon 同步）', async () => {
    const store = useBrandingStore()
    await store.init()

    await store.save({ name: 'A组态', subtitle: '汽水车间', icon: 'data:image/png;base64,AAA' })

    expect(store.displayName).toBe('A组态')
    expect(store.displaySubtitle).toBe('汽水车间')
    expect(document.title).toBe('A组态 - 汽水车间')
    expect(faviconLink()?.getAttribute('href')).toBe('data:image/png;base64,AAA')
    expect(faviconLink()?.type).toBe('image/png')

    const raw = await getStorage().get(SITE_BRANDING_KEY)
    expect(JSON.parse(raw!)).toEqual({ name: 'A组态', subtitle: '汽水车间', icon: 'data:image/png;base64,AAA' })
  })

  it('init 应读取已持久化的品牌（重启/换账号后仍生效）', async () => {
    const storage = new MemoryStorageAdapter()
    setStorage(storage)
    await storage.set(
      SITE_BRANDING_KEY,
      JSON.stringify({ name: 'B组态', subtitle: null, icon: 'data:image/png;base64,BBB' }),
    )

    const store = useBrandingStore()
    await store.init()

    expect(store.displayName).toBe('B组态')
    expect(store.displaySubtitle).toBe(DEFAULT_BRAND_SUBTITLE)
    expect(store.displayIcon).toBe('data:image/png;base64,BBB')
  })

  it('reset 应清空设置并回落默认品牌', async () => {
    const store = useBrandingStore()
    await store.init()
    await store.save({ name: 'A组态', icon: 'data:image/png;base64,AAA' })

    await store.reset()

    expect(store.displayName).toBe(DEFAULT_BRAND_NAME)
    expect(store.displayIcon).toBe(DEFAULT_BRAND_ICON)
    expect(await getStorage().get(SITE_BRANDING_KEY)).toBeNull()
    expect(document.title).toBe(`${DEFAULT_BRAND_NAME} - ${DEFAULT_BRAND_SUBTITLE}`)
  })

  it('持久化数据损坏时应按默认品牌运行且不抛错', async () => {
    const storage = new MemoryStorageAdapter()
    setStorage(storage)
    await storage.set(SITE_BRANDING_KEY, '{oops')

    const store = useBrandingStore()
    await expect(store.init()).resolves.toBeUndefined()
    expect(store.displayName).toBe(DEFAULT_BRAND_NAME)
    expect(store.displayIcon).toBe(DEFAULT_BRAND_ICON)
  })

  it('非法图标（非 data URL）应被丢弃，避免注入未知协议', async () => {
    const storage = new MemoryStorageAdapter()
    setStorage(storage)
    await storage.set(SITE_BRANDING_KEY, JSON.stringify({ name: 'X', icon: 'javascript:alert(1)' }))

    const store = useBrandingStore()
    await store.init()

    expect(store.displayName).toBe('X')
    expect(store.displayIcon).toBe(DEFAULT_BRAND_ICON)
  })
})
