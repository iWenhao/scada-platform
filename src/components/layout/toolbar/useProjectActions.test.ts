// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiRequestError } from '@/api/client'

const mocks = vi.hoisted(() => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  box: { confirm: vi.fn(), alert: vi.fn(), prompt: vi.fn() },
  saveProject: vi.fn(),
  publishProject: vi.fn(),
  renameProject: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock('element-plus', () => ({ ElMessage: mocks.toast, ElMessageBox: mocks.box }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.routerPush }) }))
vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    projectName: '工程A',
    hasUnsavedChanges: false,
    tagTable: [],
    saveProject: mocks.saveProject,
    publishProject: mocks.publishProject,
    renameProject: mocks.renameProject,
  }),
}))
vi.mock('@/stores/pageStore', () => ({
  usePageStore: () => ({ captureActivePage: vi.fn(), pages: [] }),
}))
vi.mock('@/core/canvas/useHistory', () => ({
  useHistory: () => ({ saveState: vi.fn(), clearHistory: vi.fn() }),
}))
vi.mock('@/core/canvas/thumbnail', () => ({
  captureCanvasThumbnail: () => null,
  thumbKey: () => 'thumb',
}))
vi.mock('@/storage', () => ({ getStorage: () => ({ set: vi.fn() }) }))

import { useProjectActions } from './useProjectActions'

describe('useProjectActions 保存失败提示', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('服务端拒绝时直接展示其错误说明', async () => {
    mocks.saveProject.mockRejectedValueOnce(
      new ApiRequestError(500, 'internal_error', '服务内部错误'),
    )

    await useProjectActions().handleSave()

    expect(mocks.toast.error).toHaveBeenCalledWith('保存失败：服务内部错误')
  })

  it('断网（fetch TypeError）时给出可操作的提示', async () => {
    mocks.saveProject.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await useProjectActions().handleSave()

    expect(mocks.toast.error).toHaveBeenCalledWith(
      '保存失败：无法连接存储服务，请检查后端是否运行',
    )
  })

  it('版本过期只保留版本弹窗，不再补一条错误的撞名提示', async () => {
    mocks.saveProject.mockResolvedValueOnce('stale')
    mocks.box.alert.mockResolvedValueOnce(undefined)

    await useProjectActions().handleSave()

    expect(mocks.box.alert).toHaveBeenCalled()
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('改名重试时再次落盘失败也只提示一次', async () => {
    mocks.saveProject
      .mockResolvedValueOnce('exists')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    mocks.box.prompt.mockResolvedValueOnce({ value: '新名字' })

    await useProjectActions().handleSave()

    expect(mocks.toast.error).toHaveBeenCalledTimes(1)
  })

  it('保存成功不弹错误提示', async () => {
    mocks.saveProject.mockResolvedValueOnce(true)

    await useProjectActions().handleSave()

    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('会话失效（401 unauthorized）不叠「保存失败」，提示与跳转交给全局处理', async () => {
    mocks.saveProject.mockRejectedValueOnce(
      new ApiRequestError(401, 'unauthorized', '请先登录'),
    )

    await useProjectActions().handleSave()

    expect(mocks.toast.error).not.toHaveBeenCalled()
  })
})

describe('useProjectActions 发布与重命名失败提示', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function publishWith(project: () => Promise<unknown>): Promise<void> {
    mocks.saveProject.mockResolvedValueOnce(true)
    mocks.box.confirm.mockResolvedValueOnce(undefined)
    mocks.publishProject.mockImplementationOnce(project)
    await useProjectActions().handlePublish()
  }

  it('发布快照写入失败时提示，且不宣布成功', async () => {
    await publishWith(async () => {
      throw new ApiRequestError(500, 'internal_error', '服务内部错误')
    })

    expect(mocks.toast.error).toHaveBeenCalledWith('发布失败：服务内部错误')
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('发布时工程名被占用（返回 false）不再误报已发布', async () => {
    await publishWith(async () => false)

    expect(mocks.toast.error).toHaveBeenCalledWith('发布失败：项目名已被占用，请改名后重试')
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('重命名迁移存储键失败时提示，而不是被末尾的 catch 吞掉', async () => {
    mocks.box.prompt.mockResolvedValueOnce({ value: '新名字' })
    mocks.renameProject.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    useProjectActions().handleRename()

    await vi.waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        '重命名失败：无法连接存储服务，请检查后端是否运行',
      ),
    )
  })
})
