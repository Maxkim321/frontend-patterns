<template>
  <el-form inline class="qf-search" :disabled="disabled">
    <el-form-item
      v-for="f in fields"
      :key="f.name"
      :label="f.label"
      :label-width="f.labelWidth"
    >
      <el-select
        v-if="f.type === 'select'"
        v-model="values[f.name]"
        :multiple="!!f.multiple"
        :collapse-tags="!!f.multiple"
        :collapse-tags-tooltip="!!f.multiple"
        :clearable="!!f.clearable"
        :placeholder="f.placeholder"
        :style="{ width: (f.width ?? 160) + 'px' }"
      >
        <el-option
          v-for="o in f.options"
          :key="o.value"
          :label="o.label"
          :value="o.value"
        />
      </el-select>

      <el-date-picker
        v-else-if="f.type === 'date'"
        v-model="values[f.name]"
        type="date"
        value-format="YYYY-MM-DD"
        :placeholder="f.placeholder"
        :style="{ width: (f.width ?? 160) + 'px' }"
      />

      <el-date-picker
        v-else-if="f.type === 'daterange'"
        v-model="values[f.name]"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="~"
        :start-placeholder="f.placeholder ?? '开始日期'"
        :end-placeholder="f.placeholder ?? '结束日期'"
        :style="{ width: (f.width ?? 240) + 'px' }"
      />

      <div v-else-if="f.type === 'number-range'" class="qf-range">
        <el-input-number
          v-model="(values[f.name] as { startValue: number; endValue: number }).startValue"
          :controls="false"
          :placeholder="f.placeholder ?? '最小'"
          :style="{ width: (f.width ?? 76) + 'px' }"
        />
        <span class="qf-range-sep">~</span>
        <el-input-number
          v-model="(values[f.name] as { startValue: number; endValue: number }).endValue"
          :controls="false"
          :placeholder="f.placeholder ?? '最大'"
          :style="{ width: (f.width ?? 76) + 'px' }"
        />
      </div>

      <el-switch v-else-if="f.type === 'switch'" v-model="values[f.name]" />

      <el-input
        v-else
        v-model="values[f.name]"
        :placeholder="f.placeholder"
        :style="{ width: (f.width ?? 160) + 'px' }"
        @keyup.enter="emitAction('search')"
      />
    </el-form-item>

    <el-form-item v-for="b in buttons" :key="b.name">
      <el-button :type="b.type" :plain="b.plain" @click="emitAction(b.name)">
        {{ b.label }}
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { cloneDeep } from 'lodash-es'
import type { SearchBtn, SearchField, SearchParams } from './types'

/**
 * schema 驱动的查询表单。设计要点（源自真实项目 SearchTable 的提炼）：
 * 1. 表单值是 props.initial 的【深拷贝】，重置=回拷贝初始值——绝不让
 *    「清空输入」直接改到父组件/上一轮查询的状态。
 * 2. 父组件后续对 initial 的变更是【合并】而不是覆盖（父组件常在查询后
 *    回填固定参数，如状态联动），所以用 watch 展开 merge。
 * 3. 内置 'search'（回车/按钮）与 'reset' 两个动作，其他 name 原样 emit
 *    给业务方（如导出、新增）。
 */
const props = defineProps<{
  fields: SearchField[]
  /** 初始值/默认值；reset 回到这里，父组件后写的参数会 merge 进来 */
  initial?: SearchParams
  buttons?: SearchBtn[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  /** name 为 'search'/'reset' 或按钮自定义动作；params 是当前全部表单值 */
  action: [name: string, params: SearchParams]
}>()

const values = reactive<SearchParams>({})

/** number-range 字段的结构归一化：v-model 要绑对象属性，必须先保证值是 {startValue, endValue} */
function normalizeRanges() {
  for (const f of props.fields) {
    if (f.type === 'number-range') {
      const v = values[f.name]
      if (v === null || typeof v !== 'object') {
        values[f.name] = { startValue: undefined, endValue: undefined }
      }
    }
  }
}

/** 重置路径：整体替换回 initial（清掉用户输入），再归一化 */
function replaceFromInitial() {
  for (const k of Object.keys(values)) delete values[k]
  Object.assign(values, cloneDeep(props.initial ?? {}))
  normalizeRanges()
}

/** initial 变更路径：merge（保留用户未涉及字段），再归一化 */
watch(
  () => props.initial,
  () => {
    Object.assign(values, cloneDeep(props.initial ?? {}))
    normalizeRanges()
  }
)

replaceFromInitial()

function emitAction(name: string) {
  if (name === 'reset') {
    replaceFromInitial()
  }
  emit('action', name, cloneDeep(values))
}

function reset() {
  replaceFromInitial()
}

defineExpose({ reset, values })
</script>

<style scoped>
.qf-search {
  row-gap: 4px;
}

.qf-range {
  display: inline-flex;
  align-items: center;
}

.qf-range-sep {
  margin: 0 6px;
  color: #909399;
}
</style>
