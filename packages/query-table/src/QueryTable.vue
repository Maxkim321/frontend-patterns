<template>
  <div class="qf-table">
    <el-table
      v-loading="loading"
      ref="tableRef"
      :data="rows"
      :row-key="rowKey"
      :height="height"
      :max-height="maxHeight"
      :show-overflow-tooltip="showTooltip"
      :header-cell-style="{ height: cellHeight }"
      :cell-style="{ height: cellHeight }"
      style="width: 100%"
      @selection-change="onSelectionChange"
      @current-change="(row: Record<string, unknown> | null) => currentRow = row"
    >
      <!-- 多选列：reserve-selection 跨页保留勾选，依赖 row-key -->
      <el-table-column
        v-if="showSelection"
        type="selection"
        :reserve-selection="!!rowKey"
        :selectable="selectable"
        width="44"
        align="center"
      />

      <!-- 单选列：checkbox 样式的单选，@click.prevent.stop 阻断 el-checkbox 自身翻转 -->
      <el-table-column v-if="showRadio" width="50" align="center">
        <template #default="{ row }">
          <el-checkbox
            :model-value="currentRow?.[radioParam] === row[radioParam]"
            @click.prevent.stop="emit('row-radio', row)"
          />
        </template>
      </el-table-column>

      <!-- 序号列：跨页连续，(page-1)*size + $index + 1 -->
      <el-table-column v-if="showIndex" label="序号" type="index" width="70" align="center">
        <template #default="scope">
          {{ (page - 1) * pageSize + scope.$index + 1 }}
        </template>
      </el-table-column>

      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :fixed="col.fixed"
        :align="col.align ?? 'left'"
        :show-overflow-tooltip="col.showTooltip ?? showTooltip"
      >
        <!-- 表头插槽：插槽名 = `${prop}-header` -->
        <template v-if="col.isHeadSlot" #header>
          <slot :name="`${col.prop}-header`" :column="col" />
        </template>

        <!-- 内容插槽：插槽名 = prop，作用域 { row, value }；未开启则兜底渲染 + 空值占位 -->
        <template #default="scope">
          <slot
            v-if="col.isSlot"
            :name="col.prop"
            :row="scope.row"
            :value="scope.row[col.prop]"
          />
          <span v-else>{{ scope.row[col.prop] ?? '—— ——' }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!noPage && total > 0" class="qf-pagination">
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="(p: number) => emit('page-change', { page: p, pageSize })"
        @size-change="(s: number) => emit('page-change', { page: 1, pageSize: s })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { QueryColumn, QueryPage } from './types'

/**
 * 配置驱动 + 插槽外放的表格（源自洛阳智能体 quotation-agent 的 QaTable 提炼）。
 *
 * 设计要点：
 * 1. 插槽外放：列配置 isSlot / isHeadSlot 后，渲染权交给业务方，插槽名 = 列 prop
 *    （表头 = `${prop}-header`）。组件不预判任何业务形态（金额/状态/操作……），
 *    业务方 <template #amount="{ row }"> 自由渲染。
 * 2. 跨页勾选：reserve-selection 依赖 row-key——没有稳定 id 就没有跨页保留。
 * 3. 受控勾选：selectedRows 由父组件持有，watch 回填 toggleRowSelection；
 *    clearSelection 通过 defineExpose 提供给父组件（如删除后清空）。
 * 4. 单选列：el-checkbox 自带点击翻转，外层 @click.prevent.stop 阻断后由组件
 *    单一数据源（currentRow）驱动，避免"点一下翻转两次"。
 * 5. 序号跨页连续：(page-1)*pageSize + $index + 1。
 */
const props = defineProps<{
  columns: QueryColumn[]
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  loading?: boolean
  /** 跨页保留勾选必须提供 row-key */
  rowKey?: string
  showSelection?: boolean
  showRadio?: boolean
  /** 单选行的唯一键字段，默认 'id' */
  radioParam?: string
  /** 多选行禁用函数（返回 false 的行不可勾选） */
  selectable?: (row: Record<string, unknown>) => boolean
  /** 父组件持有的选中行（受控） */
  selectedRows?: Record<string, unknown>[]
  showIndex?: boolean
  showTooltip?: boolean
  cellHeight?: string
  noPage?: boolean
  height?: string
  maxHeight?: string
  pageSizes?: number[]
}>()

const emit = defineEmits<{
  'page-change': [p: QueryPage]
  'selection-change': [rows: Record<string, unknown>[]]
  'row-radio': [row: Record<string, unknown>]
}>()

const tableRef = ref()
const currentRow = ref<Record<string, unknown> | null>(null)

function onSelectionChange(rows: Record<string, unknown>[]) {
  emit('selection-change', rows)
}

// 受控勾选回填：父组件 selectedRows 变化 → 同步到表格
watch(
  () => props.selectedRows,
  (next) => {
    if (!tableRef.value) return
    tableRef.value.clearSelection()
    for (const row of next ?? []) tableRef.value.toggleRowSelection(row, true)
  }
)

/** 供父组件清空勾选（删除/重置后调用） */
function clearSelection() {
  tableRef.value?.clearSelection()
}
defineExpose({ clearSelection })
</script>

<style scoped>
.qf-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 4px;
}
</style>
