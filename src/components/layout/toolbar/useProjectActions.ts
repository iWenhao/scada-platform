import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import type { SaveResult } from '@/stores/projectPersistence'
import { useHistory } from '@/core/canvas/useHistory'
import { captureCanvasThumbnail, thumbKey } from '@/core/canvas/thumbnail'
import { getStorage } from '@/storage'
import { ApiRequestError } from '@/api/client'

/**
 * 存储异常翻成一句人话。
 * ApiRequestError 的 message 是服务端给的中文说明（500/401/413…），可直接展示；
 * 网络层失败（后端没起、断网）抛的是 TypeError("Failed to fetch")，对用户没有信息量，
 * 换成能指导下一步的说法。
 */
function storageErrorText(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message
  if (e instanceof TypeError) return '无法连接存储服务，请检查后端是否运行'
  return e instanceof Error && e.message ? e.message : '未知错误'
}

/**
 * 统一的存储故障提示。会话失效（401 unauthorized）跳过：全局 401 处理已经
 * 提示并跳登录页，这里再补一条「保存失败：请先登录」只是噪声。
 */
function reportStorageError(action: string, e: unknown): void {
  if (ApiRequestError.is(e, 'unauthorized')) return
  ElMessage.error(`${action}失败：${storageErrorText(e)}`)
}

/** 工程级操作：保存/导入导出/预览/重命名/返回主页 */
export function useProjectActions() {
  const router = useRouter()
  const projectStore = useProjectStore()
  const { saveState, clearHistory } = useHistory()

  function handleRename() {
    ElMessageBox.prompt('请输入新的项目名称', '重命名项目', {
      inputValue: projectStore.projectName,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空',
      confirmButtonText: '重命名',
      cancelButtonText: '取消',
    })
      .then(async ({ value }) => {
        if (await projectStore.renameProject(value)) {
          ElMessage.success('已重命名')
        } else {
          ElMessage.error('重命名失败：名称为空或与已有项目重名')
        }
      })
      .catch(() => {})
  }

  function goHome() {
    if (projectStore.hasUnsavedChanges) {
      ElMessageBox.confirm('当前项目有未保存的更改，返回主页前要先保存吗？', '未保存的更改', {
        type: 'warning',
        confirmButtonText: '保存并返回',
        cancelButtonText: '不保存，直接返回',
        distinguishCancelAndClose: true,
      })
        .then(async () => {
          // 撞名时走改名重试；用户放弃改名或保存故障则不返回，留在编辑器避免丢改动
          if (!(await saveWithNameGuard())) return
          router.push('/')
        })
        .catch((action) => {
          if (action === 'cancel') {
            router.push('/')
          }
        })
    } else {
      router.push('/')
    }
  }

  async function handleSave() {
    saveState()
    if (!(await saveWithNameGuard())) return
    await saveThumbnail()
  }

  /**
   * 落一次盘，把存储故障变成提示而不是异常。
   * 改造前这里直接 await saveProject：后端 500、断网、会话过期时异常会作为未处理的
   * Promise 拒绝冒到控制台，界面上点「保存」毫无反应（只有顶栏的未保存标记还在）。
   * 保存 / 保存并返回 / 预览前自动保存 / 发布前保存四个入口都经过这里，提示只发一次。
   */
  async function saveProjectOnce(name?: string): Promise<SaveResult | 'error'> {
    try {
      return name ? await projectStore.saveProject(name) : await projectStore.saveProject()
    } catch (e) {
      reportStorageError('保存', e)
      return 'error'
    }
  }

  /**
   * 带撞名保护的保存：目标工程名已被别人占用时 saveProject 返回 'exists'，
   * 此时弹框请用户改名，改名后重试；用户取消则中止，绝不静默覆盖别人的工程。
   * 保存 / 保存并返回 / 预览前自动保存 / 发布前保存四个入口共用。
   *
   * 'stale'（乐观并发失败）表示这份工程在别处被改过：不弹改名框，直接提示刷新后再继续，
   * 避免用户改了半天的内容被后写覆盖提醒后还被迫选新名字。
   *
   * 返回 false 表示没写成，原因都已当场提示过（版本过期弹窗、存储故障 toast）或是用户
   * 主动取消改名；调用方直接中止即可，不要再补一条统一的错误文案——改造前四个入口补的是
   * 「项目名冲突」，在 stale 与存储故障场景下会盖住刚弹出的正确提示。
   */
  async function saveWithNameGuard(): Promise<boolean> {
    const result = await saveProjectOnce()
    if (result === 'error') return false
    if (result === true) return true

    if (result === 'stale') {
      try {
        await ElMessageBox.alert(
          '这份工程已在另一个标签页或设备上被修改。请刷新页面重新加载最新版本后再继续编辑，避免覆盖对方的改动。',
          '工程版本已过期',
          { type: 'warning', confirmButtonText: '知道了' },
        )
      } catch {
        // 用户关掉弹窗也算中止保存
      }
      return false
    }

    // result === 'exists'：撞名，弹改名框循环重试
    for (;;) {
      let newName: string | null = null
      try {
        ({ value: newName } = await ElMessageBox.prompt(
          `已存在同名项目「${projectStore.projectName}」，继续保存会覆盖它的数据。\n请输入新的项目名称：`,
          '项目名已被占用',
          {
            inputValue: projectStore.projectName,
            inputPattern: /\S+/,
            inputErrorMessage: '名称不能为空',
            confirmButtonText: '改名并保存',
            cancelButtonText: '取消',
          },
        ))
      } catch {
        return false
      }
      // saveProject 内部会再查重：新名字仍然撞名则带着它循环再问；
      // 若新名字仍 stale（极端情况：改名过程中别处又写了原工程），按 stale 处理
      const r = newName ? await saveProjectOnce(newName) : 'exists'
      if (r === 'error') return false
      if (r === true) return true
      if (r === 'stale') {
        ElMessage.warning('工程版本已过期，请刷新页面后再继续')
        return false
      }
    }
  }

  /** 保存后截一张画布缩略图，供首页卡片展示 */
  async function saveThumbnail() {
    const url = captureCanvasThumbnail()
    if (!url) return
    try {
      await getStorage().set(thumbKey(projectStore.projectName), url)
    } catch {
      // 缩略图失败不影响保存
    }
  }

  function handleExportImage() {
    const stage = (window as any).Konva?.stages?.[0]
    if (!stage) {
      ElMessage.warning('画布尚未就绪')
      return
    }
    const url = stage.toDataURL({ pixelRatio: 2 })
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectStore.projectName}.png`
    a.click()
  }

  function handleExport() {
    const json = projectStore.exportProject()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectStore.projectName}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const json = ev.target?.result as string
          projectStore.importProject(json)
          clearHistory()
          saveState()
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  /**
   * 「预览」看的是自己刚存的工作副本，不是发布版：
   * 发布快照可能属于上一次发布（画面数更少），而预览页与编辑器共用同一份 Pinia store，
   * 读发布版会把内存里的画面列表整表换掉，回到编辑器就表现为「新增的画面没了」。
   * 运行端入口（首页卡片预览）仍默认读发布版。
   */
  async function handlePreview() {
    if (!(await saveWithNameGuard())) return
    router.push({ path: '/preview', query: { project: projectStore.projectName, source: 'draft' } })
  }

  /**
   * 发布当前工程：先落盘工作副本，再生成发布快照。
   * 预览默认看发布版，因此「保存」不会自动改运行画面。
   */
  async function handlePublish() {
    try {
      const { usePageStore } = await import('@/stores/pageStore')
      const pageStore = usePageStore()
      pageStore.captureActivePage()
      const pages = pageStore.pages.length
      const elements = pageStore.pages.reduce((n, p) => n + (p.elements?.length || 0), 0)
      await ElMessageBox.confirm(
        `发布「${projectStore.projectName}」为运行版？\n\n` +
          `内容摘要：${pages} 个画面 / ${elements} 个组件 / ${projectStore.tagTable.length} 个点位\n\n` +
          `• 发布后预览/运行端显示该版本\n` +
          `• 之后继续编辑草稿不影响值班画面\n` +
          `• 需再次「发布」才会更新运行版`,
        '发布工程',
        { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
    // 发布前先落盘工作副本：撞名时同样走改名重试，通过后才生成发布快照
    if (!(await saveWithNameGuard())) return
    await projectStore.publishProject()
    await saveThumbnail()
    ElMessage.success('已发布，预览将显示该版本')
  }

  return {
    handleRename,
    goHome,
    handleSave,
    handleExportImage,
    handleExport,
    handleImport,
    handlePreview,
    handlePublish,
  }
}
