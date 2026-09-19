import { computed, ref, type Ref } from 'vue'

export interface VirtualScrollOptions {
  rowHeight: number
  viewportHeight: number
  /** 可视区上下额外渲染的行数 */
  buffer?: number
  /** 当前总行数 */
  total: Ref<number>
}

/**
 * 纯虚拟滚动：只渲染可视区 [start, end]，其余用撑高 + transform 偏移模拟滚动条。
 * 注意：这只解决 DOM 渲染层，不解决计算阻塞（计算丢 worker，见 useBigDataTable）。
 */
export function useVirtualScroll(options: VirtualScrollOptions) {
  const { rowHeight, viewportHeight } = options
  const buffer = options.buffer ?? 20

  const scrollTop = ref(0)

  const totalHeight = computed(() => options.total.value * rowHeight)

  const startIndex = computed(() =>
    Math.max(0, Math.floor(scrollTop.value / rowHeight) - buffer)
  )

  const endIndex = computed(() =>
    Math.min(
      options.total.value,
      Math.ceil((scrollTop.value + viewportHeight) / rowHeight) + buffer
    )
  )

  // 可视区顶部在整张表里的偏移，用于把渲染的行摆到正确位置
  const offsetY = computed(() => startIndex.value * rowHeight)

  function onScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop
  }

  function scrollToTop() {
    scrollTop.value = 0
  }

  return { scrollTop, totalHeight, startIndex, endIndex, offsetY, onScroll, scrollToTop }
}
