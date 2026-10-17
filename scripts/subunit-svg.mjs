/**
 * 素材 SVG 的规范化与自检（import-subunit-assets.mjs 的纯函数层）。
 *
 * 单独成文件的唯一原因：主脚本要保持在 400 行门槛内（此前把预览模板拆成
 * subunit-preview.mjs 是同一个理由）。这里全是字符串进字符串出的纯函数，
 * 不碰文件系统，单测可直接 import。
 *
 * 规范化要解决的问题见 import-subunit-assets.mjs 的文件头注释，此处只留与实现
 * 强相关的「为什么」。
 */
/** 素材统一的主题色：所有随状态变色的形状都用它 */
export const THEME_COLOR = '#57A9FB'

/** 该矩形是不是「不可见底衬」：带 opacity，且没有任何可见的 fill/stroke 颜色 */
function isInvisiblePlate(openTag) {
  return /\sopacity="/.test(openTag) && !/\s(?:fill|stroke)="#/.test(openTag)
}

/**
 * 收集所有被同文档引用的 id（`url(#x)` 与 `href="#x"` 两种写法）。
 *
 * stripInvisiblePlates / normalizeIds 都要靠这份集合判断哪些 id 是活的——两边各写一份
 * 正则迟早漏一种写法（漏了的那次就是磁选机的 `xlink:href`）。
 */
export function referencedIds(svg) {
  return new Set([
    ...[...svg.matchAll(/url\(#([^)"']+)\)/g)].map((m) => m[1]),
    ...[...svg.matchAll(/(?:xlink:)?href="#([^"]+)"/g)].map((m) => m[1]),
  ])
}

/**
 * 删除不可见底衬矩形；自闭合与成对闭合两种写法都覆盖，只删开标签会留下孤立的 </rect>。
 *
 * @param keepIds 被同文档引用的 id（见 referencedIds）。这些元素**绝不能删**：磁选机的
 *   mask 靠 `<use href="#path-1">` 拼出通版，而那个 `path-1` 恰好是一个只带 opacity、
 *   没有实色 fill 的 rect，正合剥离条件——早年它与整幅底衬一起被删，mask 变空，整台
 *   设备被完全裁掉，画布上同样是「啥也没有」。
 */
export function stripInvisiblePlates(svg, keepIds = new Set()) {
  const isKept = (tag) => {
    const m = tag.match(/\sid="([^"]*)"/)
    return !!m && keepIds.has(m[1])
  }
  return svg
    .replace(/<rect\b[^>]*\/>/g, (tag) => (isKept(tag) || !isInvisiblePlate(tag) ? tag : ''))
    .replace(/<rect\b[^>]*>[\s\S]*?<\/rect>/g, (block) => {
      const open = block.slice(0, block.indexOf('>') + 1)
      return isKept(open) || !isInvisiblePlate(open) ? block : ''
    })
}

/**
 * 去掉根 `<svg>` 上的固有像素尺寸（width/height），只留 viewBox。
 *
 * 为什么必须去：组件库是把 `ComponentDefinition.icon` 用 `v-html` 直接注入一个
 * 30×30 的格子里（见 ComponentPanel.vue）。手写图元一律只有 `viewBox`、不带宽高，
 * SVG 便按容器缩放；而素材文件的根标签带着源文件的固有尺寸（`width="937px"
 * height="367px"`、`width="28px" height="36px"` 等），注入后各按自己的大小渲染，
 * 30×30 的格子立刻失控——这是「导入组件在左侧库显示大小不一」的根因。
 *
 * 去掉是安全的：其余消费方都不看这两个属性——
 * - 画布渲染走 `iconBounds.buildTightSvg()`，它本来就会先清掉再按内容包围盒重写；
 * - `getIconBounds()` / `iconFrameOf()` 用 getBBox()，与宽高属性无关；
 * - 核对页自己实现了同一套收紧逻辑。
 */
export function stripIntrinsicSize(svg) {
  // 不能锚定 ^：去掉 XML 声明后字符串开头会残留 \r\n，行首锚点直接失效
  //（实测 121 个图元一个都没剥掉，而 v-html 照旧按固有尺寸渲染）。
  // 取第一个 <svg> 标签即根标签——这些素材里没有嵌套 <svg>。
  const m = svg.match(/<svg\b[^>]*>/i)
  if (!m) return svg
  const open = m[0].replace(/\s+width="[^"]*"/i, '').replace(/\s+height="[^"]*"/i, '')
  return open === m[0] ? svg : svg.replace(m[0], open)
}

/**
 * 处理素材里的 `id`：只有被 `url(#x)` 引用的才留下，其余照旧删除；留下的统一加前缀。
 *
 * 为什么不能再一把删光：Sketch 导出的 `<defs>` 里 `<linearGradient id="linearGradient-1">`
 * 和图层名 `<g id="图标">` 用的是同一个属性，早先的 `replace(/\s+id="[^"]*"/g, '')` 把
 * 两者一起删了，于是所有 `fill="url(#linearGradient-1)"` 都指向不存在的 paint server——
 * 浏览器解析失败即视为 none，图元整张透明。标题一 / 标题二拖到画布上一片空白就是这么
 * 来的：它们的可见部分全是渐变，没有实色描边兜底，一点都剩不下。同理 `mask="url(#x)"`
 * 悬空会让整个 <g> 被裁空。
 *
 * 为什么要加前缀：组件面板把这些图标用 `v-html` 注入同一个文档，多张图元若都叫
 * `linearGradient-1`，同 id 只有第一个生效，其余图元的取色会被顶掉。
 *
 * @param prefix 唯一前缀（一般用 manifest 的 type key）；传空串表示不改名字、只做清理
 */
export function normalizeIds(svg, prefix) {
  // 「被引用」有三种写法，漏任何一种都会留下悬空引用：`url(#x)` 是 paint server 与
  // mask/clipPath，`href="#x"` / `xlink:href="#x"` 是 `<use>`（磁选机的 mask 就是
  // 拿 `<use>` 拼出来的，当年只认 `url(#x)` 时它照样整块透明）。
  const refs = referencedIds(svg)
  if (!refs.size) return svg.replace(/\s+id="[^"]*"/g, '')
  const kept = svg.replace(/\s+id="([^"]*)"/g, (whole, id) => (refs.has(id) ? whole : ''))
  if (!prefix) return kept
  const renamed = new Map([...refs].map((id) => [id, `${prefix}-${id}`]))
  return kept
    .replace(/\s+id="([^"]*)"/g, (whole, id) => (renamed.has(id) ? ` id="${renamed.get(id)}"` : whole))
    .replace(/url\(#([^)"']+)\)/g, (whole, id) => (renamed.has(id) ? `url(#${renamed.get(id)})` : whole))
    // href 同样要同步：<use> 引用的 id 若不同步改名，引用就断了
    .replace(/((?:xlink:)?href="#)([^"]+)(")/g, (whole, head, id, tail) =>
      renamed.has(id) ? `${head}${renamed.get(id)}${tail}` : whole,
    )
}

/** 规范化单个素材 SVG（五步见主脚本文件头；`idPrefix` 见 normalizeIds） */
export function normalizeSvg(raw, idPrefix = '') {
  let s = raw
  s = s.replace(/<\?xml[^>]*\?>/gi, '')
  s = s.replace(/<title>[\s\S]*?<\/title>/gi, '')
  s = s.replace(/<desc>[\s\S]*?<\/desc>/gi, '')
  s = normalizeIds(s, idPrefix)
  s = s.replace(/\s+version="[^"]*"/g, '')
  s = s.replace(/\s+xmlns:xlink="[^"]*"/g, '')
  // `xlink:href` 依赖命名空间声明，而上面刚好把 `xmlns:xlink` 删了：文档没有这个前缀
  // 的绑定，浏览器就不认这个属性，`<use>` 落空、mask 变空。SVG2 的 `href` 不需要命名
  // 空间，现代浏览器通吃，统一转成它。
  s = s.split('xlink:href=').join('href=')
  // 顺序有讲究：先按「是否被引用」算出 keepIds 再剥底衬，否则被 <use> 拼进 mask 的
  // rect 会被当成隐形底衬删掉（见 stripInvisiblePlates 注释）
  s = stripInvisiblePlates(s, referencedIds(s))
  s = stripIntrinsicSize(s)
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
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? ''
  if (/\swidth="/i.test(root)) issues.push('root <svg> still carries width')
  if (/\sheight="/i.test(root)) issues.push('root <svg> still carries height')
  // 悬空引用：`url(#x)` 找不到同文档的 `id="x"` 时，渐变/mask 解析失败即当作 none，
  // 图元整块消失且控制台一声不响（见 normalizeIds）。这条是当年故障唯一能拦住的检查。
  const dangling = new Set(
    [
      ...[...svg.matchAll(/url\(#([^)"']+)\)/g)].map((m) => m[1]),
      ...[...svg.matchAll(/(?:xlink:)?href="#([^"]+)"/g)].map((m) => m[1]),
    ].filter((id) => !svg.includes(`id="${id}"`)),
  )
  for (const id of dangling) issues.push(`dangling reference url(#${id})`)
  return issues
}
