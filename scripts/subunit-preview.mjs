/**
 * 图元核对页模板（供 scripts/import-subunit-assets.mjs 的 --preview 使用）。
 *
 * 页面里的 JS 是 core/canvas/iconBounds.ts 的 `measure()` / `buildTightSvg()` 与
 * core/canvas/iconImage.ts 的 currentColor 替换的**忠实移植**（在浏览器里真跑 getBBox），
 * 因此能暴露单测与类型检查都抓不到的问题：图元是否画得出来、内容包围盒收紧是否生效、
 * 状态变色是否真的改变线条颜色。拆成独立文件是为了让主脚本留在 400 行门槛以内。
 */

const PREVIEW_CSS = [
  'body{font:13px/1.6 system-ui,"Segoe UI",sans-serif;margin:0;padding:24px;background:#f5f6f8;color:#1f2329}',
  'h1{font-size:15px;font-weight:500;margin:0 0 6px}',
  '.meta{color:#646a73;margin:0 0 6px}',
  '.note{color:#8a8f99;font-size:12px;margin:0 0 18px}',
  '.row{display:flex;align-items:center;gap:18px;padding:12px 14px;background:#fff;border:1px solid #e5e6eb;border-radius:10px;margin-bottom:10px}',
  '.name{width:132px;flex:none}',
  '.name b{font-weight:500;display:block}',
  '.name span{color:#8a8f99;font-size:12px}',
  '.stage{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px}',
  '.stage em{font-style:normal;font-size:11px;color:#8a8f99}',
  '.box{border:1px dashed #d0d3d9;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fafbfc}',
  '.box img{max-width:100%;max-height:100%;display:block}',
  '.diag{margin-left:auto;font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#646a73;white-space:pre;text-align:right}',
  '.bad{color:#c92a2a}',
].join('')

/** 页面内联脚本：故意不用模板字符串，免得生成端要做多层转义 */
const PREVIEW_JS = [
  'var ICONS = __ICONS__;',
  'var META = __META__;',
  'var ORDER = __ORDER__;',
  'var STATES = [["默认", "#8fe6d3"], ["运行", "#00d4aa"], ["报警", "#ff4d4f"]];',
  'function maxStrokeWidth(svg){',
  '  var re = /stroke-width="([\\d.]+)"/g, m, max = 0;',
  '  while ((m = re.exec(svg)) !== null) { var v = parseFloat(m[1]); if (isFinite(v) && v > max) max = v; }',
  '  return max;',
  '}',
  'function measure(svg){',
  '  var host = document.createElement("div");',
  '  host.setAttribute("style", "position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden;visibility:hidden");',
  '  host.innerHTML = svg;',
  '  var el = host.firstElementChild;',
  '  if (!el || typeof el.getBBox !== "function") return null;',
  '  document.body.appendChild(host);',
  '  var b = el.getBBox();',
  '  document.body.removeChild(host);',
  '  if (!b || (!b.width && !b.height)) return null;',
  '  var pad = maxStrokeWidth(svg) / 2 + 0.5;',
  '  return { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };',
  '}',
  'function tighten(svg){',
  '  var b = measure(svg);',
  '  if (!b) return svg;',
  '  function r2(v) { return Math.round(v * 100) / 100; }',
  '  var x = r2(b.x), y = r2(b.y), w = r2(b.width), h = r2(b.height);',
  '  if (!(w > 0) || !(h > 0)) return svg;',
  '  var m = svg.match(/<svg\\b[^>]*>/i);',
  '  if (!m) return svg;',
  '  var long = Math.max(w, h);',
  '  var rw = Math.round(w / long * 512), rh = Math.round(h / long * 512);',
  '  var open = m[0].replace(/\\s+viewBox="[^"]*"/i, "").replace(/\\s+width="[^"]*"/i, "").replace(/\\s+height="[^"]*"/i, "");',
  '  open = open.replace(/^<svg/i, "<svg viewBox=\\"" + x + " " + y + " " + w + " " + h + "\\" width=\\"" + rw + "\\" height=\\"" + rh + "\\"");',
  '  return svg.replace(m[0], open);',
  '}',
  'function paint(svg, c) { return svg.split("currentColor").join(c); }',
  'function dataUri(s) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); }',
  'var grid = document.getElementById("grid");',
  'var ok = 0, bad = 0;',
  'ORDER.forEach(function (type) {',
  '  var raw = ICONS[type] || "";',
  '  var m = META[type] || { name: type, width: 100, height: 100 };',
  '  var bounds = measure(raw);',
  '  var tight = tighten(raw);',
  '  var row = document.createElement("div");',
  '  row.className = "row";',
  '  var name = document.createElement("div");',
  '  name.className = "name";',
  '  name.innerHTML = "<b></b><span></span>";',
  '  name.querySelector("b").textContent = m.name;',
  '  name.querySelector("span").textContent = type + " · " + m.width + "x" + m.height;',
  '  row.appendChild(name);',
  '  STATES.forEach(function (st) {',
  '    var stage = document.createElement("div");',
  '    stage.className = "stage";',
  '    var box = document.createElement("div");',
  '    box.className = "box";',
  '    box.style.width = m.width + "px";',
  '    box.style.height = m.height + "px";',
  '    var img = document.createElement("img");',
  '    img.src = dataUri(paint(tight, st[1]));',
  '    box.appendChild(img);',
  '    stage.appendChild(box);',
  '    var cap = document.createElement("em");',
  '    cap.textContent = st[0];',
  '    stage.appendChild(cap);',
  '    row.appendChild(stage);',
  '  });',
  '  var diag = document.createElement("div");',
  '  if (bounds) {',
  '    ok++;',
  '    diag.className = "diag";',
  '    diag.textContent = "内容包围盒 " + bounds.width.toFixed(1) + " x " + bounds.height.toFixed(1) + "\\n宽高比 " + (bounds.width / bounds.height).toFixed(2);',
  '  } else {',
  '    bad++;',
  '    diag.className = "diag bad";',
  '    diag.textContent = "getBBox 失败\\n退回方形适配";',
  '  }',
  '  row.appendChild(diag);',
  '  grid.appendChild(row);',
  '});',
  'var summary = document.getElementById("summary");',
  'summary.textContent = "测量成功 " + ok + " / " + ORDER.length + "，失败 " + bad;',
].join('\n')

/** `</` 一律转义，避免 SVG 里的结束标签把 script 块提前闭合 */
export function safeScriptJson(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/')
}

/**
 * 渲染整张核对页。
 *
 * @param {{ title: string, subtitle: string, icons: Record<string,string>,
 *           meta: Record<string,{name:string,width:number,height:number}>,
 *           order: string[] }} input
 * @returns {string} 完整 HTML
 */
export function renderPreviewPage({ title, subtitle, icons, meta, order }) {
  const script = PREVIEW_JS.replace('__ICONS__', safeScriptJson(icons))
    .replace('__META__', safeScriptJson(meta))
    .replace('__ORDER__', safeScriptJson(order))
  return [
    '<!doctype html>',
    '<html lang="zh-CN"><head><meta charset="utf-8">',
    `<title>${title}</title>`,
    `<style>${PREVIEW_CSS}</style></head><body>`,
    `<h1>${title}</h1>`,
    '<p class="meta" id="summary"></p>',
    `<p class="note">${subtitle}</p>`,
    '<div id="grid"></div>',
    `<script>${script}</script>`,
    '</body></html>',
  ].join('\n')
}
