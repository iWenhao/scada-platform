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
 * 每步失败自动重试一次：本机实测沙箱 EPERM 会间歇打翻 vitest 的 vite SSR 缓存
 * （Temp 下 ssr 写入被拦），症状是「用例全过但汇总行带 Errors、退出码非 0」，
 * 与代码无关。AGENTS.md 的口径就是「汇总行出现 Errors 即重跑」，这里机器化；
 * 重试再不过才判真失败——避免用户被环境抖动训练成 --no-verify。
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 钩子的 cwd 不保证是仓库根，按自身位置解析，避免相对路径落空
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const steps = [
  { name: '全量测试', cmd: 'npx', args: ['vitest', 'run'] },
  { name: '类型检查', cmd: 'npx', args: ['vue-tsc', '--noEmit'] },
  // dist 清空会被沙箱拦（与 pnpm build 同款问题），绕开见上注
  { name: '生产构建', cmd: 'npx', args: ['vite', 'build', '--emptyOutDir=false'] },
  { name: '行数检查', cmd: 'powershell', args: ['-NoProfile', '-File', 'scripts/check-long-files.ps1'] },
]

const MAX_ATTEMPTS = 2

for (const step of steps) {
  let passed = false

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !passed; attempt++) {
    if (attempt > 1) {
      console.log(`[pre-push] ↻ ${step.name} 重试（第 ${attempt}/${MAX_ATTEMPTS} 次）`)
    }
    console.log(`\n[pre-push] ▶ ${step.name}：${step.cmd} ${step.args.join(' ')}`)
    const startedAt = Date.now()
    const result = spawnSync(step.cmd, step.args, {
      cwd: repoRoot,
      stdio: 'inherit',
      // Windows 上 npx/powershell 是 .cmd/.exe，没有 shell 会 ENOENT
      shell: process.platform === 'win32',
    })
    const secs = ((Date.now() - startedAt) / 1000).toFixed(1)

    if (!result.error && result.status === 0) {
      console.log(`[pre-push] ✓ ${step.name} 通过（${secs}s）`)
      passed = true
      break
    }

    if (attempt === MAX_ATTEMPTS) {
      console.error(`\n[pre-push] ✗ ${step.name} 失败（第 ${attempt} 次也未过，${secs}s），推送已中止`)
      console.error('[pre-push] 修复后重新 push；若失败形态是「用例全过但汇总行带 EPERM Errors」，属沙箱环境抖动，可重试或 git push --no-verify')
      process.exit(1)
    }
    console.log(`[pre-push] ✗ ${step.name} 本次未过（${secs}s）`)
  }
}

console.log('\n[pre-push] 全量验证四项全部通过，允许推送')
