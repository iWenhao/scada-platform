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
  keyProblem,
  assertKey,
  listKeys,
  readValue,
  readValueWithEtag,
  removeValue,
  scopeDir,
  scopeOf,
  writeValue,
  writeValueIfAbsent,
  writeValueIfMatch,
  statEtag,
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

describe('keyProblem / assertKey', () => {
  it('空键与 NUL 字节直接拒绝，归类成机器码而不是文案', () => {
    expect(keyProblem('')).toBe('missing')
    expect(keyProblem(undefined)).toBe('missing')
    expect(keyProblem('a\0b')).toBe('invalid')
  })

  it('长度按编码后计算，中文键膨胀 9 倍同样受限', () => {
    // 一个汉字 encodeURIComponent 后是 9 个字符（泵 → %E6%B3%B5）
    expect(keyProblem('泵'.repeat(22))).toBeNull()
    expect(keyProblem('泵'.repeat(23))).toBe('too_long')
    expect(MAX_KEY_LENGTH).toBe(200)
  })

  it('恰好卡在编码后上限的 ASCII 键仍然放行', () => {
    expect(keyProblem('k'.repeat(MAX_KEY_LENGTH))).toBeNull()
    expect(keyProblem('k'.repeat(MAX_KEY_LENGTH + 1))).toBe('too_long')
  })

  it('assertKey 抛 400 invalid_key：超长键由此拦成 400，不让 fs 抛 ENAMETOOLONG 变 500', () => {
    expect(() => assertKey('')).toThrowError(
      expect.objectContaining({ status: 400, code: 'invalid_key', message: '缺少 key 参数' }),
    )
    expect(() => assertKey('泵'.repeat(23))).toThrowError(
      expect.objectContaining({ code: 'invalid_key', message: expect.stringContaining('过长') }),
    )
    expect(() => assertKey('scada_project_测试')).not.toThrow()
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

describe('writeValueIfMatch（乐观并发）', () => {
  const etagScope = 'u/if-match/'

  it('etag 匹配时写入成功，且新 etag 与旧值不同', async () => {
    await writeValue(dataDir, 'doc', etagScope, 'v1')
    const before = await readValueWithEtag(dataDir, 'doc', etagScope)
    expect(before.etag).not.toBeNull()

    await writeValueIfMatch(dataDir, 'doc', etagScope, 'v2', before.etag)
    const after = await readValueWithEtag(dataDir, 'doc', etagScope)
    expect(after.value).toBe('v2')
    // 写入会刷新 mtime，etag 必然推进
    expect(after.etag).not.toBe(before.etag)
  })

  it('etag 不匹配时抛 EVERSION 且不覆盖旧值', async () => {
    await writeValue(dataDir, 'stale-doc', etagScope, 'v1')
    const real = await readValueWithEtag(dataDir, 'stale-doc', etagScope)
    // 另一会话已写过一次，把 etag 推到 v2
    await writeValueIfMatch(dataDir, 'stale-doc', etagScope, 'v2', real.etag)
    const staleEtag = real.etag

    // 第一个会话拿旧 etag 再写：必须被拒，且 v2 原样保留
    await expect(
      writeValueIfMatch(dataDir, 'stale-doc', etagScope, 'v3', staleEtag),
    ).rejects.toMatchObject({ code: 'EVERSION' })
    expect(await readValue(dataDir, 'stale-doc', etagScope)).toBe('v2')
  })

  it('etag 为空串/空值时跳过检查，等同普通 writeValue（发布/草稿路径）', async () => {
    await writeValue(dataDir, 'no-check', etagScope, 'old')
    await writeValueIfMatch(dataDir, 'no-check', etagScope, 'new', '')
    expect(await readValue(dataDir, 'no-check', etagScope)).toBe('new')
    await writeValueIfMatch(dataDir, 'no-check', etagScope, 'newer', null)
    expect(await readValue(dataDir, 'no-check', etagScope)).toBe('newer')
  })

  it('目标不存在而带非空 etag：也视为版本过期（客户端以为存在，实际已被删）', async () => {
    await expect(
      writeValueIfMatch(dataDir, 'missing', etagScope, 'x', '0.123'),
    ).rejects.toMatchObject({ code: 'EVERSION' })
  })

  it('statEtag 返回当前文件版本，文件刚被删时为 null', async () => {
    await writeValue(dataDir, 'stat', etagScope, 'x')
    const e = await statEtag(dataDir, 'stat', etagScope)
    expect(typeof e).toBe('string')
    expect(Number.isNaN(Number(e))).toBe(false)
    await removeValue(dataDir, 'stat', etagScope)
    expect(await statEtag(dataDir, 'stat', etagScope)).toBeNull()
  })
})
