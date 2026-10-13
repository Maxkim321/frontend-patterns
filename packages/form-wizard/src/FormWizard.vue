<template>
  <div class="fw">
    <!-- 步骤条：已完成 / 当前 / 未到，可点击回退 -->
    <div class="fw-steps">
      <div
        v-for="(step, i) in stepList"
        :key="step.title"
        class="fw-step"
        :class="{ 'fw-step--done': i < current, 'fw-step--active': i === current, 'fw-step--clickable': i <= current }"
        @click="goTo(i)"
      >
        <span class="fw-step__dot">{{ i < current ? '✓' : i + 1 }}</span>
        <span class="fw-step__title">{{ step.title }}</span>
        <span v-if="i < stepList.length - 1" class="fw-step__bar" />
      </div>
    </div>
    <div class="fw-progress"><div class="fw-progress__bar" :style="{ width: `${progress}%` }" /></div>

    <!-- 结果态：slot 外放（报价明细 + 生成式说明由业务方渲染），data 为剔除隐藏字段后的提交数据 -->
    <template v-if="status === 'done'">
      <slot name="result" :data="payload()" />
      <div class="fw-result-ops">
        <el-button @click="reset()">再填一单</el-button>
      </div>
    </template>

    <!-- 表单态 -->
    <template v-else>
      <div class="fw-body">
        <!-- 每步可插槽自定义渲染（插槽名 step-<index>），未提供则按 schema 默认渲染 -->
        <slot
          :name="`step-${current}`"
          :data="data"
          :errors="errors"
          :step="stepList[current]"
        >
          <p v-if="stepList[current]?.description" class="fw-desc">{{ stepList[current].description }}</p>
          <div v-for="field in visibleFields(current)" :key="field.name" class="fw-field">
            <label class="fw-label">
              {{ field.label }}
              <span v-if="field.required" class="fw-required">*</span>
            </label>

            <el-select
              v-if="field.type === 'select'"
              v-model="data[field.name]"
              :placeholder="field.placeholder"
              class="fw-control"
            >
              <el-option
                v-for="o in resolveOptions(field)"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>

            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="data[field.name] as number"
              :controls="false"
              :placeholder="field.placeholder"
              class="fw-control"
            />
            <span v-if="field.type === 'number' && field.suffix" class="fw-suffix">{{ field.suffix }}</span>

            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="data[field.name] as string"
              type="textarea"
              :rows="2"
              :placeholder="field.placeholder"
              class="fw-control"
            />

            <el-input
              v-else
              v-model="data[field.name] as string"
              :placeholder="field.placeholder"
              class="fw-control"
            />

            <div v-if="errors[field.name]" class="fw-error">{{ errors[field.name] }}</div>
          </div>
        </slot>
      </div>

      <div v-if="submitError" class="fw-submit-error">{{ submitError }}</div>

      <div class="fw-ops">
        <el-button v-if="!isFirst" :disabled="status === 'submitting'" @click="back()">上一步</el-button>
        <el-button v-if="!isLast" type="primary" @click="next()">下一步</el-button>
        <el-button v-else type="primary" :loading="status === 'submitting'" @click="emitSubmit()">
          {{ status === 'submitting' ? 'Agent 计算中…' : '提交报价' }}
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useWizard } from './useWizard'
import type { WizardField, WizardStep } from './types'

/**
 * 分步表单向导封装组件（智能报价交互层的通用形态）：
 * 步骤条 + schema 渲染当前步 + 分步校验 + 提交状态机。
 * 业务方传 steps 配置与 submit 回调；结果区用 #result 插槽外放
 * （报价明细、生成式说明都是业务渲染，组件只管向导本身）。
 * 每步也可用 #step-<index> 插槽完全接管渲染。
 */
const props = defineProps<{
  steps: WizardStep[]
  /** 提交回调：接真实 Agent 接口；resolve 即 done，reject 即 error */
  submit: (data: Record<string, unknown>) => Promise<unknown>
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
}>()

const wizard = useWizard(toRef(props, 'steps'))
const {
  current,
  data,
  errors,
  status,
  submitError,
  stepList,
  isFirst,
  isLast,
  progress,
  visibleFields,
  payload,
  next,
  back,
  goTo,
} = wizard

/** 动态选项：options 可以是函数（按当前已填数据返回选项集合，Agent/规则驱动） */
function resolveOptions(field: { options?: WizardField['options'] }) {
  return typeof field.options === 'function' ? field.options(data) : (field.options ?? [])
}

function emitSubmit() {
  void wizard.submit(async () => {
    const finalData = payload() // 剔除被条件隐藏字段的残留值
    emit('submit', finalData)
    await props.submit(finalData)
  })
}

defineExpose({
  reset: wizard.reset,
  editFrom: wizard.editFrom,
  validateStep: wizard.validateStep,
  /** 预填（LLM 抽取结果）并跳到第一个还有必填缺口的步骤，返回该步索引。
   *  注意用 editFrom（无方向守卫）——goTo 只允许向后回退，向前跳会被它静默忽略 */
  prefill(values: Record<string, unknown>) {
    wizard.fill(values)
    for (let i = 0; i < stepList.value.length; i++) {
      const missing = wizard
        .visibleFields(i)
        .some((f) => f.required && [undefined, null, ''].includes(data[f.name] as never))
      if (missing) {
        wizard.editFrom(i)
        return i
      }
    }
    wizard.editFrom(stepList.value.length - 1)
    return stepList.value.length - 1
  },
})
</script>

<style scoped>
.fw {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fw-steps {
  display: flex;
  align-items: center;
}

.fw-step {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9ca3af;
  font-size: 13px;
}
.fw-step--done,
.fw-step--active {
  color: #165dff;
}
.fw-step--active {
  font-weight: 600;
}
.fw-step--clickable {
  cursor: pointer;
}
.fw-step__dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex: none;
}
.fw-step--active .fw-step__dot,
.fw-step--done .fw-step__dot {
  background: #165dff;
  border-color: #165dff;
  color: #fff;
}
.fw-step__bar {
  width: 48px;
  height: 1.5px;
  background: #d0d7de;
  margin: 0 8px;
}
.fw-step--done .fw-step__bar {
  background: #165dff;
}

.fw-progress {
  height: 3px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}
.fw-progress__bar {
  height: 100%;
  background: #165dff;
  transition: width 0.3s;
}

.fw-body {
  min-height: 180px;
}
.fw-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: #6b7280;
}
.fw-field {
  margin-bottom: 12px;
}
.fw-label {
  display: block;
  font-size: 13px;
  color: #374151;
  margin-bottom: 5px;
}
.fw-required {
  color: #cf222e;
}
.fw-control {
  width: 100%;
  max-width: 420px;
}
.fw-suffix {
  font-size: 12px;
  color: #6b7280;
  margin-left: 6px;
}
.fw-error {
  margin-top: 4px;
  font-size: 12px;
  color: #cf222e;
}
.fw-submit-error {
  font-size: 12px;
  color: #cf222e;
  padding: 8px 12px;
  background: #ffebe9;
  border-radius: 6px;
}
.fw-ops {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.fw-result-ops {
  display: flex;
  justify-content: flex-end;
}
</style>
