export type RowId = string | number

export interface TableRow {
  id: RowId
  [key: string]: unknown
}

export type SortOrder = 'asc' | 'desc'

export interface QueryOptions {
  keyword?: string
  sortField?: string
  sortOrder?: SortOrder
}
