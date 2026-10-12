/**
 * 图元素材导入工具：把外部组态产品的 SVG 图元库规范化为本项目可用的图标字符串。
 *
 * 为什么需要规范化：本项目图元的唯一形态是内联 SVG 字符串（`ComponentDefinition.icon`），
 * 颜色必须走 `currentColor`（渲染时由 core/canvas/iconImage.ts 做单色替换），viewBox 由
 * core/canvas/iconBounds.ts 的 `buildTightSvg()` 按内容包围盒自动重写。而素材是另一套
 * 产品导出的（Sketch 风格：带 XML 声明、`<title>`、`id`、隐形整幅底矩形、统一主题色
 * `#57A9FB`），直接内联会有三个问题：颜色不随状态变、隐形底矩形污染包围盒测量、体积偏大。
 *
 * 规范化四步：
 *   1. 去掉 XML 声明 / `<title>` / `<desc>` / `id` / `version` / `xmlns:xlink`——渲染无用；
 *   2. 去掉「带 opacity 但无任何可见 fill/stroke」的整幅底矩形——它不可见，却会进入
 *      `getBBox()`，让 buildTightSvg 拿到整幅方形包围盒，内容收紧整体失效；
 *   3. 主题色 → `currentColor`——不替换则状态变色对它无效（会恒定显示素材自带的蓝色）；
 *   4. 压成单行，减小内联体积。
 *
 * 刻意不处理 `transform`：素材里成对出现的 `translate(-x,-y)` / `translate(x,y)` 互相
 * 抵消，而残留偏移会被 `getBBox()` 正确计入并由 buildTightSvg 重写进 viewBox——手工清
 * transform 反而容易把真实几何偏移一并删掉。非主题色（如指示灯绿、火焰红）同样保留，
 * 它们承载语义且不会被状态色覆盖。
 *
 * 用法（素材目录在本机、未纳入本仓库，须显式传入）：
 *   node scripts/import-subunit-assets.mjs --src <素材根目录> --scan [--report <md路径>]
 *   node scripts/import-subunit-assets.mjs --src <素材根目录> --emit <系统键名>
 *   node scripts/import-subunit-assets.mjs --src <素材根目录> --preview <系统键名> --out <html>
 *
 * 素材清单（type ↔ 源文件 ↔ 面板名称的溯源记录）见 scripts/subunit-manifest.json。
 * 输出文件的行尾跟随仓库约定：源码 .ts 用 CRLF，脚本目录用 LF。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderPreviewPage } from './subunit-preview.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const MANIFEST_PATH = join(HERE, 'subunit-manifest.json')

/** 素材统一的主题色：所有随状态变色的形状都用它 */
export const THEME_COLOR = '#57A9FB'

const GENERATED_HEADER = `/**
 * 本文件由 scripts/import-subunit-assets.mjs 生成，请勿手工编辑。
 *
 * 源素材：外部组态产品的 subUnit 图元库，溯源记录见 scripts/subunit-manifest.json。
 * 图标形态为单色线条稿（stroke = currentColor），不含 \`data-face\` 标注，因此
 * core/canvas/faceLighting.ts 的 styleIcon() 会原样放行——2D 与 2.5D 下外观一致，
 * 与已迁移的面基图元共存。
 *
 * 重新生成：node scripts/import-subunit-assets.mjs --src <素材根目录> --emit <系统键名>
 */`

/** 递归收集指定扩展名的文件，返回相对 base 的 posix 风格路径 */
function walk(dir, ext, base = dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, ext, base, acc)
    else if (name.toLowerCase().endsWith(ext)) acc.push(relative(base, full).split('\\').join('/'))
  }
  return acc
}

/** 该矩形是不是「不可见底衬」：带 opacity，且没有任何可见的 fill/stroke 颜色 */
function isInvisiblePlate(openTag) {
  return /\sopacity="/.test(openTag) && !/\s(?:fill|stroke)="#/.test(openTag)
}

/** 删除不可见底衬矩形；自闭合与成对闭合两种写法都覆盖，只删开标签会留下孤立的 </rect> */
export function stripInvisiblePlates(svg) {
  return svg
    .replace(/<rect\b[^>]*\/>/g, (tag) => (isInvisiblePlate(tag) ? '' : tag))
    .replace(/<rect\b[^>]*>[\s\S]*?<\/rect>/g, (block) => {
      const open = block.slice(0, block.indexOf('>') + 1)
      return isInvisiblePlate(open) ? '' : block
    })
}

/** 规范化单个素材 SVG（见文件头注释的四步） */
export function normalizeSvg(raw) {
  let s = raw
  s = s.replace(/<\?xml[^>]*\?>/gi, '')
  s = s.replace(/<title>[\s\S]*?<\/title>/gi, '')
  s = s.replace(/<desc>[\s\S]*?<\/desc>/gi, '')
  s = s.replace(/\s+id="[^"]*"/g, '')
  s = s.replace(/\s+version="[^"]*"/g, '')
  s = s.replace(/\s+xmlns:xlink="[^"]*"/g, '')
  s = stripInvisiblePlates(s)
  s = s.split(THEME_COLOR).join('currentColor')
  return s.replace(/\s+/g, ' ').replace(/\s+</g, '<').replace(/>\s+/g, '>').trim()
}

/** 规范化结果自检；返回问题列表（空数组 = 通过） */
export function validateSvg(svg, raw = '') {
  const issues = []
  if (!/^<svg\b/.test(svg)) issues.push('does not start with <svg')
  if (!/<\/svg>$/.test(svg)) issues.push('does not end with </svg>')
  if (raw.includes(THEME_COLOR) && !svg.includes('currentColor')) issues.push('theme color not replaced')
  const open = (svg.match(/<rect\b/g) || []).length
  const close = (svg.match(/<\/rect>/g) || []).length
  const selfClosed = (svg.match(/<rect\b[^>]*\/>/g) || []).length
  if (open !== close + selfClosed) {
    issues.push(`rect tags unbalanced open=${open} close=${close} self=${selfClosed}`)
  }
  if (/<style/i.test(svg)) issues.push('contains <style> (may override recoloring)')
  return issues
}

/** 转义为 TS 模板字符串安全的字面量 */
function escapeForTemplate(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function toCrlf(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) throw new Error(`manifest not found: ${MANIFEST_PATH}`)
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
}

function scan(srcRoot) {
  const svgs = walk(srcRoot, '.svg')
  const pngs = walk(srcRoot, '.png')
  const colors = new Map()
  const styleFiles = []
  const nonThemeFiles = []
  const plateFiles = []
  const issues = []
  for (const rel of svgs) {
    const raw = readFileSync(join(srcRoot, rel), 'utf8')
    for (const m of raw.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,8})"/g)) {
      const key = m[1].toUpperCase()
      colors.set(key, (colors.get(key) || 0) + 1)
    }
    if (/<style/i.test(raw)) styleFiles.push(rel)
    const withoutTheme = raw.split(THEME_COLOR).join('').replace(/#57A9FB/gi, '')
    if (/(?:fill|stroke)="#[0-9A-Fa-f]{6}"/.test(withoutTheme)) nonThemeFiles.push(rel)
    if (stripInvisiblePlates(raw) !== raw) plateFiles.push(rel)
    const out = normalizeSvg(raw)
    const v = validateSvg(out, raw)
    if (v.length) issues.push(`${rel}: ${v.join('; ')}`)
  }
  return { svgs, pngs, colors, styleFiles, nonThemeFiles, plateFiles, issues }
}

function runScan(srcRoot, reportPath) {
  const r = scan(srcRoot)
  const colorLines = [...r.colors.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `  ${c} x${n}`)
  console.log(`src            : ${srcRoot}`)
  console.log(`svg files      : ${r.svgs.length}`)
  console.log(`png files      : ${r.pngs.length}`)
  console.log(`style files    : ${r.styleFiles.length}`)
  console.log(`non-theme files: ${r.nonThemeFiles.length}`)
  console.log(`plate-stripped : ${r.plateFiles.length}`)
  console.log(`issues         : ${r.issues.length}`)
  console.log('colors (top 12):')
  console.log(colorLines.slice(0, 12).join('\n'))

  const mf = readManifest()
  const missing = []
  for (const [sysKey, sys] of Object.entries(mf.systems || {})) {
    for (const e of sys.entries) {
      if (!existsSync(join(srcRoot, e.src))) missing.push(`${sysKey}/${e.key} -> ${e.src}`)
    }
  }
  console.log(`manifest missing: ${missing.length}`)

  if (reportPath) {
    const lines = [
      '# subUnit 素材扫描报告',
      '',
      `- 素材根目录：\`${srcRoot}\``,
      `- SVG：${r.svgs.length} 个；PNG：${r.pngs.length} 个`,
      `- 含 \`<style>\`：${r.styleFiles.length} 个`,
      `- 含非主题色：${r.nonThemeFiles.length} 个`,
      `- 命中隐形底衬矩形：${r.plateFiles.length} 个`,
      '',
      '## 颜色清单',
      '',
      ...colorLines,
      '',
      '## 含 <style> 的文件',
      '',
      ...(r.styleFiles.length ? r.styleFiles.map((f) => `- ${f}`) : ['（无）']),
      '',
      '## 含非主题色的文件',
      '',
      ...(r.nonThemeFiles.length ? r.nonThemeFiles.map((f) => `- ${f}`) : ['（无）']),
      '',
      '## 规范化自检问题',
      '',
      ...(r.issues.length ? r.issues.map((f) => `- ${f}`) : ['（无）']),
      '',
      '## 清单缺失项',
      '',
      ...(missing.length ? missing.map((f) => `- ${f}`) : ['（无）']),
      '',
    ]
    writeFileSync(reportPath, toCrlf(lines.join('\n')), 'utf8')
    console.log(`report written : ${reportPath}`)
  }
  return r.issues.length + missing.length === 0 ? 0 : 1
}

function runEmit(srcRoot, sysKey) {
  const mf = readManifest()
  const sys = (mf.systems || {})[sysKey]
  if (!sys) {
    throw new Error(`unknown system "${sysKey}"; known: ${Object.keys(mf.systems || {}).join(', ')}`)
  }
  const iconLines = []
  const metaLines = []
  const problems = []
  for (const e of sys.entries) {
    const file = join(srcRoot, e.src)
    if (!existsSync(file)) {
      problems.push(`${e.key}: source missing -> ${e.src}`)
      continue
    }
    for (const field of ['name', 'w', 'h']) {
      if (e[field] === undefined) problems.push(`${e.key}: manifest missing "${field}"`)
    }
    const raw = readFileSync(file, 'utf8')
    const svg = normalizeSvg(raw)
    const v = validateSvg(svg, raw)
    if (v.length) problems.push(`${e.key}: ${v.join('; ')}`)
    iconLines.push(`  ${e.key}: \`${escapeForTemplate(svg)}\`,`)
    metaLines.push(`  ${e.key}: { name: '${e.name}', width: ${e.w}, height: ${e.h} },`)
  }
  if (problems.length) {
    console.error('emit aborted, problems found:')
    problems.forEach((p) => console.error(`  ${p}`))
    return 1
  }
  const out = [
    GENERATED_HEADER,
    '',
    `export const ${sys.exportName}: Record<string, string> = {`,
    iconLines.join('\n'),
    '}',
    '',
    `export interface ${sys.metaTypeName} {`,
    '  name: string',
    '  width: number',
    '  height: number',
    '}',
    '',
    `export const ${sys.metaExportName}: Record<string, ${sys.metaTypeName}> = {`,
    metaLines.join('\n'),
    '}',
    '',
  ].join('\n')
  const outPath = join(REPO_ROOT, sys.outFile)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, toCrlf(out), 'utf8')
  console.log(`emitted ${iconLines.length} icons -> ${sys.outFile}`)
  return 0
}

function runPreview(srcRoot, sysKey, outPath) {
  const mf = readManifest()
  const sys = (mf.systems || {})[sysKey]
  if (!sys) throw new Error(`unknown system "${sysKey}"`)
  const icons = {}
  const meta = {}
  const order = []
  for (const e of sys.entries) {
    const raw = readFileSync(join(srcRoot, e.src), 'utf8')
    icons[e.key] = normalizeSvg(raw)
    meta[e.key] = { name: e.name, width: e.w, height: e.h }
    order.push(e.key)
  }
  const html = renderPreviewPage({
    title: `图元核对 · ${sys.label || sysKey}（${order.length} 台）`,
    subtitle:
      '本页在浏览器里真跑一次渲染管线：按内容包围盒收紧 viewBox，再做 currentColor 单色替换；' +
      '虚线框是元素默认尺寸，与拖入画布后的占位一致。',
    icons,
    meta,
    order,
  })
  writeFileSync(outPath, html, 'utf8')
  console.log(`preview written: ${outPath}`)
  return 0
}

function main(argv) {
  // 无值开关（--scan / --emit <key> 里的 --emit 有值）与带值参数要分开：
  // 早先写成 `argv[i+1]?.startsWith('--') ? true : argv[++i]`，开关位于参数末尾时
  // argv[i+1] 为 undefined，`undefined?.startsWith()` 得 undefined（假），
  // 于是把 argv[i+1]（也是 undefined）吃进去，开关变成假值，命令直接落到
  // "nothing to do"——而带 --report 的调用会侥幸跑通，问题被掩盖。
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) args[key] = true
    else args[key] = argv[++i]
  }
  const srcRoot = typeof args.src === 'string' ? resolve(args.src) : null
  if (!srcRoot) {
    console.error('usage: --src <素材根目录> (--scan [--report <md>] | --emit <系统键名>)')
    return 2
  }
  if (args.scan) return runScan(srcRoot, typeof args.report === 'string' ? resolve(args.report) : null)
  if (typeof args.emit === 'string') return runEmit(srcRoot, args.emit)
  if (typeof args.preview === 'string') {
    return runPreview(srcRoot, args.preview, resolve(typeof args.out === 'string' ? args.out : 'icon-preview.html'))
  }
  console.error('nothing to do: pass --scan, --emit <系统键名>, or --preview <系统键名> --out <html>')
  return 2
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)))
}
