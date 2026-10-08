/** 查询表单字段配置（schema 驱动的核心：一个字段对象 = 一个控件） */
export interface SearchField {
  /** 字段名：既是表单绑定的 key，也是提交给后端的参数名 */
  name: string
  label: string
  /** 控件类型：input 输入框 / select 下拉 / date 单日期 / daterange 日期范围 / switch 开关 / number-range 数字区间 */
  type: 'input' | 'select' | 'date' | 'daterange' | 'switch' | 'number-range'
  options?: { label: string; value: string | number }[]
  placeholder?: string
  /** select 是否多选 */
  multiple?: boolean
  /** select 是否可清空 */
  clearable?: boolean
  labelWidth?: string
  /** 控件宽度 px，默认 160 */
  width?: number
}

/** 查询表单按钮配置 */
export interface SearchBtn {
  /** 按钮动作名：'search' | 'reset' 或业务自定义（如 'export'），原样透传给业务方 */
  name: string
  label: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  plain?: boolean
}

/** 表格列配置 */
export interface QueryColumn {
  prop: string
  label: string
  minWidth?: number
  fixed?: 'left' | 'right'
  /** 溢出时 tooltip 展示全文 */
  showTooltip?: boolean
  /**
   * 列类型：'text'（默认，文本 + 空值兜底）| 'btn'（操作列，渲染 row.btns 里声明的按钮）
   */
  type?: 'text' | 'btn'
  /** text 列格式化：(row) => string */
  formatter?: (row: Record<string, unknown>) => string
  /** btn 列可渲染的按钮集合，实际显隐由 row.btns 数组决定 */
  btns?: QueryRowBtn[]
}

/** 行操作按钮定义（配置在列上，显隐由行数据控制） */
export interface QueryRowBtn {
  /** 动作名，点击后 emit('row-action', { action, row }) */
  name: string
  label: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  plain?: boolean
}

export interface QueryPage {
  page: number
  pageSize: number
}

/** 搜索参数（字段 name → 值） */
export type SearchParams = Record<string, unknown>
