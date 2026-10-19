// @vitest-environment node
/**
 * 键值存储的路径隔离与键名校验。
 * 这一层是「一个用户的 key 能不能写到别人的目录/数据目录外面」的唯一防线，
 * 所以断言集中在最终落盘的物理路径上，而不是 fileFor 返回的字符串。
 */
import { mkdtemp, rm, writeFile, mkdir, readdir } from 'node:fs/promises'
// 与 lib/kv.mjs 取同一个 promises 对象，spyOn 才能作用到它实际调用的 fs.rm
import { promises as fsPromises } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  GLOBAL_SCOPE,
  MAX_KEY_LENGTH,
  fileFor,
  keyError,
  listKeys,
  readValue,
  removeValue,
  scopeDir,
  scopeOf,
  writeValue,
  writeValueIfAbsent,
} from './kv.mjs'

let dataDir = ''
/** 每个用例自己的命名空间，避免相互串数据 */
const scope = 'u/tester/'

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'scada-kv-'))
})
afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true })
})

describe('scopeOf', () => {
  it('未登录、主密钥、普通用户分别落在三个命名空间', () => {
    expect(scopeOf(null)).toBe('u/anonymous/')
    expect(scopeOf({ master: true })).toBe('u/service/')
    expect(scopeOf({ master: false, user: { id: 'usr_1' } })).toBe('u/usr_1/')
  })

  it('用户 id 里的路径分隔符被编码，不能凭 id 逃出命名空间', () => {
    const s = scopeOf({ user: { id: '../../etc' } })
    expect(s).toBe('u/..%2F..%2Fetc/')
    // 编码后的目录名仍是 dataDir 的直接子项
    expect(path.dirname(fileFor(dataDir, 'k', s))).toBe(path.join(dataDir, 'u/..%2F..%2Fetc'))
  })
})

describe('keyError', () => {
  it('空键与 NUL 字节直接拒绝', () => {
    expect(keyError('')).toContain('missing')
    expect(keyError(undefined)).toContain('missing')
    expect(keyError('a\0b')).toBe('invalid key')
  })

  it('长度按编码后计算，中文键膨胀 9 倍同样受限', () => {
    // 一个汉字 encodeURIComponent 后是 9 个字符（泵 → %E6%B3%B5）
    expect(keyError('泵'.repeat(22))).toBeNull()
    expect(keyError('泵'.repeat(23))).toContain('too long')
    expect(MAX_KEY_LENGTH).toBe(200)
  })

  it('恰好卡在编码后上限的 ASCII 键仍然放行', () => {
    expect(keyError('k'.repeat(MAX_KEY_LENGTH))).toBeNull()
    expect(keyError('k'.repeat(MAX_KEY_LENGTH + 1))).toContain('too long')
  })
})

describe('物理路径隔离', () => {
  it('key 里的 ../ 与绝对路径片段被编码成文件名，写不出 dataDir 之外', async () => {
    const evil = '../../../../escaped.json'
    await writeValue(dataDir, evil, scope, '"x"')

    const target = fileFor(dataDir, evil, scope)
    // 真正决定能否逃逸的是解析后的绝对路径必须仍在命名空间目录内
    expect(path.resolve(target).startsWith(path.resolve(scopeDir(dataDir, scope)))).toBe(true)
    const written = await readdir(scopeDir(dataDir, scope))
    expect(written).toContain(encodeURIComponent(evil) + '.json')
    expect(written.some(f => f.includes('/') || f.includes('\\'))).toBe(false)
    // 逃逸未成功：dataDir 根下没有多出 escaped.json，别的命名空间也读不到这个 key
    expect(await readdir(dataDir)).not.toContain('escaped.json')
    expect(await readValue(dataDir, evil, 'u/other/')).toBeNull()
  })

  it('key 为 .. 时因为固定追加 .json 后缀，只会得到同目录下的怪文件名', async () => {
    await writeValue(dataDir, '..', scope, '"x"')
    const written = await readdir(scopeDir(dataDir, scope))
    expect(written).toContain('...json')
    expect(await readValue(dataDir, '..', scope)).toBe('"x"')
  })

  it('两个用户的同名 key 互不可见', async () => {
    await writeValue(dataDir, 'project:demo', 'u/alice/', '"alice"')
    await writeValue(dataDir, 'project:demo', 'u/bob/', '"bob"')
    expect(await readValue(dataDir, 'project:demo', 'u/alice/')).toBe('"alice"')
    expect(await readValue(dataDir, 'project:demo', 'u/bob/')).toBe('"bob"')
    expect(await listKeys(dataDir, 'u/alice/')).toContain('project:demo')
    expect(await readdir(scopeDir(dataDir, 'u/alice/'))).toEqual(
      await readdir(scopeDir(dataDir, 'u/bob/')),
    )
  })

  it('全局命名空间与用户命名空间物理分开', () => {
    expect(GLOBAL_SCOPE).toBe('u/global/')
    expect(scopeDir(dataDir, GLOBAL_SCOPE)).toBe(path.join(dataDir, 'u/global/'))
  })
})

describe('listKeys / readValue / removeValue', () => {
  const listScope = 'u/listing/'

  it('枚举时解码键名，并忽略非 .json 文件与空目录', async () => {
    await writeValue(dataDir, 'site:branding', listScope, '{}')
    await writeValue(dataDir, '水泵', listScope, '{}')
    await mkdir(scopeDir(dataDir, listScope), { recursive: true })
    await writeFile(path.join(scopeDir(dataDir, listScope), 'stray.txt'), 'x')

    const keys = await listKeys(dataDir, listScope)
    expect(keys.sort()).toEqual(['site:branding', '水泵'].sort())
    expect(await listKeys(dataDir, 'u/not-exist/')).toEqual([])
  })

  it('删不存在的键不该抛错（removeValue 用 force: true）', async () => {
    expect(await readValue(dataDir, 'gone', listScope)).toBeNull()
    await writeValue(dataDir, 'gone', listScope, '"v"')
    await removeValue(dataDir, 'gone', listScope)
    expect(await readValue(dataDir, 'gone', listScope)).toBeNull()
    await expect(removeValue(dataDir, 'never-existed', listScope)).resolves.toBeUndefined()
  })

  it('删除撞 Windows 瞬时占用时重试到成功，而不是回一条 500', async () => {
    // 真实场景：自动草稿每 30 秒重写，正式保存后紧接着删，句柄还没释放 → EPERM
    await writeValue(dataDir, 'draft', listScope, '{"v":1}')
    const real = fsPromises.rm
    const rmSpy = vi.spyOn(fsPromises, 'rm')
    let calls = 0
    rmSpy.mockImplementation((async (target, opts) => {
      calls += 1
      if (calls === 1) {
        throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
      }
      return real(target, opts)
    }) as typeof fsPromises.rm)

    try {
      await expect(removeValue(dataDir, 'draft', listScope)).resolves.toBeUndefined()
      expect(calls).toBe(2)
      expect(await readValue(dataDir, 'draft', listScope)).toBeNull()
    } finally {
      rmSpy.mockRestore()
    }
  })

  it('写入是原子的：过程文件不残留', async () => {
    await writeValue(dataDir, 'atomic', listScope, '"1"')
    const files = await readdir(scopeDir(dataDir, listScope))
    // 临时文件名形如 <key>.json.<pid>.<ts>.tmp（见 lib/atomicWrite.mjs），rename 后不该留下
    expect(files.filter(f => f.startsWith('.') && f.endsWith('.tmp'))).toEqual([])
  })
})

describe('writeValueIfAbsent（仅不存在时创建）', () => {
  const absScope = 'u/if-absent/'

  it('目标不存在时写入成功', async () => {
    await writeValueIfAbsent(dataDir, 'fresh', absScope, '"new"')
    expect(await readValue(dataDir, 'fresh', absScope)).toBe('"new"')
  })

  it('目标已存在时抛 EEXIST 且不覆盖旧值', async () => {
    await writeValue(dataDir, 'taken', absScope, '"old"')
    await expect(writeValueIfAbsent(dataDir, 'taken', absScope, '"new"')).rejects.toMatchObject({
      code: 'EEXIST',
    })
    // 关键：冲突后旧数据原样保留，不是先覆盖再报错
    expect(await readValue(dataDir, 'taken', absScope)).toBe('"old"')
  })

  it('两个并发 create 同名只有一个成功，另一个拿 EEXIST', async () => {
    // 消掉前端 read-check-write 竞态的落点：判重在同路径串行槽内、rename 之前完成
    const results = await Promise.allSettled([
      writeValueIfAbsent(dataDir, 'race', absScope, '"A"'),
      writeValueIfAbsent(dataDir, 'race', absScope, '"B"'),
    ])
    const fulfilled = results.filter(r => r.status === 'fulfilled')
    const rejected = results.filter(
      r => r.status === 'rejected' && (r.reason as { code?: string }).code === 'EEXIST',
    )
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    // 最终值是两个竞争写入之一，且没被半途写坏
    expect(['"A"', '"B"']).toContain(await readValue(dataDir, 'race', absScope))
  })
})
