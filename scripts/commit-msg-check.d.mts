/**
 * commit-msg-check.mjs 的类型声明。
 *
 * 用途：让同目录的测试文件（commit-msg-check.test.ts）在 IDE 里有类型提示。
 * scripts/ 不在 tsconfig 的 include 内（它只收 src/），故该文件不参与 vue-tsc 编译，
 * 仅作编辑器提示——与 shared/consoleBanner.d.mts 同一套做法。
 */

/** 标题长度上限（字符数，按 Unicode 码点计） */
export const MAX_SUBJECT_LENGTH: number

/** 允许的标题前缀，与 AGENTS.md 的白名单同步维护 */
export const PREFIXES: string[]

export interface CommitMessageCheckResult {
  /** 是否通过校验（errors 为空） */
  ok: boolean
  /** 是否为 Git 自动生成的提交（Merge / Revert / fixup! / squash!），此类跳过全部检查 */
  exempt: boolean
  /** 解析出的标题（首行），已去除首尾空白 */
  subject: string
  /** 标题的字符数（Unicode 码点，一个汉字算 1） */
  length: number
  /** 阻断提交的问题 */
  errors: string[]
  /** 仅提示、不阻断提交的问题 */
  warnings: string[]
}

export function checkCommitMessage(raw: string): CommitMessageCheckResult
