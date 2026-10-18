<template>
  <div class="widget" :style="rootStyle">
    <!-- 进度条：绑定变量的当前值映射到 0~100% -->
    <div v-if="type === 'progress-bar'" class="wg-progress">
      <div class="wg-progress-track">
        <div class="wg-progress-fill" :style="fillStyle" />
      </div>
      <div class="wg-progress-text" :style="textStyle">{{ percentText }}</div>
    </div>

    <!-- 报表：表头 + 数据行，绑定变量按行优先填格 -->
    <div v-else-if="type === 'report-table'" class="wg-table-wrap">
      <table class="wg-table" :style="reportTableStyle">
        <colgroup>
          <col v-for="(w, i) in colWidths" :key="`w${i}`" :style="w ? { width: w } : null">
        </colgroup>
        <thead v-if="showHeader">
          <tr>
            <th
              v-for="(h, i) in headerCells"
              :key="`h${i}`"
              :style="reportCellStyle"
              :title="h"
            >{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in bodyRows" :key="`r${r}`">
            <td
              v-for="(c, i) in row"
              :key="`c${r}-${i}`"
              :style="reportCellStyle"
              :title="c"
            >{{ c }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 网格图：每格一个绑定变量，按阈值着色 -->
    <div v-else-if="type === 'grid-chart'" class="wg-grid" :style="gridStyle">
      <template v-if="gridCells.length">
        <div v-for="cell in gridCells" :key="cell.key" class="wg-grid-cell" :style="cellBoxStyle(cell)">
          <span class="wg-grid-name" :style="textStyle">{{ cell.name }}</span>
          <span class="wg-grid-value" :style="valueStyle(cell)">{{ cell.text }}</span>
        </div>
      </template>
      <!-- 一个绑定一格：没绑定就没有格子，而 Konva 侧又不画这类挂件的图标、
           名称条也被关掉，不占位的话元素在画布上完全隐形，只能靠盲选 -->
      <div v-else class="wg-grid-empty" :style="emptyStyle">
        <span :style="textStyle">未绑定数据</span>
        <span :style="emptyHintStyle">在「数据绑定」里添加变量，一个变量一格</span>
      </div>
    </div>

    <!-- 表格：变量名/数值/单位三列 + 客户端搜索过滤 -->
    <div v-else-if="type === 'filter-table'" class="wg-filter">
      <input
        v-model="keyword"
        class="wg-filter-input"
        :style="textStyle"
        placeholder="搜索名称…"
        :disabled="readonly"
      >
      <div class="wg-table-wrap">
        <table class="wg-table" :style="tableStyle">
          <thead>
            <tr>
              <th :style="cellStyle">名称</th>
              <th :style="cellStyle">数值</th>
              <th :style="cellStyle">单位</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.variable">
              <td :style="cellStyle">{{ row.variable }}</td>
              <td :style="cellStyle" :class="{ 'wg-alarm': row.alarm }">{{ row.text }}</td>
              <td :style="cellStyle">{{ row.unit }}</td>
            </tr>
            <tr v-if="!filteredRows.length">
              <td :style="cellStyle" colspan="3">无匹配项</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 日期 / 时间：本地实时走针 -->
    <div v-else-if="type === 'date' || type === 'clock'" class="wg-clock" :style="clockStyle">
      {{ clockText }}
    </div>

    <!-- 视频：HTML5 video，地址为空时给占位提示而不是空白 -->
    <div v-else-if="type === 'video'" class="wg-media">
      <video
        v-if="videoSrc"
        class="wg-media-el"
        :src="videoSrc"
        :controls="controls"
        :loop="loop"
        :muted="muted"
        :autoplay="autoplay"
      />
      <div v-else class="wg-media-empty" :style="textStyle">请在属性面板填写视频地址</div>
    </div>

    <!-- 网页：iframe；编辑态不给 pointer-events，否则画布拖拽会被吃掉 -->
    <div v-else-if="type === 'iframe'" class="wg-media">
      <iframe v-if="frameSrc" class="wg-media-el" :src="frameSrc" frameborder="0" />
      <div v-else class="wg-media-empty" :style="textStyle">请在属性面板填写网页地址</div>
    </div>

    <!-- 超文本：富文本，内容来自属性面板的 HTML 片段。
         与组件库图标注入同一信任模型——内容是用户在本工程里配的，不是外部输入。 -->
    <div v-else-if="type === 'super-text'" class="wg-rich" :style="richStyle" v-html="richHtml" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useDeviceStore } from '@/stores/deviceStore'
import type { ComponentInstance } from '@/types/scada'
import { formatCustom, formatDateTime, nextTickDelay, DEFAULT_CLOCK_FORMAT, DEFAULT_DATE_FORMAT } from './format'

/**
 * HTML 挂件层：图表之外的那些需要 DOM 的组件（进度条/报表/网格图/表格/
 * 日期/时间/视频/网页/超文本）都由这里渲染。
 *
 * 与 ChartElement 的分工：那边是 ECharts（canvas 渲染），这边是普通 DOM。
 * 两者都跑在画布的 HTML overlay 上，定位与缩放由覆盖层负责，本组件只关心
 * 「在给定尺寸内画出什么」。
 *
 * ⚠️ 所有字号/内边距都乘了 zoom：overlay 的容器尺寸是按 zoom 放大后的，
 * 但 CSS 的 px 不会跟着缩放，不乘的话缩小画布时字会相对变大。
 */

const props = defineProps<{
  element: ComponentInstance
  /** 画布缩放系数，用于把内部字号/间距换算成屏幕像素 */
  zoom: number
  /** 运行端（预览页）为 true：禁用搜索输入等交互，避免与只读定位冲突 */
  readonly?: boolean
}>()

const deviceStore = useDeviceStore()
const type = computed(() => props.element.type)

const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

/** 属性值统一取数入口，缺省值集中在一处 */
function prop(key: string, d: unknown = ''): unknown {
  const v = props.element.properties?.[key]
  return v === undefined || v === null || v === '' ? d : v
}

const z = computed(() => Math.max(props.zoom, 0.0001))

/* ---------- 通用样式 ---------- */

const rootStyle = computed(() => ({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  color: 'var(--accent-primary, #00d4aa)',
}))

const textStyle = computed(() => ({
  fontSize: `${num(prop('fontSize', 12), 12) * z.value}px`,
  lineHeight: 1.4,
}))

const tableStyle = computed(() => ({
  fontSize: `${num(prop('fontSize', 12), 12) * z.value}px`,
  borderCollapse: 'collapse' as const,
  width: '100%',
}))

const cellStyle = computed(() => ({
  border: `1px solid rgba(120,140,170,${0.28 * Math.min(z.value, 1) + 0.12})`,
  padding: `${4 * z.value}px ${6 * z.value}px`,
  textAlign: prop('align', 'left') as 'left' | 'center' | 'right',
  whiteSpace: 'nowrap' as const,
}))


const richStyle = computed(() => ({
  fontSize: `${num(prop('fontSize', 13), 13) * z.value}px`,
  lineHeight: 1.6,
  color: '#c8d4e2',
  overflow: 'auto',
  height: '100%',
  padding: `${6 * z.value}px`,
}))

/* ---------- 进度条 ---------- */

const percent = computed(() => {
  const raw = deviceStore.getDeviceData(props.element.deviceId || props.element.id)
  const v = num(raw[firstVariable()], 0)
  return Math.min(Math.max(v, 0), 100)
})

const percentText = computed(() => `${percent.value.toFixed(num(prop('decimals', 0), 0))}%`)

const fillStyle = computed(() => ({
  width: `${percent.value}%`,
  height: '100%',
  background: 'var(--accent-primary, #00d4aa)',
  transition: 'width 0.2s linear',
}))

/* ---------- 报表 ---------- */

const showHeader = computed(() => prop('showHeader', true) === true)
const columns = computed(() => Math.min(Math.max(num(prop('columns', 3), 3), 1), 12))
const rows = computed(() => Math.min(Math.max(num(prop('rows', 4), 4), 1), 50))

/** 报表的总行数（表头算一行） */
const reportRowCount = computed(() => rows.value + (showHeader.value ? 1 : 0))

/**
 * 报表行高：按元素高度均分，并夹在 32~64px。
 *
 * 为什么不用 `table { height: 100% }` 让浏览器自己分：实测 Chrome 会把多余空间
 * 全分给 tbody（默认 4 行 + 表头、容器 240px 时表头被压到 20px、数据行 55px），
 * 头重脚轻；tr 上写百分比高度同样无效。均分改成自己算反而可预期。
 * 夹上下限是防两端走形：元素拉到很高时行不会跟着无限长，缩得很小时由外层
 * `.wg-table-wrap` 的 overflow 出滚动条而不是把字挤没。
 */
const reportRowHeight = computed(() =>
  Math.min(Math.max(num(props.element.height, 240) / reportRowCount.value, 32), 80),
)

/**
 * 报表列宽：与列数一一对应，留空/非法值的列参与均分剩余宽度。
 *
 * `table-layout: fixed` 下唯一可控的列宽入口是 `<col>`（写在 td 上的 width
 * 会被内容挤动，fixed 布局只认第一行的宽度）；百分比列随表格宽度走，像素列
 * 要乘 zoom——DOM 容器尺寸已按 zoom 放大，CSS px 不会跟着缩放。
 */
const colWidths = computed<(string | null)[]>(() => {
  const raw = String(prop('widths', ''))
  const list = raw.split(/[,，|]/).map(s => s.trim())
  const out: (string | null)[] = []
  for (let i = 0; i < columns.value; i++) {
    const w = list[i]
    if (!w) {
      out.push(null)
      continue
    }
    if (/^\d+(\.\d+)?%$/.test(w)) {
      out.push(w)
      continue
    }
    const px = Number(w)
    out.push(Number.isFinite(px) && px > 0 ? `${px * z.value}px` : null)
  }
  return out
})

/** 表格最小宽度：像素列按实宽累加、未指定/百分比列按 56px 兜底，超出容器就滚动 */
const reportMinWidth = computed(() => {
  let sum = 0
  for (const w of colWidths.value) {
    if (w && w.endsWith('%')) continue
    sum += w ? parseFloat(w) : 56 * z.value
  }
  return `${sum}px`
})

/**
 * 报表专用表格样式（不与「表格」挂件共用：那个的行数随绑定变量变化，均分会
 * 让单变量时的一行占满全高）：
 * - `table-layout: fixed`：列宽不被内容长短牵着走，配合 `<col>` 才能按列控宽
 * - 不给 table 本身 height: 100%，高度由「行高 × 行数」自己控制（见 reportRowHeight）
 */
const reportTableStyle = computed(() => ({
  ...tableStyle.value,
  tableLayout: 'fixed' as const,
  minWidth: reportMinWidth.value,
}))

/** 报表单元格：在通用样式上补计算出来的行高、更宽松的内边距与超长省略 */
const reportCellStyle = computed(() => ({
  ...cellStyle.value,
  height: `${reportRowHeight.value * z.value}px`,
  padding: `${6 * z.value}px ${10 * z.value}px`,
  // 内容再长也不越界到邻格：超出部分末尾省略，完整内容挂在 title 上（预览端可悬停）
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}))

const headerCells = computed(() => {
  const raw = String(prop('headers', ''))
  const list = raw
    .split(/[,，|]/)
    .map(s => s.trim())
    .filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < columns.value; i++) out.push(list[i] ?? `列${i + 1}`)
  return out
})

/** 绑定变量按行优先铺进表格；不足的格子留空 */
const bodyRows = computed(() => {
  const data = deviceStore.getDeviceData(props.element.deviceId || props.element.id)
  const vars = (props.element.dataBindings ?? []).map(b => b.variable)
  const out: string[][] = []
  for (let r = 0; r < rows.value; r++) {
    const row: string[] = []
    for (let c = 0; c < columns.value; c++) {
      const v = vars[r * columns.value + c]
      row.push(v === undefined ? '' : formatValue(data[v]))
    }
    out.push(row)
  }
  return out
})

/* ---------- 网格图 ---------- */

const gridColumns = computed(() => Math.min(Math.max(num(prop('gridColumns', 4), 4), 1), 12))

const gridCells = computed(() => {
  const data = deviceStore.getDeviceData(props.element.deviceId || props.element.id)
  return (props.element.dataBindings ?? []).map((b, i) => {
    const v = num(data[b.variable], 0)
    return {
      key: `${b.variable}-${i}`,
      name: b.variable,
      value: v,
      text: formatValue(v),
      alarm: v > num(prop('alarmAbove', Infinity), Infinity),
    }
  })
})

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`,
  gap: `${4 * z.value}px`,
  height: '100%',
  alignContent: 'start',
}))

const cellBoxStyle = (cell: { alarm: boolean }) => ({
  border: `1px solid ${cell.alarm ? 'rgba(255,71,87,0.55)' : 'rgba(120,140,170,0.28)'}`,
  borderRadius: `${4 * z.value}px`,
  padding: `${4 * z.value}px ${6 * z.value}px`,
  background: cell.alarm ? 'rgba(255,71,87,0.12)' : 'rgba(120,140,170,0.08)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: `${2 * z.value}px`,
  minWidth: 0,
})

/** 空态：跨满整行并撑满容器，虚线框提示这里有个元素、但还没接数据 */
const emptyStyle = computed(() => ({
  gridColumn: '1 / -1',
  height: '100%',
  minHeight: `${40 * z.value}px`,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: `${4 * z.value}px`,
  padding: `${8 * z.value}px`,
  border: `${Math.max(1, 1 * Math.min(z.value, 1))}px dashed rgba(120,140,170,0.45)`,
  borderRadius: `${4 * z.value}px`,
  color: '#8a9bb0',
  textAlign: 'center' as const,
}))

const emptyHintStyle = computed(() => ({
  fontSize: `${Math.max(10, num(prop('fontSize', 12), 12) * z.value * 0.85)}px`,
  lineHeight: 1.4,
  opacity: 0.75,
}))

const valueStyle = (cell: { alarm: boolean }) => ({
  fontSize: `${num(prop('valueFontSize', 15), 15) * z.value}px`,
  fontWeight: 500,
  // 告警红与全局 --accent-danger 同源，避免 #ff4d4f / #ff4757 同义不同值
  color: cell.alarm ? 'var(--accent-danger, #ff4757)' : 'inherit',
})

/* ---------- 表格（带搜索） ---------- */

const keyword = ref('')

const filteredRows = computed(() => {
  const data = deviceStore.getDeviceData(props.element.deviceId || props.element.id)
  const kw = keyword.value.trim().toLowerCase()
  return (props.element.dataBindings ?? [])
    .map(b => {
      const v = num(data[b.variable], 0)
      return {
        variable: b.variable,
        value: v,
        text: formatValue(v),
        unit: String(prop('unit', '') ?? ''),
        alarm: v > num(prop('alarmAbove', Infinity), Infinity),
      }
    })
    .filter(r => !kw || r.variable.toLowerCase().includes(kw))
})

/* ---------- 日期 / 时间 ---------- */

const now = ref(new Date())
let timer: number | null = null

/** 格式缺省值与组件语义对应：日期组件缺省只显示日期，时间组件缺省只显示时刻 */
const formatId = computed(() =>
  prop('format', type.value === 'date' ? DEFAULT_DATE_FORMAT : DEFAULT_CLOCK_FORMAT),
)

/** 自定义模板非空时优先于预设：预设管快捷选择，模板管自由组合 */
const customTemplate = computed(() => String(prop('customFormat', '') ?? '').trim())

const clockText = computed(() =>
  customTemplate.value ? formatCustom(now.value, customTemplate.value) : formatDateTime(now.value, formatId.value),
)

const clockStyle = computed(() => ({
  fontSize: `${num(prop('fontSize', 24), 24) * z.value}px`,
  fontWeight: 500,
  fontVariantNumeric: 'tabular-nums',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  letterSpacing: `${1 * z.value}px`,
  // 长格式（日期时间/带农历）超出默认宽度时裁剪而不是换行，画面布局不被撑乱
  whiteSpace: 'nowrap',
}))

/* ---------- 视频 / 网页 / 超文本 ---------- */

const videoSrc = computed(() => String(prop('src', '') ?? ''))
const frameSrc = computed(() => String(prop('url', '') ?? ''))
const controls = computed(() => prop('controls', true) === true)
const loop = computed(() => prop('loop', false) === true)
const muted = computed(() => prop('muted', false) === true)
const autoplay = computed(() => prop('autoplay', false) === true)
const richHtml = computed(() => String(prop('html', '<p>富文本</p>') ?? '<p>富文本</p>'))

/* ---------- 工具 ---------- */

function firstVariable(): string {
  return props.element.dataBindings?.[0]?.variable ?? ''
}

function formatValue(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v ?? '')
  const d = num(prop('decimals', 1), 1)
  return d > 0 ? n.toFixed(d) : String(Math.round(n))
}

/** 按格式的最小显示单位对齐下一次刷新：秒级 1s、分级到分钟跳变、日级最多 30s 补刷 */
function scheduleTick() {
  timer = window.setTimeout(() => {
    now.value = new Date()
    scheduleTick()
  }, nextTickDelay(formatId.value, now.value, customTemplate.value))
}

function stopTick() {
  if (timer !== null) window.clearTimeout(timer)
  timer = null
}

onMounted(() => {
  // 日期/时间才需要走针；其余组件起定时器纯属浪费
  if (type.value !== 'date' && type.value !== 'clock') return
  scheduleTick()
})

// 格式或模板切换后旧的对齐点可能不再是合适的刷新节奏，立即重排
watch([formatId, customTemplate], () => {
  if (timer === null) return
  stopTick()
  scheduleTick()
})

onUnmounted(stopTick)
</script>

<style scoped lang="scss">
.widget {
  box-sizing: border-box;
}

.wg-progress {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  height: 100%;
  padding: 0 2px;

  &-track {
    height: 60%;
    min-height: 8px;
    background: rgba(120, 140, 170, 0.18);
    border-radius: 999px;
    overflow: hidden;
  }

  &-text {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
}

.wg-table-wrap {
  height: 100%;
  overflow: auto;
}

.wg-table {
  th {
    color: #8a9bb0;
    font-weight: 500;
    background: rgba(120, 140, 170, 0.1);
  }

  td {
    color: #c8d4e2;
  }

  .wg-alarm {
    color: var(--accent-danger, #ff4757);
    font-weight: 500;
  }
}

.wg-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;

  &-input {
    background: rgba(120, 140, 170, 0.12);
    border: 1px solid rgba(120, 140, 170, 0.3);
    border-radius: 4px;
    color: #c8d4e2;
    padding: 2px 6px;
    width: 100%;
    box-sizing: border-box;
    // overlay 的 .html-slot 是 pointer-events: none 且该属性会继承，
    // 不显式恢复的话搜索框在编辑态与运行端都点不进去
    pointer-events: auto;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .wg-table-wrap {
    flex: 1;
    min-height: 0;
  }
}

.wg-media {
  height: 100%;
  display: flex;

  &-el {
    width: 100%;
    height: 100%;
    border: 0;
    background: #000;
  }

  &-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8a9bb0;
    background: rgba(120, 140, 170, 0.1);
  }
}
</style>
