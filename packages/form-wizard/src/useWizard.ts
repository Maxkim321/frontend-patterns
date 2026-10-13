import { computed, reactive, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { FieldDep, StepValidation, WizardStep } from './types.js'

/**
 * 分步向导核心逻辑（框架无关，Vue 组合式）。
 *
 * 职责：当前步索引、数据聚合、分步校验、提交状态机（idle → submitting → done/error）。
 * 设计要点：
 * 1. 校验边界——只在「下一步/提交」时校验**当前步**的字段，绝不整表校验：
 *    用户填到第 2 步时不该被第 3 步的必填项拦住。
 * 2. 数据一个对象贯穿全程（steps 间共享同一 data），最后一次性提交——
 *    每步不单独提交，避免中间态脏数据进后端。
 * 3. 提交是注入的异步函数（业务方接真实 Agent 接口），状态机防止重复提交。
 */
export function useWizard(steps: MaybeRefOrGetter<WizardStep[]>) {
  // toValue 统一解包 Ref / getter / 普通数组——漏解包会让 v-for 拿到 Ref 本身，组件挂载失败
  const stepList = computed(() => toValue(steps))
  const current = ref(0)
  const data = reactive<Record<string, unknown>>({})
  const errors = reactive<Record<string, string>>({})
  const status = ref<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const submitError = ref('')

  const isFirst = computed(() => current.value === 0)
  const isLast = computed(() => current.value === stepList.value.length - 1)
  const progress = computed(() =>
    Math.round(((current.value + 1) / stepList.value.length) * 100)
  )

  /** 校验指定步（默认当前步）：required + 自定义 validate，只针对**可见字段** */
  function validateStep(index: number): StepValidation {
    const errs: Record<string, string> = {}
    for (const field of visibleFields(index)) {
      const value = data[field.name]
      const empty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      if (field.required && empty) {
        errs[field.name] = `${field.label}不能为空`
        continue
      }
      if (!empty && field.validate) {
        const r = field.validate(value, data)
        if (r !== true) errs[field.name] = r
      }
    }
    return { ok: Object.keys(errs).length === 0, errors: errs }
  }

  /** 条件字段可见性：deps（field/includes/when）全部满足才渲染；隐藏字段的残留值在提交前剔除 */
  function isFieldVisible(field: { deps?: FieldDep }): boolean {
    const dep = field.deps
    if (!dep) return true
    if (dep.when && !dep.when(data)) return false
    if (dep.field) {
      const depValue = data[dep.field]
      const hasValue = depValue !== undefined && depValue !== '' && depValue !== false
      if (!hasValue) return false
      if (dep.includes && !dep.includes.includes(depValue as never)) return false
    }
    return true
  }

  /** 当前数据下某一步实际可见的字段（模板与校验共用同一份） */
  function visibleFields(index: number) {
    return (stepList.value[index]?.fields ?? []).filter((f) => isFieldVisible(f))
  }

  /** 提交数据：剔除被条件隐藏的字段残留值（改过品类后旧参数不进后端） */
  function payload(): Record<string, unknown> {
    const visibleNames = new Set(
      stepList.value.flatMap((_, i) => visibleFields(i).map((f) => f.name))
    )
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (visibleNames.has(k)) out[k] = v
    }
    return out
  }

  /** 下一步：先清旧错误，校验当前步，通过则前进 */
  function next(): boolean {
    Object.keys(errors).forEach((k) => delete errors[k])
    const { ok, errors: errs } = validateStep(current.value)
    if (!ok) {
      Object.assign(errors, errs)
      return false
    }
    if (!isLast.value) current.value++
    return true
  }

  function back() {
    if (!isFirst.value) current.value--
  }

  function goTo(index: number) {
    // 只允许回到已走过的步（向前必须走 next 校验）
    if (index <= current.value) current.value = index
  }

  /** 提交：状态机防重复点击；成功后 data 冻结为结果 */
  async function submit(submitFn: (data: Record<string, unknown>) => Promise<unknown>): Promise<boolean> {
    if (status.value === 'submitting') return false
    if (!next()) return false // 最后一步的 next = 校验最后一步
    status.value = 'submitting'
    submitError.value = ''
    try {
      await submitFn({ ...data })
      status.value = 'done'
      return true
    } catch (e) {
      status.value = 'error'
      submitError.value = (e as Error).message || '提交失败，请重试'
      return false
    }
  }

  /** 重置：清空数据、错误、状态，回到第一步 */
  function reset() {
    Object.keys(data).forEach((k) => delete data[k])
    Object.keys(errors).forEach((k) => delete errors[k])
    current.value = 0
    status.value = 'idle'
    submitError.value = ''
  }

  /** 从结果页返回编辑：保留数据，回到指定步，状态回 idle */
  function editFrom(index: number) {
    status.value = 'idle'
    current.value = index
  }

  /** 批量预填（LLM 信息抽取 / 默认值注入）：合并进 data，不清空已有输入 */
  function fill(values: Record<string, unknown>) {
    Object.assign(data, values)
  }

  return {
    stepList,
    current,
    data,
    errors,
    status,
    submitError,
    isFirst,
    isLast,
    progress,
    validateStep,
    visibleFields,
    payload,
    next,
    back,
    goTo,
    submit,
    reset,
    editFrom,
    fill,
  }
}
