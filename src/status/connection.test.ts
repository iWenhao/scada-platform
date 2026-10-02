import { describe, it, expect } from 'vitest'
import { connectionStatusView } from './connection'

describe('connectionStatusView', () => {
  it('三态映射：connected/error/其他', () => {
    expect(connectionStatusView('connected')).toEqual({
      text: '已连接',
      tagType: 'success',
      cls: 'ok',
    })
    expect(connectionStatusView('error')).toEqual({
      text: '连接错误',
      tagType: 'danger',
      cls: 'bad',
    })
    // connecting/disconnected 等一律归入「未连接」
    expect(connectionStatusView('connecting').text).toBe('未连接')
    expect(connectionStatusView('connecting').cls).toBe('warn')
    expect(connectionStatusView('disconnected').tagType).toBe('info')
  })
})
