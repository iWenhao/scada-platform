// @ts-nocheck  server/notify.mjs 为零依赖 ESM
import { describe, it, expect, beforeEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// server/notify.mjs 为零依赖 ESM，用动态导入并显式收窄类型
const notify = (await import('../../server/notify.mjs')) as {
  renderTemplate: (tpl: string, vars: Record<string, unknown>) => string
  loadNotifyConfig: (dir: string) => Promise<{ channels: any[]; minIntervalMs: number }>
  saveNotifyConfig: (
    dir: string,
    cfg: { channels: any[]; minIntervalMs?: number },
  ) => Promise<{ channels: any[]; minIntervalMs: number }>
  dispatchNotification: (
    dir: string,
    event: any,
    sent?: Map<string, number>,
  ) => Promise<Array<{ ok: boolean; error?: string }>>
  sendToChannel: (channel: any, event: any) => Promise<{ ok: boolean; error?: string }>
}

const { renderTemplate, loadNotifyConfig, saveNotifyConfig, dispatchNotification, sendToChannel } = notify

const sampleEvent = {
  kind: 'active',
  level: 'critical',
  title: 't',
  message: 'm',
  time: 1,
  timeText: 'now',
}

describe('notify renderTemplate', () => {
  it('替换变量', () => {
    expect(renderTemplate('{{title}} / {{level}}', { title: '泵报警', level: 'critical' })).toBe(
      '泵报警 / critical',
    )
  })
  it('未知变量为空', () => {
    expect(renderTemplate('x{{nope}}y', {})).toBe('xy')
  })
})

describe('notify config + dispatch', () => {
  let dir: string

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'scada-notify-'))
  })

  it('保存后可加载', async () => {
    await saveNotifyConfig(dir, {
      minIntervalMs: 1000,
      channels: [
        {
          id: 'c1',
          name: 'wh',
          type: 'webhook',
          enabled: true,
          levels: ['critical'],
          notifyOn: ['active'],
          config: { url: 'http://127.0.0.1:9/hook' },
        },
      ],
    })
    const cfg = await loadNotifyConfig(dir)
    expect(cfg.minIntervalMs).toBe(1000)
    expect(cfg.channels).toHaveLength(1)
    expect(cfg.channels[0].type).toBe('webhook')
  })

  it('按级别与时机过滤，并节流', async () => {
    await saveNotifyConfig(dir, {
      minIntervalMs: 60000,
      channels: [
        {
          id: 'c1',
          name: 'only-critical',
          type: 'webhook',
          enabled: true,
          levels: ['critical'],
          notifyOn: ['active'],
          config: { url: 'http://127.0.0.1:9/hook' },
        },
      ],
    })
    const sent = new Map<string, number>()
    const r1 = await dispatchNotification(
      dir,
      { ...sampleEvent, level: 'warning' },
      sent,
    )
    expect(r1).toHaveLength(0)

    const r2 = await dispatchNotification(dir, sampleEvent, sent)
    expect(r2).toHaveLength(1)
    expect(r2[0].ok).toBe(false)

    const r3 = await dispatchNotification(dir, sampleEvent, sent)
    expect(r3[0].error).toContain('节流')
  })
})

describe('sendToChannel', () => {
  it('webhook 缺 url 报错', async () => {
    const r = await sendToChannel(
      { id: 'x', name: 'x', type: 'webhook', enabled: true, config: {} },
      sampleEvent,
    )
    expect(r.ok).toBe(false)
  })

  it('未知类型报错', async () => {
    const r = await sendToChannel(
      { id: 'x', name: 'x', type: 'nope', enabled: true, config: {} },
      sampleEvent,
    )
    expect(r.ok).toBe(false)
    expect(String(r.error)).toContain('未知')
  })
})
