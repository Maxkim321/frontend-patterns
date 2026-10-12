/** 向导字段：schema 驱动的核心，一个字段对象 = 一个控件（与 query-table 的 SearchField 同思路） */
export interface WizardField {
  /** 字段名：既是表单绑定的 key，也是提交给后端的参数名 */
  name: string
  label: string
  type: 'input' | 'textarea' | 'select' | 'number'
  options?: { label: string; value: string | number }[]
  placeholder?: string
  /** 必填：next 时校验当前步的所有 required 字段 */
  required?: boolean
  /** 业务校验：返回 true 放行 / 返回字符串拒绝（显示在该字段下方） */
  validate?: (value: unknown, allData: Record<string, unknown>) => true | string
  /** number 类型的单位后缀（如 元、件） */
  suffix?: string
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
