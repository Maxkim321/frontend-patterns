import {
  computed,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
  type Ref,
} from 'vue'
import { useVirtualScroll } from './useVirtualScroll'
import type { QueryOptions, RowId, SortOrder, TableRow } from './types'

export interface BigDataTableOptions {
  rowHeight?: number
  viewportHeight?: number
  buffer?: number
  /** 是否把筛选 / 排序丢进 Web Worker（数据量小直接主线程） */
  useWorker?: boolean
  sortField?: string
}

function matches(row: TableRow, keyword: string): boolean {
  const kw = keyword.toLowerCase()
  return Object.values(row).some((v) => String(v).toLowerCase().includes(kw))
}

function sortRows(rows: TableRow[], field: string, order: SortOrder): TableRow[] {
  return rows.slice().sort((a, b) => {
    const av = a[field]
    const bv = b[field]
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
    return order === 'asc' ? cmp : -cmp
  })
}

/**
 * 大数据表格：虚拟滚动（渲染层）+ 可选的 worker 筛选/排序（计算层）+
 * 基于 rowId 的勾选状态（状态层）。三层解耦，见 README 的决策层。
 */
export function useBigDataTable(source: Ref<TableRow[]>, options: BigDataTableOptions = {}) {
  const {
    rowHeight = 40,
    viewportHeight = 600,
    buffer = 20,
    useWorker = false,
    sortField: initialSortField,
  } = options

  const keyword = ref('')
  const sortField = ref<string | undefined>(initialSortField)
  const sortOrder = ref<SortOrder>('asc')

  // 有序的 id 序列：计算（worker / 主线程）产出的结果顺序
  const resultIds = shallowRef<RowId[]>([])
  const rowById = new Map<RowId, TableRow>()

  // ---- 计算层：worker（失败自动回退主线程） ----
  let worker: Worker | null = null
  let workerSeq = 0
  // 有些环境（内嵌 webview / CSP）worker 静默失败：不报错也不响应，必须靠兜底
  const workerFallback = ref(false)
  const pendingQueries = new Map<number, (ids: RowId[] | null) => void>()

  function markWorkerBroken() {
    workerFallback.value = true
    worker?.terminate()
    worker = null
    // 所有在途查询以 null（失败）收场，让 refresh 走主线程
    for (const resolve of pendingQueries.values()) resolve(null)
    pendingQueries.clear()
  }

  function ensureWorker() {
    if (!useWorker || worker || workerFallback.value) return
    try {
      worker = new Worker(new URL('./table.worker.ts', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as { type: 'result'; seq: number; ids: RowId[] }
        if (msg.type !== 'result') return
        const resolve = pendingQueries.get(msg.seq)
        if (resolve) {
          pendingQueries.delete(msg.seq)
          resolve(msg.ids)
        }
      }
      worker.onerror = () => markWorkerBroken()
      worker.postMessage({ type: 'init', data: source.value })
    } catch {
      markWorkerBroken()
    }
  }

  function queryWorker(options: QueryOptions): Promise<RowId[] | null> {
    ensureWorker()
    if (!worker) return Promise.resolve(null)
    return new Promise((resolve) => {
      const seq = ++workerSeq
      pendingQueries.set(seq, resolve)
      worker!.postMessage({ type: 'query', seq, options })
      // 兜底：worker 静默不响应（webview 环境常见），超时回退主线程
      setTimeout(() => {
        if (pendingQueries.delete(seq)) {
          markWorkerBroken()
          resolve(null)
        }
      }, 3000)
    })
  }

  function indexSource() {
    rowById.clear()
    for (const row of source.value) rowById.set(row.id, row)
  }

  async function refresh() {
    indexSource()
    let ids: RowId[] | null = null
    if (useWorker && !workerFallback.value) {
      ids = await queryWorker({
        keyword: keyword.value,
        sortField: sortField.value,
        sortOrder: sortOrder.value,
      })
    }
    // worker 不可用 / 未启用 / 查询失败：主线程兜底
    if (ids === null) {
      let rows = keyword.value
        ? source.value.filter((r) => matches(r, keyword.value))
        : source.value.slice()
      if (sortField.value) rows = sortRows(rows, sortField.value, sortOrder.value)
      ids = rows.map((r) => r.id)
    }
    resultIds.value = ids
    virtual.scrollToTop()
  }

  // ---- 渲染层：虚拟滚动 ----
  const total = computed(() => resultIds.value.length)
  const virtual = useVirtualScroll({ rowHeight, viewportHeight, buffer, total })

  const visibleRows = computed<TableRow[]>(() => {
    const ids = resultIds.value.slice(virtual.startIndex.value, virtual.endIndex.value)
    return ids
      .map((id) => rowById.get(id))
      .filter((r): r is TableRow => r !== undefined)
  })

  // ---- 状态层：勾选，绑 rowId 不绑下标 ----
  const selectedSet = ref(new Set<RowId>())
  const isAllSelected = ref(false)
  const excludedIds = ref(new Set<RowId>())

  const selectedCount = computed(() =>
    isAllSelected.value ? total.value - excludedIds.value.size : selectedSet.value.size
  )

  function isSelected(id: RowId): boolean {
    return isAllSelected.value ? !excludedIds.value.has(id) : selectedSet.value.has(id)
  }

  function toggleRow(id: RowId) {
    if (isAllSelected.value) {
      const next = new Set(excludedIds.value)
      next.has(id) ? next.delete(id) : next.add(id)
      excludedIds.value = next
    } else {
      const next = new Set(selectedSet.value)
      next.has(id) ? next.delete(id) : next.add(id)
      selectedSet.value = next
    }
  }

  function toggleAll() {
    isAllSelected.value = !isAllSelected.value
    excludedIds.value = new Set()
    selectedSet.value = new Set()
  }

  function sortBy(field: string) {
    if (sortField.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortOrder.value = 'asc'
    }
    refresh()
  }

  watch(
    () => source.value,
    () => {
      if (useWorker && worker) {
        worker.postMessage({ type: 'init', data: source.value })
      }
      refresh()
    }
  )

  onBeforeUnmount(() => worker?.terminate())

  refresh()

  return {
    keyword,
    sortField,
    sortOrder,
    sortBy,
    total,
    visibleRows,
    ...virtual,
    workerFallback,
    selectedCount,
    isSelected,
    toggleRow,
    toggleAll,
    isAllSelected,
  }
}
