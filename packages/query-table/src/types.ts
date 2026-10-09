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

/**
 * 表格列配置。
 * isSlot / isHeadSlot 是本封装的核心机制：开启后内容/表头渲染权交给业务方，
 * 插槽名 = 列的 prop（内容）/ `${prop}-header`（表头），业务方模板里
 * <template #amount="{ row }"> 即可完全自定义该列渲染。
 */
export interface QueryColumn {
  prop: string
  label: string
  width?: number
  minWidth?: number
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  /** 溢出时 tooltip 展示全文 */
  showTooltip?: boolean
  /** 开启内容插槽：插槽名为 prop，作用域参数 { row, value } */
  isSlot?: boolean
  /** 开启表头插槽：插槽名为 `${prop}-header` */
  isHeadSlot?: boolean
}

export interface QueryPage {
  page: number
  pageSize: number
}

/** 搜索参数（字段 name → 值） */
export type SearchParams = Record<string, unknown>
