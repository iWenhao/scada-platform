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
          await projectStore.saveProject()
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
    await projectStore.saveProject()
    await saveThumbnail()
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

  async function handlePreview() {
    await projectStore.saveProject()
    router.push({ path: '/preview', query: { project: projectStore.projectName } })
  }

  /**
   * 发布当前工程：先落盘工作副本，再生成发布快照。
   * 预览默认看发布版，因此「保存」不会自动改运行画面。
   */
  async function handlePublish() {
    try {
      await ElMessageBox.confirm(
        `发布「${projectStore.projectName}」为运行版？\n\n• 发布后预览/运行端显示该版本\n• 之后继续编辑草稿不影响值班画面\n• 需再次「发布」才会更新运行版\n\n当前内容：多画面、数据源、报警、点表一并快照。`,
        '发布工程',
        { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
    await projectStore.saveProject()
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
