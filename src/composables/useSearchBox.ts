/**
 * 搜索框的展开/收起状态机：给定外部受控的 query / open ref，管 visible / expand / collapse。
 *
 * 两个已有搜索盒（首页 ProjectSearchBox、编辑器 LibrarySearchBox）交互差异很大——
 * 一个有窄窗口断点、失焦空内容才收起；另一个收起即清空、面板内 mousedown 例外、
 * placeholder 跑马灯——但「有查询时强制展开」「展开/收起动作」这两条是共用的。
 *
 * 只抽这层状态机，不强行统一交互：特殊逻辑（断点、失焦判定、跑马灯）留在各组件里。
 * 第三个搜索盒出现时直接接这个 composable，不要再复制 visible/expand/collapse 三件套。
 */
import { computed, type Ref } from 'vue'

export interface SearchBoxOptions {
  /** 收起时是否清空 query（编辑器组件库搜索是 true：收起即清除过滤；首页搜索是 false） */
  clearOnCollapse?: boolean
}

export function useSearchBox(
  query: Ref<string>,
  open: Ref<boolean>,
  opts: SearchBoxOptions = {},
) {
  /** 有查询时强制展开：筛了却看不见筛选条件，只会让人以为数据自己变少了 */
  const visible = computed(() => open.value || query.value.trim().length > 0)

  function expand() {
    open.value = true
  }

  function collapse() {
    open.value = false
    if (opts.clearOnCollapse) query.value = ''
  }

  return { visible, expand, collapse }
}
