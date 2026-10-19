import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/projectStore'
import { useHistory } from '@/core/canvas/useHistory'
import { captureCanvasThumbnail, thumbKey } from '@/core/canvas/thumbnail'
import { getStorage } from '@/storage'

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
          // 撞名时走改名重试；用户放弃改名则不返回，留在编辑器避免丢改动
          if (!(await saveWithNameGuard())) {
            ElMessage.error('保存未完成：项目名与已有项目冲突，请改名后重试')
            return
          }
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
    if (!(await saveWithNameGuard())) {
      ElMessage.error('保存未完成：项目名与已有项目冲突，请改名后重试')
      return
    }
    await saveThumbnail()
  }

  /**
   * 带撞名保护的保存：目标工程名已被别人占用时 saveProject 返回 false，
   * 此时弹框请用户改名，改名后重试；用户取消则中止，绝不静默覆盖别人的工程。
   * 保存 / 保存并返回 / 预览前自动保存 / 发布前保存四个入口共用。
   */
  async function saveWithNameGuard(): Promise<boolean> {
    if (await projectStore.saveProject()) return true

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
      // saveProject 内部会再查重：新名字仍然撞名则带着它循环再问
      if (newName && (await projectStore.saveProject(newName))) return true
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
    if (!(await saveWithNameGuard())) {
      ElMessage.error('保存未完成：项目名与已有项目冲突，请改名后重试')
      return
    }
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
    if (!(await saveWithNameGuard())) {
      ElMessage.error('发布未完成：项目名与已有项目冲突，请改名后重试')
      return
    }
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
