import type { QueryOptions, RowId, TableRow } from './types'

type InMessage =
  | { type: 'init'; data: TableRow[] }
  | { type: 'query'; seq: number; options: QueryOptions }

type OutMessage = { type: 'result'; seq: number; ids: RowId[]; total: number }

// worker 全局作用域（避免与 DOM 的 self.postMessage 类型冲突）
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<InMessage>) => void) | null
  postMessage: (msg: OutMessage) => void
}

let source: TableRow[] = []

function matches(row: TableRow, keyword: string): boolean {
  const kw = keyword.toLowerCase()
  return Object.values(row).some((v) => String(v).toLowerCase().includes(kw))
}

scope.onmessage = (e) => {
  const msg = e.data

  if (msg.type === 'init') {
    source = msg.data
    return
  }

  if (msg.type === 'query') {
    const { keyword = '', sortField, sortOrder = 'asc' } = msg.options
    let rows = keyword ? source.filter((r) => matches(r, keyword)) : source.slice()

    if (sortField) {
      rows = rows.slice().sort((a, b) => {
        const av = a[sortField]
        const bv = b[sortField]
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv))
        return sortOrder === 'asc' ? cmp : -cmp
      })
    }

    // 关键：只回传 ID，不回传完整对象，减少结构化克隆开销
    scope.postMessage({
      type: 'result',
      seq: msg.seq,
      ids: rows.map((r) => r.id),
      total: rows.length,
    })
  }
}
