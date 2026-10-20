/**
 * pre-push-check.mjs 的类型声明。
 *
 * 用途：让同目录的测试文件（pre-push-check.test.ts）在 IDE 里有类型提示。
 * scripts/ 不在 tsconfig 的 include 内（它只收 src/），故该文件不参与 vue-tsc 编译，
 * 仅作编辑器提示——与 commit-msg-check.d.mts 同一套做法。
 */

/** 全量门槛中的一个步骤 */
export interface PrePushStep {
  /** 展示在日志里的名称 */
  name: string
  /** 可执行命令（Windows 上由 shell 解析 npx.cmd） */
  cmd: string
  /** 命令参数，均为脚本内常量 */
  args: string[]
  /** 为真时输出直接继承到终端（全量测试用，便于看进度）；其余步骤缓冲输出 */
  live?: boolean
}

export interface StepResult {
  step: PrePushStep
  /** 子进程退出码；失败或 spawn 出错时非 0 */
  code: number
  /** 缓冲的输出；live 步骤通常为空（已经实时打印） */
  output: string
  /** 墙钟耗时，保留一位小数 */
  secs: string
}

export interface GateResult {
  /** 最后一轮是否全部通过 */
  ok: boolean
  /** 最后一轮仍失败的步骤及输出；ok 为真时为空数组 */
  failures: StepResult[]
}

export function runGate(
  steps: PrePushStep[],
  options?: {
    /** 替换真实子进程，单测注入假实现 */
    execute?: (step: PrePushStep) => Promise<StepResult>
    /** 进度日志出口，单测可传空函数静音 */
    log?: (message: string) => void
    /** 最大轮数，默认 2 */
    attempts?: number
  },
): Promise<GateResult>
