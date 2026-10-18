// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MAX_SUBJECT_LENGTH, PREFIXES, checkCommitMessage } from './commit-msg-check.mjs'

/** 造一条「刚好 n 字符」的标题：前缀「功能: 」固定 4 字符，其余用汉字补齐 */
function subjectOfLength(n: number): string {
  return '功能: ' + '改'.repeat(n - 4)
}

describe('checkCommitMessage', () => {
  it('合规标题通过', () => {
    const result = checkCommitMessage('功能: 画布元素改为纯图形\n')
    expect(result.ok).toBe(true)
    expect(result.exempt).toBe(false)
    expect(result.subject).toBe('功能: 画布元素改为纯图形')
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('长度为上限的标题通过，超出一个字符即拒绝', () => {
    expect(MAX_SUBJECT_LENGTH).toBe(30)
    const atLimit = checkCommitMessage(subjectOfLength(MAX_SUBJECT_LENGTH))
    expect(atLimit.length).toBe(MAX_SUBJECT_LENGTH)
    expect(atLimit.ok).toBe(true)

    const overLimit = checkCommitMessage(subjectOfLength(MAX_SUBJECT_LENGTH + 1))
    expect(overLimit.length).toBe(MAX_SUBJECT_LENGTH + 1)
    expect(overLimit.ok).toBe(false)
    expect(overLimit.errors[0]).toContain('超出上限 30 字符')
  })

  it('长度按字符计而非字节：30 个汉字不算超长', () => {
    // 若按 UTF-8 字节算，这条会是 90 —— 钩子脚本用 shell 计数时的经典误判
    const result = checkCommitMessage('修复: ' + '改'.repeat(26))
    expect(result.length).toBe(30)
    expect(result.ok).toBe(true)
  })

  it('历史上真实出现过的长标题会被拒绝', () => {
    const result = checkCommitMessage(
      '文档: 新增 2.5D / 插画级图元绘制规范（docs/2.5D_ILLUSTRATION_GUIDE.md），并在 AGENTS.md 挂强制触发点——文档刻意做成自包含',
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('超出上限')
  })

  it('全角冒号与半角冒号都接受', () => {
    expect(checkCommitMessage('修复：管道虚线比例失调').ok).toBe(true)
    expect(checkCommitMessage('修复: 管道虚线比例失调').ok).toBe(true)
    expect(checkCommitMessage('修复:管道虚线比例失调').ok).toBe(true)
  })

  it('未知前缀被拒绝', () => {
    const result = checkCommitMessage('补漏: 登录页种子账号导入')
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('未知前缀「补漏」')
    expect(result.errors[0]).toContain('功能')
  })

  it('缺少前缀或说明被拒绝', () => {
    expect(checkCommitMessage('画布元素改为纯图形').ok).toBe(false)
    expect(checkCommitMessage('功能: 画布元素改为纯图形').errors).toEqual([])
    expect(checkCommitMessage('功能: ').errors[0]).toContain('标题需为')
    expect(checkCommitMessage('功能:').errors[0]).toContain('标题需为')
  })

  it('空标题被拒绝', () => {
    expect(checkCommitMessage('').ok).toBe(false)
    expect(checkCommitMessage('\n\n  \n').errors[0]).toBe('标题为空')
  })

  it('忽略注释行：只看注释后真正的首行', () => {
    const raw = ['# 请输入提交信息', '# 以 # 开头的行将被忽略', '', '修复: 亮色下画布背景仍是黑色'].join('\n')
    const result = checkCommitMessage(raw)
    expect(result.subject).toBe('修复: 亮色下画布背景仍是黑色')
    expect(result.ok).toBe(true)
  })

  it('Merge / Revert / fixup 等自动生成的提交豁免', () => {
    for (const subject of [
      'Merge branch "dev" into master',
      'Revert "功能: 画布元素改为纯图形"',
      'fixup! 修复: 管道虚线比例失调',
      'squash! 文档: 更新提交约定',
    ]) {
      const result = checkCommitMessage(subject)
      expect(result.exempt).toBe(true)
      expect(result.ok).toBe(true)
      expect(result.errors).toEqual([])
    }
  })

  it('正文非空只提示、不阻断提交', () => {
    const raw = '功能: 画布元素改为纯图形\n\n详细理由与实测数据应写进 CHANGELOG。\n'
    const result = checkCommitMessage(raw)
    expect(result.ok).toBe(true)
    expect(result.warnings[0]).toContain('细节统一写进 CHANGELOG.md')
  })

  it('数字、英文与标点各占 1 字符', () => {
    // 「构建: 」4 + 「拆分 」(3) + vendor(6) + 「 」(1) + chunk(5) = 19
    const result = checkCommitMessage('构建: 拆分 vendor chunk')
    expect(result.length).toBe(19)
    expect(result.ok).toBe(true)
  })

  it('白名单与 AGENTS.md 保持一致（含历史高频前缀）', () => {
    for (const prefix of ['功能', '修复', '优化', '文档', '清理', '重构', '构建', '测试', '发版']) {
      expect(PREFIXES).toContain(prefix)
    }
  })
})
