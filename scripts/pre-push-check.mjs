#!/usr/bin/env node
/**
 * Git pre-push 钩子的校验主体：两级验证门槛的本地一半。
 * 由 scripts/hooks/pre-push 调用；任一步失败即退出非 0，git 中止推送。
 * 明确知道自己在做什么时可绕过：git push --no-verify（但绕不过 CI）。
 *
 * 两级分工（2026-10-21 起，详见 AGENTS.md「验证节奏」）：
 *   - 本地 pre-push（无参数 = --light）：轻量集，分钟级。相关测试（本次
 *     推送涉及文件 → 同目录同名 .test.ts）+ vue-tsc + check-long-files。
 *     定位是快速失败：别把明显的类型错误与直接回归推出去，省 CI 分钟数。
 *   - 全量（--full，CI 之外也可手动跑）：五项全跑。权威时机在推送后的
 *     GitHub Actions（.github/workflows/ci.yml）——那里没有本机沙箱 EPERM
 *     静默少跑文件的问题，全量结果比本地可信。
 *
 * 为什么轻量集的测试用「同目录同名」映射而不用 vitest related：related 要
 * vite 转换整个模块图，实测在本机被沙箱 SIGTERM（TMPDIR 绕行仍复现），
 * 且慢；同目录同名是仓库既定约定，纯 git + 路径映射即可。漏掉的跨目录
 * 覆盖由 CI 全量兜底——轻量集从不承诺完备，只承诺快。
 *
 * 五项各自的价值（--full 路径，为什么一个都不能省）：
 *   1. vitest run      行为回归；汇总行出现 Errors 视为本次不可信（沙箱 EPERM 会静默少跑文件）
 *   2. vue-tsc         前端跨文件类型错误（Record 缺键、接口字段漏传这类单测看不出来）
 *   3. tsc -p tsconfig.server.json  服务端与 shared 的 .mjs 类型检查，vue-tsc 的 include 覆盖不到
 *   4. vite build      类型检查看不见的静态资源与分包问题；--emptyOutDir=false 绕开沙箱对 dist 清空的拦截
 *   5. check-long-files 400 行门槛，单测与类型检查都抓不到
 *
 * 为什么五步并行：五项互不依赖，串行时墙钟等于五项之和，并行后由最慢一项决定。
 * 测试保留实时输出便于看进度；其余四步的输出先缓冲，失败时才打印，避免多进程输出交错。
 *
 * 为什么按轮重试而不是各步自行重试：第一轮全部跑完后再重试失败项，避免
 * 重试进程与仍在运行的步骤争 CPU；已经通过的步骤不重跑。每步最多两次。
 *
 * 本机实测沙箱 EPERM 会间歇打翻 vitest 的 vite SSR 缓存（Temp 下 ssr 写入
 * 被拦），症状是「用例全过但汇总行带 Errors、退出码非 0」，与代码无关。
 * AGENTS.md 的口径就是「汇总行出现 Errors 即重跑」，这里机器化；重试再不过
 * 才判真失败——避免用户被环境抖动训练成 --no-verify。
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 钩子的 cwd 不保证是仓库根，按自身位置解析，避免相对路径落空
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 轻量集里找相关测试的源码目录；其他路径（package.json、文档、配置）没有同目录测试可映射。scripts/ 必须在内：vitest include 覆盖它，提交信息校验与本脚本自己的测试都在那儿 */
const SOURCE_DIRS = ['src/', 'server/', 'shared/', 'scripts/']

const fullSteps = [
  { name: '全量测试', cmd: 'npx', args: ['vitest', 'run'], live: true },
  { name: '类型检查', cmd: 'npx', args: ['vue-tsc', '--noEmit'] },
  // 服务端 .mjs 不在 vue-tsc 的 include 内，缺了这条推进去的类型错误只能靠人工发现
  { name: '服务端类型检查', cmd: 'npx', args: ['tsc', '-p', 'tsconfig.server.json'] },
  // dist 清空会被沙箱拦（与 pnpm build 同款问题），绕开见上注
  { name: '生产构建', cmd: 'npx', args: ['vite', 'build', '--emptyOutDir=false'] },
  // 行数检查走 Node 脚本：原 .ps1 只在装了 PowerShell 的 Windows 上能跑，
  // Mac/Linux 的 pre-push 会 spawn `powershell` 拿 ENOENT 中止推送。
  { name: '行数检查', cmd: 'node', args: ['scripts/check-long-files.mjs'] },
]

/**
 * 把本次推送涉及的文件映射为同目录同名 .test.ts（仓库约定：单测与被测
 * 源码同目录同名）。只认 src/ server/ shared/ 下的路径；测试文件自身直接
 * 纳入。返回去重排序后的列表，可能为空（纯逻辑无测试可跑时由调用方跳过）。
 */
export function mapTestFiles(changedFiles) {
  const tests = new Set()
  for (const file of changedFiles) {
    if (!SOURCE_DIRS.some((dir) => file.startsWith(dir))) continue
    if (file.endsWith('.test.ts')) {
      tests.add(file)
      continue
    }
    const candidate = file.replace(/\.[^.]+$/, '.test.ts')
    // candidate === file 说明原文件没有扩展名（如 scripts/hooks/pre-push），
    // 正则替换不生效；这种文件没有「同名测试」可映射，不能把自身当测试传出去。
    if (candidate !== file && fs.existsSync(path.join(repoRoot, candidate))) tests.add(candidate)
  }
  return [...tests].sort()
}

/**
 * 本次推送涉及的文件：三点语法取 HEAD 相对上游的独有提交（不含上游独有）。
 * 新分支无上游时 @{u} 解析失败，返回 null——调用方跳过测试步骤只跑静态
 * 检查，并把情况打在日志里。多分支同时推送时只对当前分支准确，罕见场景。
 */
function pushedFiles() {
  const result = spawnSync('git', ['diff', '--name-only', '@{u}...HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) return null
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** 轻量集：相关测试（有才跑）+ 两个静态检查，分钟级 */
function lightSteps() {
  const steps = [
    { name: '类型检查', cmd: 'npx', args: ['vue-tsc', '--noEmit'] },
    { name: '行数检查', cmd: 'node', args: ['scripts/check-long-files.mjs'] },
  ]
  const changed = pushedFiles()
  if (changed === null) {
    console.log('[pre-push] 无上游跟踪（新分支？），跳过相关测试，只跑静态检查')
    return steps
  }
  const tests = mapTestFiles(changed)
  if (tests.length === 0) {
    console.log(`[pre-push] 本次推送 ${changed.length} 个文件均无同目录同名测试，跳过相关测试`)
    return steps
  }
  console.log(`[pre-push] 相关测试 ${tests.length} 个（映射自本次推送 ${changed.length} 个文件）`)
  return [{ name: '相关测试', cmd: 'npx', args: ['vitest', 'run', ...tests], live: true }, ...steps]
}

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
  // 无参数 = --light（pre-push 钩子的默认）；--full 保留全量路径，CI 之外
  // 也可手动跑。CI 自身不调本脚本（workflow 里分步跑，界面更直观）。
  const full = process.argv.includes('--full')
  const steps = full ? fullSteps : lightSteps()
  const label = full ? '全量' : '轻量'

  const { ok, failures } = await runGate(steps)
  if (ok) {
    console.log(`\n[pre-push] ${label}验证 ${steps.length} 项全部通过，允许推送`)
    if (!full) console.log('[pre-push] 全量五项由推送后的 CI 兜底（.github/workflows/ci.yml）')
    return
  }

  for (const failure of failures) {
    console.error(`\n[pre-push] ▼ ${failure.step.name} 输出（${failure.secs}s）`)
    const output = failure.output.trimEnd()
    console.error(output || '（该步骤无输出；测试步骤是实时输出，见上方）')
  }
  console.error(`\n[pre-push] ✗ ${failures.map((failure) => failure.step.name).join('、')} 两次均未通过，推送已中止`)
  console.error('[pre-push] 修复后重新 push；若失败形态是「用例全过但汇总行带 EPERM Errors」，属沙箱环境抖动，可重试或 git push --no-verify（CI 仍会跑全量）')
  process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
