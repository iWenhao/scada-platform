// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runGate } from './pre-push-check.mjs'
import type { PrePushStep, StepResult } from './pre-push-check.mjs'

function step(name: string): PrePushStep {
  return { name, cmd: 'noop', args: [] }
}

function result(step: PrePushStep, code: number, output = ''): StepResult {
  return { step, code, output, secs: '0.1' }
}

describe('runGate', () => {
  it('所有步骤同时启动，全部通过时各跑一次', async () => {
    const steps = ['a', 'b', 'c', 'd'].map(step)
    const started: string[] = []
    const releases: Array<() => void> = []
    const execute = (current: PrePushStep) =>
      new Promise<StepResult>((resolve) => {
        started.push(current.name)
        releases.push(() => resolve(result(current, 0)))
      })

    const gatePromise = runGate(steps, { execute, log: () => {} })

    // runGate 在第一个 await 前就把四个 execute 都调用了，说明不是串行等待
    expect(started).toEqual(steps.map((current) => current.name))
    releases.forEach((release) => release())
    await expect(gatePromise).resolves.toEqual({ ok: true, failures: [] })
  })

  it('只重试失败项，已通过的步骤不重跑', async () => {
    const [a, b] = ['a', 'b'].map(step)
    const calls: Record<string, number> = {}
    const execute = async (current: PrePushStep) => {
      calls[current.name] = (calls[current.name] ?? 0) + 1
      const code = current.name === 'b' && calls[current.name] === 1 ? 1 : 0
      return result(current, code)
    }

    const gate = await runGate([a, b], { execute, log: () => {} })

    expect(gate.ok).toBe(true)
    expect(calls).toEqual({ a: 1, b: 2 })
  })

  it('重试后仍失败时返回失败项及其输出', async () => {
    const [a, b] = ['a', 'b'].map(step)
    const execute = async (current: PrePushStep) =>
      result(current, current.name === 'b' ? 1 : 0, current.name === 'b' ? 'boom' : '')

    const gate = await runGate([a, b], { execute, log: () => {} })

    expect(gate.ok).toBe(false)
    expect(gate.failures.map((failure) => failure.step.name)).toEqual(['b'])
    expect(gate.failures[0].output).toBe('boom')
  })
})
