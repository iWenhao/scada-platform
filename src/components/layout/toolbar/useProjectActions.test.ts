// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiRequestError } from '@/api/client'

const mocks = vi.hoisted(() => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  box: { confirm: vi.fn(), alert: vi.fn(), prompt: vi.fn() },
  saveProject: vi.fn(),
  publishProject: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock('element-plus', () => ({ ElMessage: mocks.toast, ElMessageBox: mocks.box }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.routerPush }) }))
vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    projectName: '工程A',
    hasUnsavedChanges: false,
    saveProject: mocks.saveProject,
    publishProject: mocks.publishProject,
  }),
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
