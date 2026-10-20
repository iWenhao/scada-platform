#!/usr/bin/env node
/**
 * Git pre-push 钩子的校验主体：推送前跑全量验证门槛。
 * 由 scripts/hooks/pre-push 调用；任一步失败即退出非 0，git 中止推送。
 * 明确知道自己在做什么时可绕过：git push --no-verify。
 *
 * 为什么门槛在推送而不在提交：本仓库没有 CI，「每次提交跑全量」等于把集成
 * 检查提前到每一小步改动——逻辑单元越小越浪费。提交只跑轻量集（AGENTS.md
 * 「验证节奏」表第一级），推送前由本脚本强制跑全量：提交之间允许个别坏
 * 提交，但不出机器；远端永远是全量验证过的状态。
 *
 * 四件套各自的价值（为什么一个都不能省）：
 *   1. vitest run      行为回归；汇总行出现 Errors 视为本次不可信（沙箱 EPERM 会静默少跑文件）
 *   2. vue-tsc         跨文件类型错误（Record 缺键、接口字段漏传这类单测看不出来）
 *   3. vite build      类型检查看不见的静态资源与分包问题；--emptyOutDir=false 绕开沙箱对 dist 清空的拦截
 *   4. check-long-files 400 行门槛，单测与类型检查都抓不到
 *
 * 为什么四步并行：四项互不依赖，串行时墙钟等于四项之和（实测约 89s），
 * 并行后由最慢一项决定（8 核实测约 44s）。测试保留实时输出便于看进度；
 * 类型检查/构建/行数的输出先缓冲，失败时才打印，避免多进程输出交错。
 *
 * 为什么按轮重试而不是各步自行重试：第一轮全部跑完后再重试失败项，避免
 * 重试进程与仍在运行的步骤争 CPU；已经通过的步骤不重跑。每步最多两次。
 *
 * 本机实测沙箱 EPERM 会间歇打翻 vitest 的 vite SSR 缓存（Temp 下 ssr 写入
 * 被拦），症状是「用例全过但汇总行带 Errors、退出码非 0」，与代码无关。
 * AGENTS.md 的口径就是「汇总行出现 Errors 即重跑」，这里机器化；重试再不过
 * 才判真失败——避免用户被环境抖动训练成 --no-verify。
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 钩子的 cwd 不保证是仓库根，按自身位置解析，避免相对路径落空
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const steps = [
  { name: '全量测试', cmd: 'npx', args: ['vitest', 'run'], live: true },
  { name: '类型检查', cmd: 'npx', args: ['vue-tsc', '--noEmit'] },
  // dist 清空会被沙箱拦（与 pnpm build 同款问题），绕开见上注
  { name: '生产构建', cmd: 'npx', args: ['vite', 'build', '--emptyOutDir=false'] },
  // 行数检查走 Node 脚本：原 .ps1 只在装了 PowerShell 的 Windows 上能跑，
  // Mac/Linux 的 pre-push 会 spawn `powershell` 拿 ENOENT 中止推送。
  { name: '行数检查', cmd: 'node', args: ['scripts/check-long-files.mjs'] },
]

const MAX_ATTEMPTS = 2

/**
 * 命令与参数全是本文件里的常量，不含用户输入；拼接成字符串是为了避免
 * Node 的 DEP0190（向 shell 传 args 数组）警告，同时保证 Windows 能解析 npx.cmd。
 */
function commandLine(step) {
  return [step.cmd, ...step.args].join(' ')
}

/** 执行单个步骤；live 为真的步骤把输出直接继承到终端，其余先缓冲。 */
function executeStep(step) {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const child = spawn(commandLine(step), {
      cwd: repoRoot,
      shell: true,
      stdio: step.live ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    if (!step.live) {
      child.stdout.on('data', (chunk) => {
        output += chunk
      })
      child.stderr.on('data', (chunk) => {
        output += chunk
      })
    }
    child.on('error', (error) => {
      output += `\n${error.message}`
    })
    child.on('close', (code) => {
      resolve({
        step,
        code: code ?? 1,
        output,
        secs: ((Date.now() - startedAt) / 1000).toFixed(1),
      })
    })
  })
}

/**
 * 并行跑完一轮，再只重试失败项。execute 可注入，供单测替换真实子进程。
 * 返回 failures 为最后一轮仍失败的步骤（含缓冲输出），ok 为是否全部通过。
 */
export async function runGate(
  steps,
  { execute = executeStep, log = console.log, attempts = MAX_ATTEMPTS } = {},
) {
  let pending = steps
  let failures = []

  for (let attempt = 1; attempt <= attempts && pending.length > 0; attempt++) {
    if (attempt > 1) {
      log(`\n[pre-push] ↻ 重试未过项（第 ${attempt}/${attempts} 次）`)
    }
    for (const step of pending) {
      log(`[pre-push] ▶ ${step.name}：${commandLine(step)}`)
    }

    const results = await Promise.all(pending.map((step) => execute(step)))
    failures = results.filter((result) => result.code !== 0)
    for (const result of results) {
      const mark = result.code === 0 ? '✓' : '✗'
      const tail = result.code === 0 ? '通过' : '未过'
      log(`[pre-push] ${mark} ${result.step.name} ${tail}（${result.secs}s）`)
    }
    pending = failures.map((result) => result.step)
  }

  return failures.length === 0 ? { ok: true, failures: [] } : { ok: false, failures }
}

async function main() {
  const { ok, failures } = await runGate(steps)
  if (ok) {
    console.log('\n[pre-push] 全量验证四项全部通过，允许推送')
    return
  }

  for (const failure of failures) {
    console.error(`\n[pre-push] ▼ ${failure.step.name} 输出（${failure.secs}s）`)
    const output = failure.output.trimEnd()
    console.error(output || '（该步骤无输出；全量测试是实时输出，见上方）')
  }
  console.error(`\n[pre-push] ✗ ${failures.map((failure) => failure.step.name).join('、')} 两次均未通过，推送已中止`)
  console.error('[pre-push] 修复后重新 push；若失败形态是「用例全过但汇总行带 EPERM Errors」，属沙箱环境抖动，可重试或 git push --no-verify')
  process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
