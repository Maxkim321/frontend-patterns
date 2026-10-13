/** 动态选项：静态数组，或按当前已填数据返回（Agent/规则驱动的选项集合） */
export type WizardOptions =
  | { label: string; value: string | number }[]
  | ((data: Record<string, unknown>) => { label: string; value: string | number }[])

/** 条件显示依赖：field/includes 精确匹配，或 when 函数自由判断，全部满足才渲染 */
export interface FieldDep {
  /** 依赖字段名 */
  field?: string
  /** 精确匹配集合；省略表示"该字段只要有值就显示" */
  includes?: (string | number)[]
  /** 自由判断（如数量阈值）：返回 false 则隐藏 */
  when?: (data: Record<string, unknown>) => boolean
}

/** 向导字段：schema 驱动的核心，一个字段对象 = 一个控件（与 query-table 的 SearchField 同思路） */
export interface WizardField {
  /** 字段名：既是表单绑定的 key，也是提交给后端的参数名 */
  name: string
  label: string
  type: 'input' | 'textarea' | 'select' | 'number'
  options?: WizardOptions
  placeholder?: string
  /** 必填：next 时校验当前步「可见且 required」的字段——被条件隐藏的字段不参与校验 */
  required?: boolean
  /** 业务校验：返回 true 放行 / 返回字符串拒绝（显示在该字段下方） */
  validate?: (value: unknown, allData: Record<string, unknown>) => true | string
  /** number 类型的单位后缀（如 元、件） */
  suffix?: string
  /**
   * 条件显示（Agent 驱动的前端形态）：deps 条件不满足时本字段隐藏，
   * 且**不参与校验、不进提交数据**——字段集合由前面的选择动态决定
   */
  deps?: FieldDep
}

/** 向导步骤：一组字段 + 步骤说明 */
export interface WizardStep {
  title: string
  /** 步骤引导语（显示在字段上方） */
  description?: string
  fields: WizardField[]
}

/** 步骤校验结果：通过 / 字段级错误（name → 错误信息） */
export interface StepValidation {
  ok: boolean
  errors: Record<string, string>
}
